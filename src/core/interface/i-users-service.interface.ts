import {UsersModel} from '../model/users.model';
import {FilterModel} from '../model/filter.model';

export enum I_USER_SERVICE {
  DEFAULT = 'USERS_SERVICE_DEFAULT',
}

export interface IUsersService {
  findAll(filter?: FilterModel): Promise<(Error | Array<UsersModel>)[]>;

  findOne(id: string): Promise<(Error | UsersModel)[]>;

  create(model: UsersModel): Promise<(Error | UsersModel)[]>;

  update(model: UsersModel): Promise<(Error)[]>;

  remove(id: string): Promise<(Error)[]>;
}
