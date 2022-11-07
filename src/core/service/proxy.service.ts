import {Injectable} from '@nestjs/common';
import {IProxyServiceInterface} from '@src-core/interface/i-proxy-service.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {AsyncReturn} from '@src-core/utility';
import {IProxyRepositoryInterface} from '@src-core/interface/i-proxy-repository.interface';

@Injectable()
export class ProxyService implements IProxyServiceInterface {
  constructor(private readonly _proxyRepository: IProxyRepositoryInterface) {
  }

  async getAll(filter?: FilterModel<ProxyUpstreamModel>): Promise<AsyncReturn<Error, Array<ProxyUpstreamModel>>> {
    return this._proxyRepository.getAll(filter);
  }

  create(model: ProxyUpstreamModel): Promise<AsyncReturn<Error, ProxyUpstreamModel>> {
    return Promise.resolve(undefined);
  }

  remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }
}
