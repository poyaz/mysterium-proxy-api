import {AsyncReturn} from '@src-core/utility';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {FilterModel} from '@src-core/model/filter.model';

export interface IProxyRepositoryInterface {
  getAll(filter?: FilterModel<ProxyUpstreamModel>): Promise<AsyncReturn<Error, Array<ProxyUpstreamModel>>>;

  getById(id: string): Promise<AsyncReturn<Error, ProxyUpstreamModel | null>>;

  create(model: ProxyUpstreamModel): Promise<AsyncReturn<Error, ProxyUpstreamModel>>;

  remove(id: string): Promise<AsyncReturn<Error, null>>;
}
