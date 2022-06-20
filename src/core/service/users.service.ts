import {Inject, Injectable} from '@nestjs/common';
import {IUsersService} from '../interface/i-users-service.interface';
import {UsersModel} from '../model/users.model';
import {UpdateModel} from '../model/update.model';
import {AsyncReturn} from '../utility';
import {FilterModel} from '../model/filter.model';
import {IGenericRepositoryInterface} from '../interface/i-generic-repository.interface';
import {InterfaceRepositoryEnum} from '../enum/interface-repository.enum';
import {createEvalAwarePartialHost} from 'ts-node/dist/repl';
import {NotFoundUserException} from '../exception/not-found-user.exception';

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

  async findAll(filter?: FilterModel): Promise<AsyncReturn<Error, Array<UsersModel>>> {
    return this._userRepository.getAll(filter);
  }

  async findOne(id: string): Promise<AsyncReturn<Error, UsersModel>> {
    const [error, data] = await this._userRepository.getById(id);
    if (error) {
      return [error];
    }
    if (!data) {
      return [new NotFoundUserException()];
    }

    return [null, data];
  }

  update(model: UpdateModel<UsersModel>): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }
}
