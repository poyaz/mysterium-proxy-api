import {AsyncReturn} from '@src-core/utility';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';

export interface IUsersProxyServiceInterface {
  getByUserId(userId: string): Promise<AsyncReturn<Error, Array<UsersProxyModel>>>;
}
