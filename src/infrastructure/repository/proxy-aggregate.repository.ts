import {Injectable} from '@nestjs/common';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {IProxyRepositoryInterface} from '@src-core/interface/i-proxy-repository.interface';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {filterAndSortProxyUpstream} from '@src-infrastructure/utility/filterAndSortProxyUpstream';
import {ISystemInfoRepositoryInterface} from '@src-core/interface/i-system-info-repository.interface';

interface MystMapRunnerPos {
  vpnProvider: number;
  mystConnect: number;
  proxyDownstream: number;
}

interface MystRunnerCombineMap {
  provider: Record<string, MystMapRunnerPos>;
  myst: Record<string, number>;
}

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
    if (runnerError) {
      return [runnerError];
    }
    if (vpnProviderError) {
      return [vpnProviderError];
    }
    if (proxyAddrError) {
      return [proxyAddrError];
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
    const mystIdentityId = proxyUpstreamData.label.find((v) => v.$namespace === MystIdentityModel.name).id;
    const vpnProviderId = proxyUpstreamData.label.find((v) => v.$namespace === VpnProviderModel.name).id;

    const runnerFilter = new FilterModel<RunnerModel>();
    runnerFilter.addCondition({$opr: 'eq', label: {$namespace: VpnProviderModel.name, id: vpnProviderId}});

    const mystRunnerFilter = new FilterModel<RunnerModel>();
    mystRunnerFilter.addCondition({$opr: 'eq', service: RunnerServiceEnum.MYST});
    mystRunnerFilter.addCondition({$opr: 'eq', label: {$namespace: MystIdentityModel.name, id: mystIdentityId}});

    const [
      [dependencyRunnerError, dependencyRunnerList],
      [mystRunnerError, mystRunnerList],
      [vpnProviderError, vpnProviderData],
      [proxyAddrError, proxyAddrData],
    ] = await Promise.all([
      this._runnerRepository.getAll(runnerFilter),
      this._runnerRepository.getAll(mystRunnerFilter),
      this._mystProviderRepository.getById(this.FAKE_RUNNER, vpnProviderId),
      this._getOutgoingAddr(),
    ]);
    const error = dependencyRunnerError || mystRunnerError || vpnProviderError || proxyAddrError;
    if (error) {
      return [error];
    }

    const vpnProviderList = vpnProviderData ? [vpnProviderData] : [];
    const runnerList = [...dependencyRunnerList, ...mystRunnerList];

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

  create(model: ProxyUpstreamModel): Promise<AsyncReturn<Error, ProxyUpstreamModel>> {
    return Promise.resolve(undefined);
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

      if (!(vpnProviderId in runnerMap.provider)) {
        runnerMap.provider[vpnProviderId] = {
          vpnProvider: -1,
          mystConnect: -1,
          proxyDownstream: -1,
        };
      }

      switch (runner.service) {
        case RunnerServiceEnum.ENVOY: {
          runnerMap.provider[vpnProviderId].proxyDownstream = i;
          break;
        }
        case RunnerServiceEnum.MYST_CONNECT: {
          runnerMap.provider[vpnProviderId].mystConnect = i;
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
      if (runnerMap.provider[vpnProviderId].proxyDownstream !== -1) {
        const proxyDownstreamIndex = runnerMap.provider[vpnProviderId].proxyDownstream;
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
        const mystConnectIndex = runnerMap.provider[vpnProviderId].mystConnect;

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
