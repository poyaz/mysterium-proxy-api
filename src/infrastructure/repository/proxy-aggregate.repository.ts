import {Injectable} from '@nestjs/common';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {IProxyRepositoryInterface} from '@src-core/interface/i-proxy-repository.interface';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {
  RunnerExecEnum,
  RunnerLabelNamespace,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {DefaultModel, defaultModelFactory} from '@src-core/model/defaultModel';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {filterAndSortProxyUpstream} from '@src-infrastructure/utility/filterAndSortProxyUpstream';
import {ISystemInfoRepositoryInterface} from '@src-core/interface/i-system-info-repository.interface';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ExistException} from '@src-core/exception/exist.exception';

interface MystMapRunnerPos {
  vpnProvider: number;
  mystConnectRunner: number;
  proxyDownstreamRunner: number;
}

interface MystRunnerCombineMap {
  provider: Record<string, MystMapRunnerPos>;
  myst: Record<string, number>;
}

type DependencyRunnerAndOutgoingIpInfoOutput = {
  dependencyRunnerList: Array<RunnerModel>,
  vpnProviderData: VpnProviderModel,
  proxyAddrData: string
};

@Injectable()
export class ProxyAggregateRepository implements IProxyRepositoryInterface {
  private readonly FAKE_RUNNER = defaultModelFactory<RunnerModel>(
    RunnerModel,
    {
      id: 'default-id',
      serial: 'default-serial',
      name: 'default-name',
      service: RunnerServiceEnum.MYST,
      exec: RunnerExecEnum.DOCKER,
      socketType: RunnerSocketTypeEnum.NONE,
      status: RunnerStatusEnum.RUNNING,
      insertDate: new Date(),
    },
    ['id', 'serial', 'name', 'service', 'exec', 'status', 'insertDate'],
  );

  constructor(
    private readonly _runnerRepository: IRunnerRepositoryInterface,
    private readonly _mystProviderRepository: IMystApiRepositoryInterface,
    private readonly _systemInfoRepository: ISystemInfoRepositoryInterface,
    private readonly _identifier: IIdentifier,
    private readonly _proxyListenAddr?: string,
  ) {
  }

  async getAll(filter?: FilterModel<ProxyUpstreamModel>): Promise<AsyncReturn<Error, Array<ProxyUpstreamModel>>> {
    const vpnProviderFilter = new FilterModel<VpnProviderModel>({skipPagination: true});
    vpnProviderFilter.addCondition({$opr: 'eq', isRegister: true});

    const [
      [runnerError, runnerList, runnerTotal],
      [vpnProviderError, vpnProviderList],
      [proxyAddrError, proxyAddrData],
    ] = await Promise.all([
      this._runnerRepository.getAll(new FilterModel({skipPagination: true})),
      this._mystProviderRepository.getAll(this.FAKE_RUNNER, vpnProviderFilter),
      this._getOutgoingAddr(),
    ]);
    const error = runnerError || vpnProviderError || proxyAddrError;
    if (error) {
      return [error];
    }
    if (runnerTotal === 0) {
      return [null, [], 0];
    }

    const proxyUpstreamRunnerList = runnerList.filter((v) => v.service === RunnerServiceEnum.SOCAT);
    if (proxyUpstreamRunnerList.length === 0) {
      return [null, [], 0];
    }

    const runnerMap = ProxyAggregateRepository._runnerMapObject(runnerList, vpnProviderList);
    const proxyUpstreamCombineList = proxyUpstreamRunnerList.map((v) => ProxyAggregateRepository._mergeData(
      runnerList,
      vpnProviderList,
      <RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>><unknown>v,
      runnerMap,
      proxyAddrData,
    ));

    const dataFilter: FilterModel<ProxyUpstreamModel> = !filter ? new FilterModel<ProxyUpstreamModel>() : <any>filter;
    const [result, totalCount] = filterAndSortProxyUpstream(proxyUpstreamCombineList, dataFilter);

    return [null, result, totalCount];
  }

  async getById(id: string): Promise<AsyncReturn<Error, ProxyUpstreamModel | null>> {
    const proxyUpstreamRunnerFilter = new FilterModel<RunnerModel<ProxyUpstreamModel>>();
    proxyUpstreamRunnerFilter.addCondition({$opr: 'eq', service: RunnerServiceEnum.SOCAT});
    proxyUpstreamRunnerFilter.addCondition({$opr: 'eq', label: {$namespace: ProxyUpstreamModel.name, id}});
    const [proxyUpstreamError, proxyUpstreamList, proxyUpstreamTotal] = await this._runnerRepository.getAll(proxyUpstreamRunnerFilter);
    if (proxyUpstreamError) {
      return [proxyUpstreamError];
    }
    if (proxyUpstreamTotal === 0) {
      return [null, null];
    }

    const proxyUpstreamData = (<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>><unknown>proxyUpstreamList[0]);
    const vpnProviderId = proxyUpstreamData.label.find((v) => v.$namespace === VpnProviderModel.name).id;

    const [infoError, infoData] = await this._getDependencyRunnerAndOutgoingIpInfoByProviderId(vpnProviderId);
    if (infoError) {
      return [infoError];
    }

    const {dependencyRunnerList, vpnProviderData, proxyAddrData} = infoData;
    const vpnProviderList = vpnProviderData ? [vpnProviderData] : [];
    const runnerList = [...dependencyRunnerList, vpnProviderData.runner];

    const runnerMap = ProxyAggregateRepository._runnerMapObject(runnerList, vpnProviderList);
    const proxyUpstreamCombineList = [proxyUpstreamData].map((v) => ProxyAggregateRepository._mergeData(
      runnerList,
      vpnProviderList,
      <RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>><unknown>v,
      runnerMap,
      proxyAddrData,
    ));

    return [null, proxyUpstreamCombineList[0]];
  }

  async create(model: ProxyUpstreamModel): Promise<AsyncReturn<Error, ProxyUpstreamModel>> {
    const vpnProviderId = model.proxyDownstream[0]?.refId;

    const [infoError, infoData] = await this._getDependencyRunnerAndOutgoingIpInfoByProviderId(vpnProviderId);
    if (infoError) {
      return [infoError];
    }

    const {dependencyRunnerList, vpnProviderData, proxyAddrData} = infoData;
    const mystConnectExistRunner = dependencyRunnerList.find((v) => v.service === RunnerServiceEnum.MYST_CONNECT);
    const proxyDownstreamExistRunner = dependencyRunnerList.find((v) => v.service === RunnerServiceEnum.ENVOY);
    const proxyUpstreamExistRunner = dependencyRunnerList.find((v) => v.service === RunnerServiceEnum.SOCAT);

    if (proxyDownstreamExistRunner && proxyUpstreamExistRunner) {
      return [new ExistException()];
    }

    if (proxyDownstreamExistRunner) {
      const [removeRunnerError] = await this._runnerRepository.remove(proxyDownstreamExistRunner.id);
      if (removeRunnerError) {
        return [removeRunnerError];
      }
    }

    const mystUserIdentity = vpnProviderData.userIdentity;
    const mystIdentityId = (
      <RunnerLabelNamespace<[MystIdentityModel]>>(
        Array.isArray(vpnProviderData.runner.label) ? vpnProviderData.runner.label : [vpnProviderData.runner.label]
      )
    ).find((v) => v.$namespace === MystIdentityModel.name).id;

    const proxyUpstreamDefaultModel = <DefaultModel<ProxyUpstreamModel>><unknown>model;
    const isCreateWithPort = proxyUpstreamDefaultModel.IS_DEFAULT_MODEL && !proxyUpstreamDefaultModel.isDefaultProperty('listenPort');

    const proxyUpstreamId = this._identifier.generateId();
    const proxyUpstreamCreateRunner = defaultModelFactory<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>>(
      RunnerModel,
      {
        id: 'default-id',
        serial: 'default-serial',
        name: `${RunnerServiceEnum.SOCAT}-${mystUserIdentity}`,
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: vpnProviderData.runner.socketUri,
        ...(isCreateWithPort && {socketPort: model.listenPort}),
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: mystIdentityId,
          },
          {
            $namespace: VpnProviderModel.name,
            id: vpnProviderId,
          },
          {
            $namespace: ProxyUpstreamModel.name,
            id: proxyUpstreamId,
          },
        ],
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      },
      ['id', 'serial', 'status', 'insertDate'],
    );
    const [proxyUpstreamError, proxyUpstreamData] = await this._runnerRepository.create<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>(proxyUpstreamCreateRunner);
    if (proxyUpstreamError) {
      return [proxyUpstreamError];
    }

    const proxyDownstreamId = this._identifier.generateId();
    const proxyDownstreamCreateRunner = defaultModelFactory<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>>(
      RunnerModel,
      {
        id: 'default-id',
        serial: 'default-serial',
        name: `${RunnerServiceEnum.ENVOY}-${mystUserIdentity}`,
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketPort: proxyUpstreamData.socketPort,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: mystIdentityId,
          },
          {
            $namespace: VpnProviderModel.name,
            id: vpnProviderId,
          },
          {
            $namespace: ProxyDownstreamModel.name,
            id: proxyDownstreamId,
          },
        ],
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      },
      ['id', 'serial', 'status', 'insertDate'],
    );
    const [proxyDownstreamError, proxyDownstreamData] = await this._runnerRepository.create<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>(proxyDownstreamCreateRunner);
    if (proxyDownstreamError) {
      return [proxyDownstreamError];
    }

    const vpnProviderList = vpnProviderData ? [vpnProviderData] : [];
    const runnerList = <Array<RunnerModel>><unknown>[proxyDownstreamData, mystConnectExistRunner, vpnProviderData.runner];

    const runnerMap = ProxyAggregateRepository._runnerMapObject(runnerList, vpnProviderList);
    const proxyUpstreamCombineList = [proxyUpstreamData].map((v) => ProxyAggregateRepository._mergeData(
      runnerList,
      vpnProviderList,
      <RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>><unknown>v,
      runnerMap,
      proxyAddrData,
    ));

    return [null, proxyUpstreamCombineList[0]];
  }

  remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  private async _getOutgoingAddr(): Promise<AsyncReturn<Error, string>> {
    if (this._proxyListenAddr) {
      return [null, this._proxyListenAddr];
    }

    return this._systemInfoRepository.getOutgoingIpAddress();
  }

  private async _getDependencyRunnerAndOutgoingIpInfoByProviderId(vpnProviderId: string): Promise<AsyncReturn<Error, DependencyRunnerAndOutgoingIpInfoOutput>> {
    const dependencyRunnerFilter = new FilterModel<RunnerModel>();
    dependencyRunnerFilter.addCondition({$opr: 'eq', label: {$namespace: VpnProviderModel.name, id: vpnProviderId}});

    const [
      [dependencyRunnerError, dependencyRunnerList],
      [vpnProviderError, vpnProviderData],
      [proxyAddrError, proxyAddrData],
    ] = await Promise.all([
      this._runnerRepository.getAll(dependencyRunnerFilter),
      this._mystProviderRepository.getById(this.FAKE_RUNNER, vpnProviderId),
      this._getOutgoingAddr(),
    ]);
    const error = vpnProviderError || dependencyRunnerError || proxyAddrError;
    if (error) {
      return [error];
    }

    return [null, {dependencyRunnerList, vpnProviderData, proxyAddrData}];
  }

  private static _runnerMapObject(runnerList: Array<RunnerModel>, vpnProviderList: Array<VpnProviderModel>): MystRunnerCombineMap {
    const runnerMap: MystRunnerCombineMap = {provider: {}, myst: {}};
    for (let i = 0; i < runnerList.length; i++) {
      const runner = runnerList[i];

      if (runner.service === RunnerServiceEnum.SOCAT) {
        continue;
      }

      const label = Array.isArray(runner.label) ? runner.label : [runner.label];
      const mystIdentityId = label.find((v) => v.$namespace === MystIdentityModel.name)?.id;
      const vpnProviderId = label.find((v) => v.$namespace === VpnProviderModel.name)?.id;

      if (vpnProviderId && !(vpnProviderId in runnerMap.provider)) {
        runnerMap.provider[vpnProviderId] = {
          vpnProvider: -1,
          mystConnectRunner: -1,
          proxyDownstreamRunner: -1,
        };
      }

      switch (runner.service) {
        case RunnerServiceEnum.ENVOY: {
          runnerMap.provider[vpnProviderId].proxyDownstreamRunner = i;
          break;
        }
        case RunnerServiceEnum.MYST_CONNECT: {
          runnerMap.provider[vpnProviderId].mystConnectRunner = i;
          break;
        }
        case RunnerServiceEnum.MYST: {
          runnerMap.myst[mystIdentityId] = i;
          break;
        }
      }
    }

    for (let i = 0; i < vpnProviderList.length; i++) {
      const vpnProviderId = vpnProviderList[i].id;
      if (vpnProviderId in runnerMap.provider) {
        runnerMap.provider[vpnProviderId].vpnProvider = i;
      }
    }

    return runnerMap;
  }

  private static _mergeData(
    runnerList: Array<RunnerModel>,
    vpnProviderList: Array<VpnProviderModel>,
    upstreamRunner: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>,
    runnerMap: MystRunnerCombineMap,
    proxyAddrData: string,
  ): ProxyUpstreamModel {
    const label = Array.isArray(upstreamRunner.label) ? upstreamRunner.label : [upstreamRunner.label];
    const mystIdentityId = label.find((v) => v.$namespace === MystIdentityModel.name)?.id;
    const vpnProviderId = label.find((v) => v.$namespace === VpnProviderModel.name)?.id;
    const proxyUpstreamId = label.find((v) => v.$namespace === ProxyUpstreamModel.name)?.id;

    const proxyUpstreamModel = new ProxyUpstreamModel({
      id: proxyUpstreamId,
      listenAddr: proxyAddrData,
      listenPort: upstreamRunner.socketPort,
      proxyDownstream: [],
      runner: upstreamRunner,
      insertDate: upstreamRunner.insertDate,
    });

    const proxyDownstreamModel = defaultModelFactory<ProxyDownstreamModel>(
      ProxyDownstreamModel,
      {
        id: 'default-id',
        refId: 'default-ref-id',
        ip: 'default-ip',
        mask: 32,
        type: ProxyTypeEnum.MYST,
        status: ProxyStatusEnum.DISABLE,
      },
      ['id', 'refId', 'ip', 'mask', 'type'],
    );

    if (vpnProviderId in runnerMap.provider) {
      if (runnerMap.provider[vpnProviderId].proxyDownstreamRunner !== -1) {
        const proxyDownstreamIndex = runnerMap.provider[vpnProviderId].proxyDownstreamRunner;
        const runner = <RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>><unknown>runnerList[proxyDownstreamIndex];

        proxyDownstreamModel.id = runner.label.find((v) => v.$namespace === ProxyDownstreamModel.name).id;
        proxyDownstreamModel.refId = vpnProviderId;
        proxyDownstreamModel.runner = runner;
        proxyDownstreamModel.type = ProxyTypeEnum.MYST;

        if (runnerMap.provider[vpnProviderId].vpnProvider != -1) {
          const vpnProviderIndex = runnerMap.provider[vpnProviderId].vpnProvider;
          proxyDownstreamModel.ip = vpnProviderList[vpnProviderIndex].ip;
          proxyDownstreamModel.mask = vpnProviderList[vpnProviderIndex].mask;
        }

        const mystIdentityIndex = runnerMap.myst[mystIdentityId];
        const mystConnectIndex = runnerMap.provider[vpnProviderId].mystConnectRunner;

        if (mystIdentityIndex !== -1 && mystConnectIndex !== -1) {
          if (
            runnerList[mystIdentityIndex].status === RunnerStatusEnum.RUNNING
            && runnerList[mystConnectIndex].status === RunnerStatusEnum.RUNNING
          ) {
            proxyDownstreamModel.status = ProxyStatusEnum.ONLINE;
          } else {
            proxyDownstreamModel.status = ProxyStatusEnum.OFFLINE;
          }
        } else if (mystIdentityIndex !== -1 && mystConnectIndex === -1) {
          proxyDownstreamModel.status = ProxyStatusEnum.OFFLINE;
        } else if (mystIdentityIndex === -1) {
          proxyDownstreamModel.status = ProxyStatusEnum.DISABLE;
        }
      }

      delete runnerMap.provider[vpnProviderId];
    }

    proxyUpstreamModel.proxyDownstream.push(proxyDownstreamModel);

    return proxyUpstreamModel;
  }
}
