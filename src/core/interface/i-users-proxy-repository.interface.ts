import {AsyncReturn} from '@src-core/utility';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';

export interface IUsersProxyRepositoryInterface {
  getByUserId(userId: string): Promise<AsyncReturn<Error, Array<UsersProxyModel>>>;
}
