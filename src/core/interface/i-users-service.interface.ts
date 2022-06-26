import {UsersModel} from '../model/users.model';
import {FilterModel} from '../model/filter.model';
import {UpdateModel} from '../model/update.model';
import {AsyncReturn} from '../utility';

export enum I_USER_SERVICE {
  DEFAULT = 'USERS_SERVICE_DEFAULT',
}

export interface IUsersServiceInterface {
  findAll(filter?: FilterModel<UsersModel>): Promise<AsyncReturn<Error, Array<UsersModel>>>;

  findOne(id: string): Promise<AsyncReturn<Error, UsersModel>>;

  create(model: UsersModel): Promise<AsyncReturn<Error, UsersModel>>;

  update(model: UpdateModel<UsersModel>): Promise<AsyncReturn<Error, null>>;

  remove(id: string): Promise<AsyncReturn<Error, null>>;
}
