import {Injectable} from '@nestjs/common';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {AsyncReturn} from '@src-core/utility';
import {IProviderProxyInterface} from '@src-core/interface/i-provider-proxy.interface';
import {IProxyServiceInterface} from '@src-core/interface/i-proxy-service.interface';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';

@Injectable()
export class MystProviderProxyService implements IProviderProxyInterface {
  constructor(
    private readonly _vpnProviderService: IProviderServiceInterface,
    private readonly _proxyService: IProxyServiceInterface,
  ) {
  }

  async create(model: ProxyUpstreamModel): Promise<AsyncReturn<Error, ProxyUpstreamModel>> {
    const [connectError] = await this._vpnProviderService.up(model.proxyDownstream[0].refId);
    if (connectError) {
      return [connectError];
    }

    return this._proxyService.create(model);
  }
}
