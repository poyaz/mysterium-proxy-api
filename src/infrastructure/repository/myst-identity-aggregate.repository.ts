import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {AsyncReturn} from '@src-core/utility';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {IAccountIdentityFileRepository} from '@src-core/interface/i-account-identity-file.repository';
import {FilterModel} from '@src-core/model/filter.model';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {ExistException} from '@src-core/exception/exist.exception';
import {IProxyApiRepositoryInterface} from '@src-core/interface/i-proxy-api-repository.interface';

export class MystIdentityAggregateRepository implements IGenericRepositoryInterface<MystIdentityModel> {
  private static RUNNER_FAKE_SERIAL = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor(
    private readonly _mystIdentityFileRepository: IAccountIdentityFileRepository,
    private readonly _mystIdentityPgRepository: IGenericRepositoryInterface<MystIdentityModel>,
    private readonly _dockerRunnerRepository: IRunnerRepositoryInterface,
    private readonly _proxyApiRepository: IProxyApiRepositoryInterface,
  ) {
  }

  async getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<MystIdentityModel>>> {
    const [
      [errorFile, dataFileList, totalFileCount],
      [errorIdentity, dataIdentityList, totalIdentityCount],
      [errorRunner, dataRunnerList, totalRunnerCount],
    ] = await this._getAllData(filter);
    const fetchError = errorFile || errorIdentity || errorRunner;
    if (fetchError) {
      return [fetchError];
    }
    if (totalFileCount === 0 || totalIdentityCount === 0 || totalRunnerCount === 0) {
      return [null, [], 0];
    }

    const dataList = dataIdentityList
      .map((v: MystIdentityModel) => MystIdentityAggregateRepository._mergeFileData(v, dataFileList))
      .filter((v) => v)
      .map((v: MystIdentityModel) => MystIdentityAggregateRepository._mergeRunnerData(v, dataRunnerList))
      .filter((v) => v);

    const [result, totalCount] = MystIdentityAggregateRepository._paginationData(dataList, filter);

    return [null, result, totalCount];
  }

  async getById(id: string): Promise<AsyncReturn<Error, MystIdentityModel | null>> {
    const [errorIdentity, dataIdentity] = await this._mystIdentityPgRepository.getById(id);
    if (errorIdentity) {
      return [errorIdentity];
    }
    if (!dataIdentity) {
      return [null, null];
    }

    const runnerFilter = new FilterModel<RunnerModel<VpnProviderModel>>({skipPagination: true});
    runnerFilter.addCondition({$opr: 'eq', label: {userIdentity: dataIdentity.identity}});

    const [
      [errorFile, dataFileList, totalFileCount],
      [errorRunner, dataRunnerList, totalRunnerCount],
    ] = await Promise.all([
      this._mystIdentityFileRepository.getAll(),
      this._dockerRunnerRepository.getAll(runnerFilter),
    ]);
    const fetchError = errorFile || errorRunner;
    if (fetchError) {
      return [fetchError];
    }
    if (totalFileCount === 0 || totalRunnerCount === 0) {
      return [null, null];
    }

    const dataList = [dataIdentity].map((v: MystIdentityModel) => MystIdentityAggregateRepository._mergeFileData(v, dataFileList))
      .filter((v) => v)
      .map((v: MystIdentityModel) => MystIdentityAggregateRepository._mergeRunnerData(v, dataRunnerList))
      .filter((v) => v);

    if (dataList.length === 0) {
      return [null, null];
    }

    return [null, dataList[0]];
  }

  // @todo: For sure container not exist should delete container before create new container if result of `totalIdentityCount` is equal zero
  async add(model: MystIdentityModel): Promise<AsyncReturn<Error, MystIdentityModel>> {
    const filter = new FilterModel<MystIdentityModel>();
    filter.addCondition({$opr: 'eq', identity: model.identity});

    const [errorIdentity, , totalIdentityCount] = await this.getAll(filter);
    if (errorIdentity) {
      return [errorIdentity];
    }
    if (totalIdentityCount > 0) {
      return [new ExistException()];
    }

    const [errorMovePath, dataMovePath] = await this._mystIdentityFileRepository.moveAndRenameFile(
      `${model.path}${model.filename}`,
      `${model.identity}.json`,
    );
    if (errorMovePath) {
      return [errorMovePath];
    }

    const [, identityPath, identityFilename] = /^(.+\/)(.+\..+)$/.exec(dataMovePath);

    const mystRunner = new RunnerModel<MystIdentityModel & VpnProviderModel>(<RunnerModel<MystIdentityModel & VpnProviderModel>>{
      id: model.id,
      serial: MystIdentityAggregateRepository.RUNNER_FAKE_SERIAL,
      name: `${RunnerServiceEnum.MYST}-${model.identity}`,
      service: RunnerServiceEnum.MYST,
      exec: RunnerExecEnum.DOCKER,
      socketType: RunnerSocketTypeEnum.HTTP,
      label: {
        $namespace: [VpnProviderModel.name, MystIdentityModel.name],
        userIdentity: model.identity,
        passphrase: model.passphrase,
        path: identityPath,
      },
      status: RunnerStatusEnum.CREATING,
      insertDate: new Date(),
    });
    const [errorCreateRunner] = await this._dockerRunnerRepository.create(mystRunner);
    if (errorCreateRunner) {
      return [errorCreateRunner];
    }

    const addMystIdentityModel = model.clone();
    addMystIdentityModel.path = identityPath;
    addMystIdentityModel.filename = identityFilename;

    return this._mystIdentityPgRepository.add(addMystIdentityModel);
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    const [errorFetch, dataFetch] = await this.getById(id);
    if (errorFetch) {
      return [errorFetch];
    }

    if (dataFetch) {
      return this._removeWhenIdentityExist(dataFetch);
    }

    const [errorDbIdentity, dataDbIdentity] = await this._mystIdentityPgRepository.getById(id);
    if (errorDbIdentity) {
      return [errorDbIdentity];
    }
    if (!dataDbIdentity) {
      return [null];
    }

    return this._removeWhenUncompletedDelete(dataDbIdentity);
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

    const runnerFilter = new FilterModel<RunnerModel>({skipPagination: true});

    return Promise.all([
      this._mystIdentityFileRepository.getAll(),
      this._mystIdentityPgRepository.getAll(identityFilter),
      this._dockerRunnerRepository.getAll(runnerFilter),
    ]);
  }

  private static _mergeFileData(identityData: MystIdentityModel, fileDataList: Array<string>): MystIdentityModel | null {
    const findFile = fileDataList.find((v) =>
      v.split(/\//g).slice(0, -1).join('/').replace(/(.+)\/$/g, '$1') === identityData.path.replace(/(.+)\/$/g, '$1'),
    );
    if (!findFile) {
      return null;
    }

    const lastPart = findFile.split(/\//g).splice(-1);
    if (lastPart.length === 0) {
      return null;
    }

    identityData.filename = lastPart[0];

    return identityData;
  }

  private static _mergeRunnerData(identityData: MystIdentityModel, runnerDataList: Array<RunnerModel<VpnProviderModel>>): MystIdentityModel {
    const identityRunnerList = runnerDataList.filter((v) => v.label.userIdentity === identityData.identity);
    if (identityRunnerList.length === 0) {
      return null;
    }

    const findMystRunner = identityRunnerList.find((v) => v.service === RunnerServiceEnum.MYST);
    if (!findMystRunner) {
      return null;
    }

    const findMystConnectRunner = identityRunnerList.find((v) => v.service === RunnerServiceEnum.MYST_CONNECT);
    if (findMystConnectRunner) {
      identityData.isUse = true;
    }

    return identityData;
  }

  private static _paginationData<F>(identityList: Array<MystIdentityModel>, filter?: F): [Array<MystIdentityModel>, number] {
    const filterModel = filter instanceof FilterModel
      ? <FilterModel<MystIdentityModel>><any>filter
      : new FilterModel<MystIdentityModel>();
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

  private async _removeWhenIdentityExist(mystIdentity): Promise<AsyncReturn<Error, null>> {
    const mystRunnerFilter = new FilterModel<RunnerModel<VpnProviderModel>>();
    mystRunnerFilter.addCondition({
      $opr: 'eq',
      service: RunnerServiceEnum.MYST,
    });
    mystRunnerFilter.addCondition({
      $opr: 'eq',
      label: {
        $namespace: VpnProviderModel.name,
        userIdentity: mystIdentity.identity,
      },
    });
    const [errorRunner, dataRunnerList] = await this._dockerRunnerRepository.getAll(mystRunnerFilter);
    if (errorRunner) {
      return [errorRunner];
    }

    const tasks = [];

    tasks.push(this._mystIdentityPgRepository.remove(mystIdentity.id));
    tasks.push(this._mystIdentityFileRepository.remove(`${mystIdentity.path}${mystIdentity.filename}`));
    tasks.push(this._dockerRunnerRepository.remove(dataRunnerList[0].id));

    const results = await Promise.all(tasks);
    for (const [taskError] of results) {
      if (taskError) {
        return [taskError];
      }
    }

    return [null];
  }

  private async _removeWhenUncompletedDelete(mystIdentity): Promise<AsyncReturn<Error, null>> {
    const [errorFile, dataFileList, totalFileCount] = await this._mystIdentityFileRepository.getAll();
    if (errorFile) {
      return [errorFile];
    }
    if (totalFileCount === 0) {
      return [null];
    }

    const mystIdentityFileAgg = MystIdentityAggregateRepository._mergeFileData(mystIdentity, dataFileList);
    if (!mystIdentityFileAgg) {
      return [null];
    }

    const runnerFilter = new FilterModel<RunnerModel>();
    runnerFilter.addCondition({
      $opr: 'eq',
      service: RunnerServiceEnum.MYST,
    });
    runnerFilter.addCondition({
      $opr: 'eq',
      volumes: [{source: mystIdentityFileAgg.path, dest: '-'}],
    });
    const [errorRunner, dataRunnerList, totalRunnerCount] = await this._dockerRunnerRepository.getAll(runnerFilter);
    if (errorRunner) {
      return [errorRunner];
    }
    if (totalRunnerCount > 0) {
      const tasks = [];
      for (let i = 0; i < dataRunnerList.length; i++) {
        tasks.push(this._dockerRunnerRepository.remove(dataRunnerList[i].id));
      }

      const taskResultList = await Promise.all(tasks);
      for (const [errorRemoveRunner] of taskResultList) {
        if (errorRemoveRunner) {
          return [errorRemoveRunner];
        }
      }
    }

    return this._mystIdentityFileRepository.remove(`${mystIdentityFileAgg.path}${mystIdentityFileAgg.filename}`);
  }
}