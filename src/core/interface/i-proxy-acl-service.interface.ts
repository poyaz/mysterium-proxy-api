import {FilterModel} from '@src-core/model/filter.model';
import {ProxyAclModel} from '@src-core/model/proxyAclModel';
import {AsyncReturn} from '@src-core/utility';

export interface IProxyAclServiceInterface {
  getAll(filter?: FilterModel<ProxyAclModel>): Promise<AsyncReturn<Error, Array<ProxyAclModel>>>;

  create(model: ProxyAclModel): Promise<AsyncReturn<Error, ProxyAclModel>>;

  remove(id: string): Promise<AsyncReturn<Error, null>>;
}
