import {UsersModel} from '@src-core/model/users.model';
import {FilterModel} from '@src-core/model/filter.model';
import {UpdateModel} from '@src-core/model/update.model';
import {AsyncReturn} from '@src-core/utility';

export interface IUsersServiceInterface {
  findAll(filter?: FilterModel<UsersModel>): Promise<AsyncReturn<Error, Array<UsersModel>>>;

  findOne(id: string): Promise<AsyncReturn<Error, UsersModel>>;

  create(model: UsersModel): Promise<AsyncReturn<Error, UsersModel>>;

  update(model: UpdateModel<UsersModel>): Promise<AsyncReturn<Error, null>>;

  remove(id: string): Promise<AsyncReturn<Error, null>>;
}
