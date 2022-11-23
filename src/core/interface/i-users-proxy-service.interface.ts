import {AsyncReturn} from '@src-core/utility';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {FilterModel} from '@src-core/model/filter.model';

export interface IUsersProxyServiceInterface {
  getByUserId(userId: string, filter?: FilterModel<UsersProxyModel>): Promise<AsyncReturn<Error, Array<UsersProxyModel>>>;
}
