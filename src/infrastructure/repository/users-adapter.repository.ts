import {Injectable} from '@nestjs/common';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {UsersModel} from '@src-core/model/users.model';
import {IUsersHtpasswdFileInterface} from '@src-core/interface/i-users-htpasswd-file.interface';
import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {ExistException} from '@src-core/exception/exist.exception';
import {UpdateModel} from '@src-core/model/update.model';

@Injectable()
export class UsersAdapterRepository implements IGenericRepositoryInterface<UsersModel> {
  constructor(
    private readonly _usersPgRepository: IGenericRepositoryInterface<UsersModel>,
    private readonly _usersSquidFileRepository: IUsersHtpasswdFileInterface) {
  }

  async add(model: UsersModel): Promise<AsyncReturn<Error, UsersModel>> {
    const filterFindUser = new FilterModel<UsersModel>();
    filterFindUser.addCondition({username: model.username, $opr: 'eq'});

    const [
      [fetchError, fetchDataList],
      [checkProxyExistError, checkProxyExistData],
    ] = await Promise.all([
      this._usersPgRepository.getAll<FilterModel<UsersModel>>(filterFindUser),
      this._usersSquidFileRepository.isUserExist(model.username),
    ]);

    if (fetchError) {
      return [fetchError];
    }
    if (checkProxyExistError) {
      return [checkProxyExistError];
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

    const [addProxyError] = await this._usersSquidFileRepository.add(model.username, model.password);
    if (addProxyError) {
      return [addProxyError];
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
    return this._usersPgRepository.remove(id);
  }

  async update<F>(model: F): Promise<AsyncReturn<Error, null>> {
    return this._usersPgRepository.update(model);
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
}
