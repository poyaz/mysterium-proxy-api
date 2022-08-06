import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {AsyncReturn} from '@src-core/utility';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {IAccountIdentityFileRepository} from '@src-core/interface/i-account-identity-file.repository';
import {FilterModel} from '@src-core/model/filter.model';
import {RunnerModel, RunnerServiceEnum} from '@src-core/model/runner.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';

export class MystIdentityAggregateRepository implements IGenericRepositoryInterface<MystIdentityModel> {
  constructor(
    private readonly _mystIdentityFileRepository: IAccountIdentityFileRepository,
    private readonly _mystIdentityPgRepository: IGenericRepositoryInterface<MystIdentityModel>,
    private readonly _dockerRunnerRepository: IRunnerRepositoryInterface,
  ) {
  }

  async getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<MystIdentityModel>>> {
    const [
      [errorFile, dataFileList, totalFileCount],
      [errorIdentity, dataIdentityList, totalIdentityCount],
      [errorRunner, dataRunnerList],
    ] = await this._getAllData(filter);
    const fetchError = errorFile || errorIdentity || errorRunner;
    if (fetchError) {
      return [fetchError];
    }
    if (totalFileCount === 0 || totalIdentityCount === 0) {
      return [null, [], 0];
    }

    const dataList = dataIdentityList
      .map((v: MystIdentityModel) => MystIdentityAggregateRepository._mergeFileData(v, dataFileList))
      .filter((v) => v)
      .map((v: MystIdentityModel) => MystIdentityAggregateRepository._mergeRunnerData(v, dataRunnerList));

    const [result, totalCount] = MystIdentityAggregateRepository._paginationData(dataList, filter);

    return [null, result, totalCount];
  }

  getById(id: string): Promise<AsyncReturn<Error, MystIdentityModel | null>> {
    return Promise.resolve(undefined);
  }

  add(model: MystIdentityModel): Promise<AsyncReturn<Error, MystIdentityModel>> {
    return Promise.resolve(undefined);
  }

  remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  update<F>(model: F): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  private async _getAllData<F>(filter?: F) {
    const identityFilter = new FilterModel<MystIdentityModel>({skipPagination: true});
    if (filter instanceof FilterModel) {
      const conditionList = (<FilterModel<MystIdentityModel>>filter).getConditionList();
      for (const condition of conditionList) {
        identityFilter.addCondition(condition);
      }

      const sortByList = (<FilterModel<MystIdentityModel>>filter).getSortByList();
      for (const sortBy of sortByList) {
        identityFilter.addSortBy(sortBy);
      }
    }

    const runnerFilter = new FilterModel<RunnerModel>();
    runnerFilter.addCondition({$opr: 'eq', service: RunnerServiceEnum.MYST});

    return Promise.all([
      this._mystIdentityFileRepository.getAll(),
      this._mystIdentityPgRepository.getAll(identityFilter),
      this._dockerRunnerRepository.getAll(runnerFilter),
    ]);
  }

  private static _mergeFileData(identityData: MystIdentityModel, fileDataList: Array<string>): MystIdentityModel | null {
    const findFile = fileDataList.find((v) => v.replace(/^.+\/(.+)\..+$/, '$1') === identityData.identity);
    if (!findFile) {
      return null;
    }

    const [, path, filename] = /^(.+\/)(.+\..+)$/.exec(findFile);

    identityData.path = path;
    identityData.filename = filename;

    return identityData;
  }

  private static _mergeRunnerData(identityData: MystIdentityModel, runnerDataList: Array<RunnerModel<VpnProviderModel>>): MystIdentityModel {
    const findRunner = runnerDataList.find((v) => v.label.userIdentity === identityData.identity);
    if (findRunner) {
      identityData.isUse = true;
    }

    return identityData;
  }

  private static _paginationData<F>(identityList: Array<MystIdentityModel>, filter: F): [Array<MystIdentityModel>, number] {
    const filterModel = <FilterModel<MystIdentityModel>><any>filter;
    let dataList: Array<MystIdentityModel> = identityList;

    const getIdentity = filterModel.getCondition('identity');
    if (getIdentity) {
      dataList = identityList.filter((v) => v.identity === getIdentity.identity);
    }

    const getIsUse = filterModel.getCondition('isUse');
    if (getIsUse) {
      dataList = identityList.filter((v) => v.isUse === getIsUse.isUse);
    }

    const pageNumber = filterModel.page;
    const pageSize = filterModel.limit;
    const resultPagination = dataList.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

    return [resultPagination, dataList.length];
  }
}
