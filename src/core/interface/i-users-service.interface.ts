import {UsersModel} from '../model/users-model';

export enum I_USER_SERVICE {
  DEFAULT = 'USERS_SERVICE_DEFAULT',
}

export interface IUsersService {
  findAll(): Promise<(Error | Array<UsersModel>)[]>;

  findOne(id: string): Promise<(Error | UsersModel)[]>;

  create(model: UsersModel): Promise<(Error | UsersModel)[]>;

  update(model: UsersModel): Promise<(Error)[]>;

  remove(id: string): Promise<(Error)[]>;
}
