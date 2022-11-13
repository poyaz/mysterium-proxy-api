import {Injectable} from '@nestjs/common';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';
import {AsyncReturn} from '@src-core/utility';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {FilterModel} from '@src-core/model/filter.model';
import {IRunnerServiceInterface} from '@src-core/interface/i-runner-service.interface';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {defaultModelFactory, defaultModelType} from '@src-core/model/defaultModel';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {ProviderIdentityInUseException} from '@src-core/exception/provider-identity-in-use.exception';
import {IMystIdentityServiceInterface} from '@src-core/interface/i-myst-identity-service.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {NotFoundMystIdentityException} from '@src-core/exception/not-found-myst-identity.exception';
import {NotRunningServiceException} from '@src-core/exception/not-running-service.exception';
import {ProviderIdentityNotConnectingException} from '@src-core/exception/provider-identity-not-connecting.exception';
import {setTimeout} from 'timers/promises';
import {ProxyProviderInUseException} from '@src-core/exception/proxy-provider-in-use.exception';

@Injectable()
export class MystProviderService implements IProviderServiceInterface {
  private readonly _fakeRunner: defaultModelType<RunnerModel>;

  constructor(
    private readonly _mystApiRepository: IMystApiRepositoryInterface,
    private readonly _runnerService: IRunnerServiceInterface,
    private readonly _mystIdentityService: IMystIdentityServiceInterface,
  ) {
    this._fakeRunner = defaultModelFactory<RunnerModel>(
      RunnerModel,
      {
        id: 'id',
        serial: 'serial',
        name: 'name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      },
      ['id', 'serial', 'name', 'service', 'exec', 'socketType', 'status', 'insertDate'],
    );
  }

  async getAll(filter?: FilterModel<VpnProviderModel>): Promise<AsyncReturn<Error, Array<VpnProviderModel>>> {
    return this._mystApiRepository.getAll(this._fakeRunner, filter);
  }

  async getById(id: string): Promise<AsyncReturn<Error, VpnProviderModel | null>> {
    const [error, data] = await this._mystApiRepository.getById(this._fakeRunner, id);
    if (error) {
      return [error];
    }
    if (!data) {
      return [new NotFoundException()];
    }

    return [null, data];
  }

  async up(id: string): Promise<AsyncReturn<Error, VpnProviderModel>> {
    const [providerError, providerData] = await this._mystApiRepository.getById(this._fakeRunner, id);
    if (providerError) {
      return [providerError];
    }
    if (!providerData) {
      return [new NotFoundException()];
    }
    if (providerData.isRegister) {
      return [new ProviderIdentityInUseException()];
    }

    const mystIdentityFilter = new FilterModel<MystIdentityModel>();
    mystIdentityFilter.addCondition({$opr: 'eq', isUse: false});
    const [freeMystIdentityError, freeMystIdentityList, freeMystIdentityCount] = await this._mystIdentityService.getAll(mystIdentityFilter);
    if (freeMystIdentityError) {
      return [freeMystIdentityError];
    }
    if (freeMystIdentityCount === 0) {
      return [new NotFoundMystIdentityException()];
    }

    const mystRunnerFilter = new FilterModel<RunnerModel<MystIdentityModel>>();
    mystRunnerFilter.addCondition({$opr: 'eq', service: RunnerServiceEnum.MYST});
    mystRunnerFilter.addCondition({
      $opr: 'eq',
      label: {$namespace: MystIdentityModel.name, id: freeMystIdentityList[0].id},
    });
    const [mystRunnerError, mystRunnerList, mystRunnerCount] = await this._runnerService.findAll(mystRunnerFilter);
    if (mystRunnerError) {
      return [mystRunnerError];
    }
    if (mystRunnerCount === 0) {
      return [new NotRunningServiceException()];
    }
    if (mystRunnerList[0].status !== RunnerStatusEnum.RUNNING) {
      return [new NotRunningServiceException()];
    }

    const [forceDisconnectError] = await this._mystApiRepository.disconnect(mystRunnerList[0], true);
    if (forceDisconnectError) {
      return [forceDisconnectError];
    }

    await setTimeout(4000, 'resolved');

    providerData.userIdentity = freeMystIdentityList[0].identity;
    return this._mystApiRepository.connect(mystRunnerList[0], providerData);
  }

  async down(id: string): Promise<AsyncReturn<Error, null>> {
    const [providerError, providerData] = await this._mystApiRepository.getById(this._fakeRunner, id);
    if (providerError) {
      return [providerError];
    }
    if (!providerData) {
      return [new NotFoundException()];
    }
    if (!providerData.isRegister || (providerData.isRegister && !providerData.runner)) {
      return [new ProviderIdentityNotConnectingException()];
    }
    if (providerData.proxyCount > 0) {
      return [new ProxyProviderInUseException()];
    }
    if (providerData.runner.status != RunnerStatusEnum.RUNNING) {
      return [new NotRunningServiceException()];
    }

    return this._mystApiRepository.disconnect(providerData.runner);
  }
}
