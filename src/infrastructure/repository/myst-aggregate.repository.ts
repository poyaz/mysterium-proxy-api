import {IProxyApiRepositoryInterface} from '@src-core/interface/i-proxy-api-repository.interface';
import {AsyncReturn} from '@src-core/utility';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {RunnerModel, RunnerServiceEnum, RunnerStatusEnum} from '@src-core/model/runner.model';

export class MystAggregateRepository implements IProxyApiRepositoryInterface {
  constructor(
    private readonly _dockerRunnerRepository: IRunnerRepositoryInterface,
    private readonly _mystApiRepository: IProxyApiRepositoryInterface,
  ) {
  }

  async getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<VpnProviderModel>>> {
    const runnerFilter = new FilterModel<RunnerModel>();
    runnerFilter.addCondition({$opr: 'eq', status: RunnerStatusEnum.RUNNING});
    runnerFilter.addCondition({$opr: 'eq', service: RunnerServiceEnum.MYST});

    const [
      [apiError, apiDataList, apiTotalCount],
      [runnerError, runnerDataList, runnerTotalCount],
    ] = await Promise.all([
      this._mystApiRepository.getAll(filter),
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

    const dataList = apiDataList.map((v: VpnProviderModel) => MystAggregateRepository._mergeData(v, runnerDataList));
    const [result, totalCount] = MystAggregateRepository._paginationData(dataList, apiTotalCount, filter);

    return [null, result, totalCount];
  }

  getById(id: string): Promise<AsyncReturn<Error, VpnProviderModel | null>> {
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
