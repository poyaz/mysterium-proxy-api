import {Injectable} from '@nestjs/common';
import {IProxyServiceInterface} from '@src-core/interface/i-proxy-service.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {AsyncReturn} from '@src-core/utility';
import {IProxyRepositoryInterface} from '@src-core/interface/i-proxy-repository.interface';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {ProviderIdentityNotConnectingException} from '@src-core/exception/provider-identity-not-connecting.exception';

@Injectable()
export class ProxyService implements IProxyServiceInterface {
  constructor(
    private readonly _proxyRepository: IProxyRepositoryInterface,
    private readonly _providerService: IProviderServiceInterface,
  ) {
  }

  async getAll(filter?: FilterModel<ProxyUpstreamModel>): Promise<AsyncReturn<Error, Array<ProxyUpstreamModel>>> {
    return this._proxyRepository.getAll(filter);
  }

  async create(model: ProxyUpstreamModel): Promise<AsyncReturn<Error, ProxyUpstreamModel>> {
    const providerId = model.proxyDownstream[0]?.refId;
    const [vpnProviderError, vpnProviderData] = await this._providerService.getById(providerId);
    if (vpnProviderError) {
      return [vpnProviderError];
    }
    if (!vpnProviderData) {
      return [new NotFoundException()];
    }
    if (!vpnProviderData.isRegister) {
      return [new ProviderIdentityNotConnectingException()];
    }

    return this._proxyRepository.create(model);
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    const [proxyError, proxyData] = await this._proxyRepository.getById(id);
    if (proxyError) {
      return [proxyError];
    }
    if (!proxyData) {
      return [new NotFoundException()];
    }

    return this._proxyRepository.remove(id);
  }
}
