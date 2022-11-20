import {Injectable} from '@nestjs/common';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {UsersModel} from '@src-core/model/users.model';
import {IUsersHtpasswdFileInterface} from '@src-core/interface/i-users-htpasswd-file.interface';
import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {ExistException} from '@src-core/exception/exist.exception';
import {UpdateModel} from '@src-core/model/update.model';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {RunnerModel, RunnerServiceEnum} from '@src-core/model/runner.model';

@Injectable()
export class UsersAdapterRepository implements IGenericRepositoryInterface<UsersModel> {
  constructor(
    private readonly _usersPgRepository: IGenericRepositoryInterface<UsersModel>,
    private readonly _usersHtpasswdFileRepository: IUsersHtpasswdFileInterface,
    private readonly _runnerRepository: IRunnerRepositoryInterface,
  ) {
  }

  async add(model: UsersModel): Promise<AsyncReturn<Error, UsersModel>> {
    const findUserFilter = new FilterModel<UsersModel>();
    findUserFilter.addCondition({username: model.username, $opr: 'eq'});

    const [
      [fetchError, fetchDataList],
      [checkProxyExistError, checkProxyExistData],
      [runnerError, runnerId],
    ] = await Promise.all([
      this._usersPgRepository.getAll<FilterModel<UsersModel>>(findUserFilter),
      this._usersHtpasswdFileRepository.isUserExist(model.username),
      this._getRunner(),
    ]);
    const error = fetchError || checkProxyExistError || runnerError;
    if (error) {
      return [error];
    }

    if (fetchDataList.length > 0 && checkProxyExistData) {
      return [new ExistException()];
    }

    let output: UsersModel;
    if (fetchDataList.length > 0) {
      output = fetchDataList[0];

      const updateModel = new UpdateModel<UsersModel>(output.id, model);
      const [updateError] = await this._usersPgRepository.update(updateModel);
      if (updateError) {
        return [updateError];
      }
    } else {
      const [addError, addData] = await this._upsertUser(model);
      if (addError) {
        return [addError];
      }

      output = addData;
    }

    const [addProxyError] = await this._usersHtpasswdFileRepository.add(model.username, model.password);
    if (addProxyError) {
      return [addProxyError];
    }

    if (runnerId) {
      await this._runnerRepository.reload(runnerId);
    }

    return [null, output];
  }

  async getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<UsersModel>>> {
    return this._usersPgRepository.getAll(filter);
  }

  async getById(id: string): Promise<AsyncReturn<Error, UsersModel | null>> {
    return this._usersPgRepository.getById(id);
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    const [
      [runnerError, runnerId],
      [userError, userData],
    ] = await Promise.all([
      this._getRunner(),
      this._usersPgRepository.getById(id),
    ]);
    const error = runnerError || userError;
    if (error) {
      return [error];
    }

    const [removeDbError, removeResult] = await this._usersPgRepository.remove(id);
    if (removeDbError) {
      return [removeDbError];
    }

    if (userData) {
      const [removeFileError] = await this._usersHtpasswdFileRepository.remove(userData.username);
      if (removeFileError) {
        return [removeFileError];
      }
    }

    if (runnerId) {
      await this._runnerRepository.reload(runnerId);
    }

    return [null, removeResult];
  }

  async update<F>(model: F): Promise<AsyncReturn<Error, null>> {
    const [
      [runnerError, runnerId],
      [userError, userData],
    ] = await Promise.all([
      this._getRunner(),
      this._usersPgRepository.getById((<UpdateModel<UsersModel>><unknown>model).id),
    ]);
    const error = runnerError || userError;
    if (error) {
      return [error];
    }

    const [updateDbError, updateResult] = await this._usersPgRepository.update(model);
    if (updateDbError) {
      return [updateDbError];
    }

    if (userData) {
      const [updateFileError] = await this._usersHtpasswdFileRepository.update(userData.username, userData.password);
      if (updateFileError) {
        return [updateFileError];
      }
    }

    if (runnerId) {
      await this._runnerRepository.reload(runnerId);
    }

    return [null, updateResult];
  }

  private async _upsertUser(model: UsersModel): Promise<AsyncReturn<Error, UsersModel>> {
    const [addError, addData] = await this._usersPgRepository.add(model);
    if (!addError) {
      return [null, addData];

    }
    if (!(addError instanceof ExistException)) {
      return [addError];
    }

    const filterFindUser = new FilterModel<UsersModel>();
    filterFindUser.addCondition({username: model.username, $opr: 'eq'});

    const [fetchError, fetchDataList] = await this._usersPgRepository.getAll<FilterModel<UsersModel>>(filterFindUser);
    if (fetchError) {
      return [fetchError];
    }

    const updateModel = new UpdateModel<UsersModel>(fetchDataList[0].id, model);
    const [updateError] = await this._usersPgRepository.update(updateModel);
    if (updateError) {
      return [updateError];
    }

    return [null, fetchDataList[0]];
  }

  private async _getRunner(): Promise<AsyncReturn<Error, string | null>> {
    const runnerFilter = new FilterModel<RunnerModel>();
    runnerFilter.addCondition({$opr: 'eq', service: RunnerServiceEnum.NGINX});

    const [runnerError, runnerList] = await this._runnerRepository.getAll(runnerFilter);
    if (runnerError) {
      return [runnerError];
    }

    if (runnerList.length !== 1) {
      return [null, null];
    }

    return [null, runnerList[0].id];
  }
}
