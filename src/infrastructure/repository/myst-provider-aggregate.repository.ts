import {AsyncReturn} from '@src-core/utility';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {RunnerModel, RunnerServiceEnum, RunnerStatusEnum} from '@src-core/model/runner.model';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';

export class MystProviderAggregateRepository implements IMystApiRepositoryInterface {
  constructor(
    private readonly _dockerRunnerRepository: IRunnerRepositoryInterface,
    private readonly _mystApiRepository: IMystApiRepositoryInterface,
  ) {
  }

  async getAll<F>(runnerModel: RunnerModel, filter?: F): Promise<AsyncReturn<Error, Array<VpnProviderModel>>> {
    const runnerFilter = new FilterModel<RunnerModel>();
    runnerFilter.addCondition({$opr: 'eq', status: RunnerStatusEnum.RUNNING});
    runnerFilter.addCondition({$opr: 'eq', service: RunnerServiceEnum.MYST});

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
    if (runnerTotalCount === 0) {
      return [null, apiDataList, apiTotalCount];
    }

    const dataList = apiDataList.map((v: VpnProviderModel) => MystProviderAggregateRepository._mergeData(v, runnerDataList));
    const [result, totalCount] = MystProviderAggregateRepository._paginationData(dataList, apiTotalCount, filter);

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

    const runnerFilter = new FilterModel<RunnerModel>();
    runnerFilter.addCondition({$opr: 'eq', status: RunnerStatusEnum.RUNNING});
    runnerFilter.addCondition({$opr: 'eq', service: RunnerServiceEnum.MYST});
    runnerFilter.addCondition({
      $opr: 'eq',
      label: {
        $namespace: VpnProviderModel.name,
        id,
        providerIdentity: apiData.providerIdentity,
      },
    });
    const [runnerError, runnerDataList, runnerTotalCount] = await this._dockerRunnerRepository.getAll<VpnProviderModel>(runnerFilter);
    if (runnerError) {
      return [runnerError];
    }
    if (runnerTotalCount === 0) {
      return [null, apiData];
    }

    apiData.isRegister = true;
    apiData.runner = runnerDataList[0];

    return [null, apiData];
  }

  connect(runner: RunnerModel, VpnProviderModel: VpnProviderModel): Promise<AsyncReturn<Error, VpnProviderModel>> {
    return Promise.resolve(undefined);
  }

  disconnect(runner: RunnerModel, force?: boolean): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  registerIdentity(runner: RunnerModel, userIdentity: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  unlockIdentity(runner: RunnerModel, identity: MystIdentityModel): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  private static _mergeData(vpnData: VpnProviderModel, runnerDataList: Array<RunnerModel<VpnProviderModel>>): VpnProviderModel {
    const findRunner = runnerDataList.find((v) => v.label.id === vpnData.id && v.label.providerIdentity === vpnData.providerIdentity);
    if (findRunner) {
      vpnData.isRegister = true;
      vpnData.runner = findRunner;
    }

    return vpnData;
  }

  private static _paginationData<F>(dataList: Array<VpnProviderModel>, totalCount: number, filter?: F): [Array<VpnProviderModel>, number] {
    if (!filter) {
      return [dataList, totalCount];
    }

    const filterModel = <FilterModel<VpnProviderModel>><any>filter;

    const getIsRegister = filterModel.getCondition('isRegister');
    if (!getIsRegister) {
      return [dataList, totalCount];
    }

    const resultFilter = dataList.filter((v) => v.isRegister === getIsRegister.isRegister);

    const pageNumber = filterModel.page;
    const pageSize = filterModel.limit;
    const resultPagination = resultFilter.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

    return [resultPagination, resultFilter.length];
  }
}
