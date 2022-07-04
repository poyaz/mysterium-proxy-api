import {Injectable} from '@nestjs/common';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {UsersModel} from '@src-core/model/users.model';
import {UpdateModel} from '@src-core/model/update.model';
import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {NotFoundUserException} from '@src-core/exception/not-found-user.exception';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';

@Injectable()
export class UsersService implements IUsersServiceInterface {
  constructor(
    private readonly _userRepository: IGenericRepositoryInterface<UsersModel>,
  ) {
  }

  async create(model: UsersModel): Promise<AsyncReturn<Error, UsersModel>> {
    if (!(<keyof UsersModel>'role' in model)) {
      model.role = UserRoleEnum.USER;
    }
    if (!(<keyof UsersModel>'isEnable' in model)) {
      model.isEnable = true;
    }

    return this._userRepository.add(model);
  }

  async findAll(filter?: FilterModel<UsersModel>): Promise<AsyncReturn<Error, Array<UsersModel>>> {
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

  async update(model: UpdateModel<UsersModel>): Promise<AsyncReturn<Error, null>> {
    const [error] = await this.findOne(model.id);
    if (error) {
      return [error];
    }

    return this._userRepository.update(model);
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    const [error] = await this.findOne(id);
    if (error) {
      return [error];
    }

    return this._userRepository.remove(id);
  }
}
