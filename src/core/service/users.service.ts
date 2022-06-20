import {Inject, Injectable} from '@nestjs/common';
import {IUsersService} from '../interface/i-users-service.interface';
import {UsersModel} from '../model/users.model';
import {UpdateModel} from '../model/update.model';
import {AsyncReturn} from '../utility';
import {FilterModel} from '../model/filter.model';
import {IGenericRepositoryInterface} from '../interface/i-generic-repository.interface';
import {InterfaceRepositoryEnum} from '../enum/interface-repository.enum';

@Injectable()
export class UsersService implements IUsersService {
  constructor(
    @Inject(InterfaceRepositoryEnum.USER_PG_REPOSITORY)
    private readonly _userRepository: IGenericRepositoryInterface<UsersModel>,
  ) {
  }

  async create(model: UsersModel): Promise<AsyncReturn<Error, UsersModel>> {
    return this._userRepository.add(model);
  }

  findAll(filter?: FilterModel): Promise<AsyncReturn<Error, Array<UsersModel>>> {
    return this._userRepository.getAll(filter);
  }

  findOne(id: string): Promise<AsyncReturn<Error, UsersModel>> {
    return Promise.resolve(undefined);
  }

  update(model: UpdateModel<UsersModel>): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }
}
