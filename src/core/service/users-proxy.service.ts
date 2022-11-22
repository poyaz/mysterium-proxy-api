import {Injectable} from '@nestjs/common';
import {IUsersProxyServiceInterface} from '@src-core/interface/i-users-proxy-service.interface';
import {AsyncReturn} from '@src-core/utility';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {IUsersProxyRepositoryInterface} from '@src-core/interface/i-users-proxy-repository.interface';

@Injectable()
export class UsersProxyService implements IUsersProxyServiceInterface {
  constructor(private readonly _usersProxyRepository: IUsersProxyRepositoryInterface) {
  }

  async getByUserId(userId: string): Promise<AsyncReturn<Error, Array<UsersProxyModel>>> {
    return this._usersProxyRepository.getByUserId(userId);
  }
}
