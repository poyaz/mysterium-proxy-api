import {AsyncReturn} from '@src-core/utility';
import {VpnProviderModel, VpnProviderStatusEnum} from '@src-core/model/vpn-provider.model';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {
  RunnerExecEnum,
  RunnerLabelNamespace,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {filterAndSortVpnProvider} from '@src-infrastructure/utility/filterAndSortVpnProvider';
import {defaultModelFactory} from '@src-core/model/defaultModel';

type mergeRunnerObjType = {
  [key: string]: {
    myst: RunnerModel<MystIdentityModel>,
    mystConnect: RunnerModel<[MystIdentityModel, VpnProviderModel]>,
    socat: Array<RunnerModel<[MystIdentityModel, VpnProviderModel]>>,
  }
};

export class MystProviderAggregateRepository implements IMystApiRepositoryInterface {
  constructor(
    private readonly _dockerRunnerRepository: IRunnerRepositoryInterface,
    private readonly _mystApiRepository: IMystApiRepositoryInterface,
  ) {
  }

  async getAll<F>(runnerModel: RunnerModel, filter?: F): Promise<AsyncReturn<Error, Array<VpnProviderModel>>> {
    const runnerFilter = new FilterModel<RunnerModel>({skipPagination: true});

    const [
      [apiError, apiDataList, apiTotalCount],
      [runnerError, runnerDataList, runnerTotalCount],
    ] = await Promise.all([
      this._mystApiRepository.getAll(runnerModel, filter),
      this._dockerRunnerRepository.getAll<VpnProviderModel>(runnerFilter),
    ]);
    if (apiError) {
      return [apiError];
    }
    if (runnerError) {
      return [runnerError];
    }

    if (apiTotalCount === 0) {
      return [null, [], 0];
    }

    const dataFilter: FilterModel<VpnProviderModel> = !filter ? new FilterModel<VpnProviderModel>() : <any>filter;
    if (dataFilter.getCondition('isRegister')?.isRegister && runnerTotalCount === 0) {
      return [null, [], 0];
    }

    const runnerObj = MystProviderAggregateRepository._mergeRunnerObjData(runnerDataList);
    const dataList = apiDataList.map((v) => MystProviderAggregateRepository._mergeData(v, runnerObj));

    const [result, totalCount] = filterAndSortVpnProvider(dataList, dataFilter);

    return [null, result, totalCount];
  }

  async getById(runnerModel: RunnerModel, id: string): Promise<AsyncReturn<Error, VpnProviderModel | null>> {
    const [apiError, apiData] = await this._mystApiRepository.getById(runnerModel, id);
    if (apiError) {
      return [apiError];
    }
    if (!apiData) {
      return [null, null];
    }

    const providerRunnerFilter = new FilterModel<RunnerModel<VpnProviderModel>>();
    providerRunnerFilter.addCondition({
      $opr: 'eq',
      label: {
        $namespace: VpnProviderModel.name,
        id,
      },
    });
    const [
      providerRunnerError,
      providerRunnerDataList,
      providerRunnerTotalCount,
    ] = await this._dockerRunnerRepository.getAll<VpnProviderModel>(providerRunnerFilter);
    if (providerRunnerError) {
      return [providerRunnerError];
    }
    if (providerRunnerTotalCount === 0) {
      return [null, apiData];
    }

    const mystRunnerFilter = new FilterModel<RunnerModel<MystIdentityModel>>();
    mystRunnerFilter.addCondition({$opr: 'eq', service: RunnerServiceEnum.MYST});
    mystRunnerFilter.addCondition({
      $opr: 'eq',
      label: {
        $namespace: MystIdentityModel.name,
        id: (<RunnerModel<[MystIdentityModel, VpnProviderModel]>><any>providerRunnerDataList[0]).label.find((v) => v.$namespace === MystIdentityModel.name).id,
      },
    });
    const [
      mystRunnerError,
      mystRunnerDataList,
      mystRunnerTotalCount,
    ] = await this._dockerRunnerRepository.getAll<VpnProviderModel>(mystRunnerFilter);
    if (mystRunnerError) {
      return [mystRunnerError];
    }
    if (mystRunnerTotalCount === 0) {
      return [null, apiData];
    }


    const runnerObj = MystProviderAggregateRepository._mergeRunnerObjData([...providerRunnerDataList, ...mystRunnerDataList]);
    const result = MystProviderAggregateRepository._mergeData(apiData, runnerObj);

    return [null, result];
  }

  async connect(runner: RunnerModel, vpnProviderModel: VpnProviderModel): Promise<AsyncReturn<Error, VpnProviderModel>> {
    const [connectError, connectData] = await this._mystApiRepository.connect(runner, vpnProviderModel);
    if (connectError) {
      return [connectError];
    }

    const mystConnectRunnerCreateModel = defaultModelFactory<RunnerModel<[MystIdentityModel, VpnProviderModel]>>(
      RunnerModel,
      {
        id: 'default-id',
        serial: 'default-serial',
        name: `${RunnerServiceEnum.MYST_CONNECT}-${vpnProviderModel.providerIdentity}`,
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: (<MystIdentityModel><any>runner.label).id,
            identity: vpnProviderModel.userIdentity,
          },
          {
            $namespace: VpnProviderModel.name,
            id: vpnProviderModel.id,
            userIdentity: vpnProviderModel.userIdentity,
            providerIdentity: vpnProviderModel.providerIdentity,
          },
        ],
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      },
      ['id', 'serial', 'status', 'insertDate'],
    );
    const [mystConnectError] = await this._dockerRunnerRepository.create<[MystIdentityModel, VpnProviderModel]>(mystConnectRunnerCreateModel);
    if (mystConnectError) {
      return [mystConnectError];
    }

    const vpnProviderResultModel = vpnProviderModel.clone();
    vpnProviderResultModel.providerStatus = VpnProviderStatusEnum.ONLINE;
    vpnProviderResultModel.ip = connectData.ip;
    vpnProviderResultModel.runner = runner;
    vpnProviderResultModel.isRegister = true;

    return [null, vpnProviderResultModel];
  }

  async disconnect(runner: RunnerModel, force?: boolean): Promise<AsyncReturn<Error, null>> {
    const mystConnectRunnerFilter = new FilterModel<RunnerModel<MystIdentityModel>>();
    mystConnectRunnerFilter.addCondition({$opr: 'eq', service: RunnerServiceEnum.MYST_CONNECT});
    mystConnectRunnerFilter.addCondition({
      $opr: 'eq',
      label: {
        $namespace: MystIdentityModel.name,
        id: (<MystIdentityModel><any>runner.label).id,
      },
    });
    const [
      mystConnectRunnerError,
      mystConnectRunnerList,
      mystConnectRunnerTotalCount,
    ] = await this._dockerRunnerRepository.getAll(mystConnectRunnerFilter);
    if (mystConnectRunnerError) {
      return [mystConnectRunnerError];
    }
    if (mystConnectRunnerTotalCount !== 0) {
      const [removeRunnerError] = await this._dockerRunnerRepository.remove(mystConnectRunnerList[0].id);
      if (removeRunnerError) {
        return [removeRunnerError];
      }
    }

    return this._mystApiRepository.disconnect(runner, force);
  }

  async registerIdentity(runner: RunnerModel, userIdentity: string): Promise<AsyncReturn<Error, null>> {
    return this._mystApiRepository.registerIdentity(runner, userIdentity);
  }

  async unlockIdentity(runner: RunnerModel, identity: MystIdentityModel): Promise<AsyncReturn<Error, null>> {
    return this._mystApiRepository.unlockIdentity(runner, identity);
  }

  private static _mergeRunnerObjData(runnerDataList: Array<RunnerModel>): mergeRunnerObjType {
    const runnerObj: mergeRunnerObjType = {};
    const runnerMystObj = {};

    const mystRunnerList = runnerDataList.filter((v) => v.service === RunnerServiceEnum.MYST);
    for (const runner of mystRunnerList) {
      const label: RunnerLabelNamespace<MystIdentityModel> = runner.label;
      if (label.$namespace !== MystIdentityModel.name) {
        continue;
      }

      runnerMystObj[label.id] = runner;
    }

    const mystConnectRunnerList = runnerDataList.filter((v) => v.service === RunnerServiceEnum.MYST_CONNECT);
    if (mystConnectRunnerList.length === 0) {
      return runnerObj;
    }

    for (const runner of mystConnectRunnerList) {
      const labelList: RunnerLabelNamespace<[MystIdentityModel, VpnProviderModel]> = <any>(!Array.isArray(runner.label) ? [runner.label] : runner.label);
      let identityRunner: RunnerModel<MystIdentityModel> | null | undefined;
      let providerId: string;

      for (const label of labelList) {
        switch (label.$namespace) {
          case MystIdentityModel.name: {
            const mystLabel = <RunnerLabelNamespace<MystIdentityModel>>label;
            identityRunner = runnerMystObj[mystLabel.id];
            break;
          }
          case VpnProviderModel.name: {
            const vpnProviderLabel = <RunnerLabelNamespace<VpnProviderModel>>label;
            providerId = vpnProviderLabel.id;
            break;
          }
        }
      }

      if (!(providerId && identityRunner)) {
        continue;
      }

      runnerObj[providerId] = {
        myst: identityRunner,
        mystConnect: <RunnerModel<[MystIdentityModel, VpnProviderModel]>><unknown>runner,
        socat: [],
      };
    }

    const socatRunnerList = runnerDataList.filter((v) => v.service === RunnerServiceEnum.SOCAT);
    for (const runner of socatRunnerList) {
      const labelList: RunnerLabelNamespace<[MystIdentityModel, VpnProviderModel]> = <any>(!Array.isArray(runner.label) ? [runner.label] : runner.label);

      const providerId = labelList.find((v) => v.$namespace === VpnProviderModel.name)?.id;
      if (!providerId) {
        continue;
      }

      runnerObj[providerId].socat.push(<RunnerModel<[MystIdentityModel, VpnProviderModel]>><unknown>runner);
    }

    return runnerObj;
  }

  private static _mergeData(vpnData: VpnProviderModel, runnerDataObj: mergeRunnerObjType): VpnProviderModel {
    const runnerInfo = runnerDataObj[vpnData.id];
    if (!runnerInfo) {
      delete vpnData.ip;
      delete vpnData.mask;
      delete vpnData.providerStatus;

      return vpnData;
    }

    vpnData.isRegister = true;
    vpnData.userIdentity = runnerInfo.myst.label.identity;
    vpnData.runner = runnerInfo.myst;
    vpnData.proxyCount = runnerInfo.socat.length;

    switch (runnerInfo.mystConnect.status) {
      case RunnerStatusEnum.CREATING:
        vpnData.providerStatus = VpnProviderStatusEnum.PENDING;
        break;
      case RunnerStatusEnum.RUNNING:
        vpnData.providerStatus = VpnProviderStatusEnum.ONLINE;
        break;
      default:
        vpnData.providerStatus = VpnProviderStatusEnum.OFFLINE;
    }

    if (runnerInfo.myst.status !== RunnerStatusEnum.RUNNING) {
      vpnData.providerStatus = VpnProviderStatusEnum.OFFLINE;
    }

    return vpnData;
  }
}
