import {FilterModel} from '@src-core/model/filter.model';
import {AsyncReturn} from '@src-core/utility';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';

export interface IProxyServiceInterface {
  getAll(filter?: FilterModel<ProxyUpstreamModel>): Promise<AsyncReturn<Error, Array<ProxyUpstreamModel>>>;

  create(model: ProxyUpstreamModel): Promise<AsyncReturn<Error, ProxyUpstreamModel>>;

  remove(id: string): Promise<AsyncReturn<Error, null>>;
}
