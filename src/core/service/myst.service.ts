import {Injectable} from '@nestjs/common';
import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {VpnProviderModel, VpnProviderStatusEnum} from '@src-core/model/vpn-provider.model';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';
import {IRunnerServiceInterface} from '@src-core/interface/i-runner-service.interface';
import {ISystemInfoRepositoryInterface} from '@src-core/interface/i-system-info-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {ExistException} from '@src-core/exception/exist.exception';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {NotFoundMystIdentityException} from '@src-core/exception/not-found-myst-identity.exception';
import {
  RunnerDependsOnStatusEnum,
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IProxyApiRepositoryInterface} from '@src-core/interface/i-proxy-api-repository.interface';
import {VpnDisconnectException} from '@src-core/exception/vpn-disconnect.exception';

@Injectable()
export class MystService implements IProviderServiceInterface {
  constructor(
    private readonly _proxyApiRepository: IProxyApiRepositoryInterface,
    private readonly _runnerDockerService: IRunnerServiceInterface,
    private readonly _systemInfoRepository: ISystemInfoRepositoryInterface,
    private readonly _mystIdentityRepository: IGenericRepositoryInterface<MystIdentityModel>,
    private readonly _fakeIdentifier: IIdentifier,
  ) {
  }

  async findAll(filter?: FilterModel<VpnProviderModel>): Promise<AsyncReturn<Error, Array<VpnProviderModel>>> {
    return this._proxyApiRepository.getAll(filter);
  }

  async up(id: string): Promise<AsyncReturn<Error, VpnProviderModel>> {
    const [ipError, ipData] = await this._systemInfoRepository.getOutgoingIpAddress();
    if (ipError) {
      return [ipError];
    }

    const [proxyInfoError, proxyInfoData] = await this._proxyApiRepository.getById(id);
    if (proxyInfoError) {
      return [proxyInfoError];
    }
    if (!proxyInfoData) {
      return [new NotFoundException()];
    }
    if (proxyInfoData.isRegister) {
      return [new ExistException()];
    }

    const mystIdentityFilter = new FilterModel<MystIdentityModel>();
    mystIdentityFilter.addCondition({$opr: 'eq', isUse: false});
    const [mystIdentityError, mystIdentityList] = await this._mystIdentityRepository.getAll(mystIdentityFilter);
    if (mystIdentityError) {
      return [mystIdentityError];
    }
    if (mystIdentityList.length === 0) {
      return [new NotFoundMystIdentityException()];
    }

    return this._createRunner(id, mystIdentityList[0], proxyInfoData, ipData);
  }

  async down(id: string): Promise<AsyncReturn<Error, null>> {
    const runnerFilter = new FilterModel<RunnerModel<VpnProviderModel>>();
    runnerFilter.addCondition({$opr: 'eq', label: {id}});
    const [runnerError, runnerList] = await this._runnerDockerService.findAll(runnerFilter);
    if (runnerError) {
      return [runnerError];
    }

    if (runnerList.length === 0) {
      return [new NotFoundException()];
    }

    const mystRunner = runnerList.find((v) => v.service === RunnerServiceEnum.MYST);

    if (mystRunner) {
      const [error] = await this._runnerDockerService.remove(mystRunner.id);
      if (error) {
        return [new VpnDisconnectException()];
      }
    }

    const tasks = [];
    for (const runner of runnerList) {
      if (runner.service === RunnerServiceEnum.MYST) {
        continue;
      }

      tasks.push(this._runnerDockerService.remove(runner.id));
    }

    await Promise.all(tasks);

    return [null];
  }

  async _createRunner(
    providerId: string,
    mystIdentityModel: MystIdentityModel,
    proxyModel: VpnProviderModel,
    outgoingIp: string,
  ): Promise<AsyncReturn<Error, VpnProviderModel>> {
    const runnerFilter = new FilterModel<RunnerModel<VpnProviderModel>>();
    runnerFilter.addCondition({
      $opr: 'eq',
      label: {
        $namespace: VpnProviderModel.name,
        userIdentity: mystIdentityModel.identity,
      },
    });
    const [runnerError, runnerList] = await this._runnerDockerService.findAll(runnerFilter);
    if (runnerError) {
      return [runnerError];
    }

    if (runnerList.length === 3) {
      return [new ExistException()];
    }

    const proxyCreateModel = proxyModel.clone();
    proxyCreateModel.userIdentity = mystIdentityModel.identity;
    proxyCreateModel.serverOutgoingIp = outgoingIp;
    proxyCreateModel.providerStatus = VpnProviderStatusEnum.PENDING;

    const hasMystCreated = runnerList.findIndex((v) => v.service === RunnerServiceEnum.MYST) !== -1;
    const hasMystConnectCreated = runnerList.findIndex((v) => v.service === RunnerServiceEnum.MYST_CONNECT) !== -1;
    const hasEnvoyCreated = runnerList.findIndex((v) => v.service === RunnerServiceEnum.ENVOY) !== -1;

    const proxyResultModel = proxyCreateModel.clone();

    if (!hasMystCreated) {
      const [createMystError, createMystData] = await this._createMystRunner(mystIdentityModel, proxyCreateModel);
      if (createMystError) {
        return [createMystError];
      }

      proxyResultModel.runner = createMystData;
    }
    if (!hasMystConnectCreated) {
      const [createMystConnectError] = await this._createMystConnectRunner(mystIdentityModel, proxyCreateModel);
      if (createMystConnectError) {
        return [createMystConnectError];
      }
    }
    if (!hasEnvoyCreated) {
      const [createMystConnectError] = await this._createEnvoyRunner(mystIdentityModel, proxyCreateModel);
      if (createMystConnectError) {
        return [createMystConnectError];
      }
    }

    proxyResultModel.isRegister = true;
    proxyResultModel.isEnable = true;

    return [null, proxyResultModel];
  }

  async _createMystRunner(mystIdentityModel: MystIdentityModel, proxyCreateModel: VpnProviderModel): Promise<AsyncReturn<Error, RunnerModel>> {
    const mystRunnerModel = new RunnerModel<VpnProviderModel>({
      id: this._fakeIdentifier.generateId(),
      serial: '0000000000000000000000000000000000000000000000000000000000000000',
      name: `${RunnerServiceEnum.MYST}-${mystIdentityModel.identity}`,
      service: RunnerServiceEnum.MYST,
      exec: RunnerExecEnum.DOCKER,
      socketType: RunnerSocketTypeEnum.HTTP,
      label: {
        $namespace: VpnProviderModel.name,
        id: proxyCreateModel.id,
        userIdentity: mystIdentityModel.identity,
        providerIdentity: proxyCreateModel.providerIdentity,
        serverOutgoingIp: proxyCreateModel.serverOutgoingIp,
      },
      status: RunnerStatusEnum.CREATING,
      insertDate: new Date(),
    });

    const [createMystError, createMystData] = await this._runnerDockerService.create(mystRunnerModel);
    if (createMystError) {
      return [createMystError];
    }

    return [null, createMystData];
  }

  async _createMystConnectRunner(mystIdentityModel: MystIdentityModel, proxyCreateModel: VpnProviderModel): Promise<AsyncReturn<Error, null>> {
    const mystConnectRunnerModel = new RunnerModel<VpnProviderModel>({
      id: this._fakeIdentifier.generateId(),
      serial: '0000000000000000000000000000000000000000000000000000000000000000',
      name: `${RunnerServiceEnum.MYST_CONNECT}-${mystIdentityModel.identity}`,
      service: RunnerServiceEnum.MYST_CONNECT,
      exec: RunnerExecEnum.DOCKER,
      socketType: RunnerSocketTypeEnum.NONE,
      label: {
        $namespace: VpnProviderModel.name,
        id: proxyCreateModel.id,
        userIdentity: mystIdentityModel.identity,
        providerIdentity: proxyCreateModel.providerIdentity,
      },
      dependsOn: {
        [`${RunnerServiceEnum.MYST}-${mystIdentityModel.identity}`]: RunnerDependsOnStatusEnum.STARTED,
      },
      status: RunnerStatusEnum.CREATING,
      insertDate: new Date(),
    });

    const [createMystError] = await this._runnerDockerService.create(mystConnectRunnerModel);
    if (createMystError) {
      return [createMystError];
    }

    return [null, null];
  }

  async _createEnvoyRunner(mystIdentityModel: MystIdentityModel, proxyCreateModel: VpnProviderModel): Promise<AsyncReturn<Error, null>> {
    const mystConnectRunnerModel = new RunnerModel({
      id: this._fakeIdentifier.generateId(),
      serial: '0000000000000000000000000000000000000000000000000000000000000000',
      name: `${RunnerServiceEnum.ENVOY}-${mystIdentityModel.identity}`,
      service: RunnerServiceEnum.ENVOY,
      exec: RunnerExecEnum.DOCKER,
      socketType: RunnerSocketTypeEnum.NONE,
      label: {
        $namespace: VpnProviderModel.name,
        id: proxyCreateModel.id,
        userIdentity: mystIdentityModel.identity,
        providerIdentity: proxyCreateModel.providerIdentity,
      },
      dependsOn: {
        [`${RunnerServiceEnum.MYST}-${mystIdentityModel.identity}`]: RunnerDependsOnStatusEnum.HEALTHY,
      },
      status: RunnerStatusEnum.CREATING,
      insertDate: new Date(),
    });

    const [createMystError] = await this._runnerDockerService.create(mystConnectRunnerModel);
    if (createMystError) {
      return [createMystError];
    }

    return [null, null];
  }
}
