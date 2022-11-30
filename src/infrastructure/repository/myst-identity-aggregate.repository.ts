import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {AsyncReturn} from '@src-core/utility';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {IAccountIdentityFileRepositoryInterface} from '@src-core/interface/i-account-identity-file-repository.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerObjectLabel,
  RunnerServiceEnum,
  RunnerServiceVolumeEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {ExistException} from '@src-core/exception/exist.exception';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {MystIdentityInUseException} from '@src-core/exception/myst-identity-in-use.exception';
import * as path from 'path';
import {checkPortInUse} from '@src-infrastructure/utility/utility';
import {setTimeout} from 'timers/promises';
import {UnknownException} from '@src-core/exception/unknown.exception';

export class MystIdentityAggregateRepository implements IGenericRepositoryInterface<MystIdentityModel> {
  private static RUNNER_FAKE_SERIAL = '0000000000000000000000000000000000000000000000000000000000000000';
  private readonly _maxPortRetry = 6;

  constructor(
    private readonly _mystIdentityFileRepository: IAccountIdentityFileRepositoryInterface,
    private readonly _mystIdentityPgRepository: IGenericRepositoryInterface<MystIdentityModel>,
    private readonly _dockerRunnerRepository: IRunnerRepositoryInterface,
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

    const runnerFilter = new FilterModel<RunnerModel<MystIdentityModel>>({skipPagination: true});
    runnerFilter.addCondition({
      $opr: 'eq',
      label: {
        $namespace: MystIdentityModel.name,
        identity: dataIdentity.identity,
      },
    });

    const [
      [errorFile, dataFile],
      [errorRunner, dataRunnerList, totalRunnerCount],
    ] = await Promise.all([
      this._mystIdentityFileRepository.getByDirPath(dataIdentity.path),
      this._dockerRunnerRepository.getAll(runnerFilter),
    ]);
    const fetchError = errorFile || errorRunner;
    if (fetchError) {
      return [fetchError];
    }
    if (!dataFile) {
      return [null, null];
    }
    if (totalRunnerCount === 0) {
      return [null, null];
    }

    const dataList = [dataIdentity].map((v: MystIdentityModel) => MystIdentityAggregateRepository._mergeFileData(v, [dataFile]))
      .filter((v) => v)
      .map((v: MystIdentityModel) => MystIdentityAggregateRepository._mergeRunnerData(v, dataRunnerList))
      .filter((v) => v);

    if (dataList.length === 0) {
      return [null, null];
    }

    return [null, dataList[0]];
  }

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

    const [errorFile, dataFile] = await this._mystIdentityFileRepository.getIdentityByFilePath(path.join(model.path, model.filename));
    if (errorFile) {
      return [errorFile];
    }

    model.identity = dataFile;
    const [errorMovePath, dataMovePath] = await this._mystIdentityFileRepository.moveAndRenameFile(
      path.join(model.path, model.filename),
      `${model.identity}.json`,
    );
    if (errorMovePath) {
      return [errorMovePath];
    }

    const [, identityPath, identityFilename] = /^(.+\/)(.+\..+)$/.exec(dataMovePath);

    const addMystIdentityModel = model.clone();
    addMystIdentityModel.path = identityPath;
    addMystIdentityModel.filename = identityFilename;

    const [errorAddIdentity, dataAddIdentity] = await this._addIdentity(addMystIdentityModel);
    if (errorAddIdentity) {
      return [errorAddIdentity];
    }

    const [errorCreateRunner, createRunnerData] = await this._createRunner(dataAddIdentity);
    if (errorCreateRunner) {
      return [errorCreateRunner];
    }

    await this._portIsAvailable(createRunnerData.socketUri, createRunnerData.socketPort);

    return [null, dataAddIdentity];
  }

  async addBulk(models: Array<MystIdentityModel>): Promise<AsyncReturn<Error, Array<MystIdentityModel>>> {
    return [new UnknownException()];
  }

  async update<F>(model: F): Promise<AsyncReturn<Error, null>> {
    return [null, null];
  }

  async updateBulk<F>(idList: Array<string>, model: F): Promise<AsyncReturn<Error, null>> {
    return [new UnknownException()];
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    const [errorFetch, dataFetch] = await this.getById(id);
    if (errorFetch) {
      return [errorFetch];
    }

    if (dataFetch) {
      if (dataFetch.isUse) {
        return [new MystIdentityInUseException()];
      }

      return this._removeWhenIdentityExist(dataFetch);
    }

    return this._removeWhenUncompletedDelete(id);
  }

  async removeBulk(idList: Array<string>): Promise<AsyncReturn<Error, null>> {
    return [new UnknownException()];
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
      this._dockerRunnerRepository.getAll<any>(runnerFilter),
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

  private static _mergeRunnerData(identityData: MystIdentityModel, runnerDataList: Array<RunnerModel<any>>): MystIdentityModel {
    const identityRunnerList = [];
    for (const runnerData of runnerDataList) {
      if (typeof runnerData.label === 'undefined') {
        continue;
      }

      const labelList = Array.isArray(runnerData.label) ? runnerData.label : [runnerData.label];

      for (const label of labelList) {
        switch ((<RunnerObjectLabel<any>>label).$namespace) {
          case MystIdentityModel.name:
            if ((<RunnerObjectLabel<MystIdentityModel>>label).identity === identityData.identity) {
              identityRunnerList.push(runnerData);
            }
            break;
          case VpnProviderModel.name:
            if ((<RunnerObjectLabel<VpnProviderModel>>label).userIdentity === identityData.identity) {
              identityRunnerList.push(runnerData);
            }
            break;
        }
      }
    }

    if (identityRunnerList.length === 0) {
      return null;
    }

    const findMystRunner = identityRunnerList.find((v) => v.service === RunnerServiceEnum.MYST);
    if (!findMystRunner) {
      return null;
    }
    if ((<RunnerModel>findMystRunner).status === RunnerStatusEnum.CREATING) {
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
      dataList = dataList.filter((v) => v.identity === getIdentity.identity);
    }

    const getIsUse = filterModel.getCondition('isUse');
    if (getIsUse) {
      dataList = dataList.filter((v) => v.isUse === getIsUse.isUse);
    }

    const pageNumber = filterModel.page;
    const pageSize = filterModel.limit;
    const resultPagination = dataList.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

    return [resultPagination, dataList.length];
  }

  private async _addIdentity(model: MystIdentityModel): Promise<AsyncReturn<Error, MystIdentityModel>> {
    const filterIdentity = new FilterModel<MystIdentityModel>();
    filterIdentity.addCondition({$opr: 'eq', identity: model.identity});

    const [errorIdentityList, dataIdentityList] = await this._mystIdentityPgRepository.getAll(filterIdentity);
    if (errorIdentityList) {
      return [errorIdentityList];
    }
    if (dataIdentityList.length > 0) {
      return [null, dataIdentityList[0]];
    }

    const [errorAdd, dataAdd] = await this._mystIdentityPgRepository.add(model);
    if (errorAdd) {
      if (!(errorAdd instanceof ExistException)) {
        return [errorAdd];
      }

      const [errorIdentityList, dataIdentityList] = await this._mystIdentityPgRepository.getAll(filterIdentity);
      if (errorIdentityList) {
        return [errorIdentityList];
      }
      if (dataIdentityList.length === 0) {
        return [new RepositoryException(new NotFoundException())];
      }

      return [null, dataIdentityList[0]];
    }

    return [null, dataAdd];
  }

  private async _createRunner(model: MystIdentityModel): Promise<AsyncReturn<Error, RunnerModel<MystIdentityModel>>> {
    const runnerFilter = new FilterModel<RunnerModel<MystIdentityModel>>();
    runnerFilter.addCondition({
      $opr: 'eq',
      service: RunnerServiceEnum.MYST,
    });
    runnerFilter.addCondition({
      $opr: 'eq',
      label: {
        $namespace: MystIdentityModel.name,
        identity: model.identity,
      },
    });
    const [errorRemoveRunner] = await this._removeRunnerList(runnerFilter);
    if (errorRemoveRunner) {
      return [errorRemoveRunner];
    }

    const mystRunner = new RunnerModel<MystIdentityModel>({
      id: model.id,
      serial: MystIdentityAggregateRepository.RUNNER_FAKE_SERIAL,
      name: `${RunnerServiceEnum.MYST}-${model.identity}`,
      service: RunnerServiceEnum.MYST,
      exec: RunnerExecEnum.DOCKER,
      socketType: RunnerSocketTypeEnum.HTTP,
      volumes: [{name: RunnerServiceVolumeEnum.MYST_KEYSTORE, source: model.path, dest: '-'}],
      status: RunnerStatusEnum.CREATING,
      insertDate: new Date(),
    });
    mystRunner.label = {
      $namespace: MystIdentityModel.name,
      id: model.id,
      identity: model.identity,
      passphrase: model.passphrase,
    };

    return this._dockerRunnerRepository.create(mystRunner);
  }

  private async _removeWhenIdentityExist(mystIdentity): Promise<AsyncReturn<Error, null>> {
    const mystRunnerFilter = new FilterModel<RunnerModel<MystIdentityModel>>();
    mystRunnerFilter.addCondition({
      $opr: 'eq',
      service: RunnerServiceEnum.MYST,
    });
    mystRunnerFilter.addCondition({
      $opr: 'eq',
      label: {
        $namespace: MystIdentityModel.name,
        identity: mystIdentity.identity,
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

  private async _removeWhenUncompletedDelete(id: string): Promise<AsyncReturn<Error, null>> {
    const [errorMystIdentity, dataMystIdentity] = await this._mystIdentityPgRepository.getById(id);
    if (errorMystIdentity) {
      return [errorMystIdentity];
    }

    let mystIdentityFilePath: string;
    if (dataMystIdentity) {
      mystIdentityFilePath = `${dataMystIdentity.path}${dataMystIdentity.filename}`;
    }

    const runnerFilter = new FilterModel<RunnerModel<VpnProviderModel>>();
    runnerFilter.addCondition({
      $opr: 'eq',
      service: RunnerServiceEnum.MYST,
    });
    runnerFilter.addCondition({
      $opr: 'eq',
      label: {
        $namespace: MystIdentityModel.name,
        id,
      },
    });
    const [errorRunner, dataRunnerList, totalRunnerCount] = await this._dockerRunnerRepository.getAll(runnerFilter);
    if (errorRunner) {
      return [errorRunner];
    }
    if (totalRunnerCount > 0) {
      const runnerIdentity = dataRunnerList[0];
      const [errorRemoveMystRunner] = await this._dockerRunnerRepository.remove(runnerIdentity.id);
      if (errorRemoveMystRunner) {
        return [errorRemoveMystRunner];
      }

      const findVolume = runnerIdentity.volumes.find((v) => v.name && v.name === RunnerServiceVolumeEnum.MYST_KEYSTORE);
      if (findVolume) {
        mystIdentityFilePath = findVolume.source;
      }
    }

    if (mystIdentityFilePath) {
      const [errorRemoveMystFile] = await this._mystIdentityFileRepository.remove(mystIdentityFilePath);
      if (errorRemoveMystFile) {
        return [errorRemoveMystFile];
      }
    }

    return [null];
  }

  private async _removeRunnerList(runnerFilter: FilterModel<RunnerModel>): Promise<AsyncReturn<Error, null>> {
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

    return [null];
  }

  private async _portIsAvailable(ip, port) {
    const totalTryList = new Array(this._maxPortRetry).fill(null);
    for await (const tryCount of totalTryList) {
      try {
        const isPortUp = await checkPortInUse(ip, port);
        if (isPortUp) {
          break;
        }
      } catch (e) {
      }

      await setTimeout(2000, 'resolved');
    }
  }
}
