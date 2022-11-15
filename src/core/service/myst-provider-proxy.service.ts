import {Injectable} from '@nestjs/common';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {AsyncReturn} from '@src-core/utility';
import {IProviderProxyInterface} from '@src-core/interface/i-provider-proxy.interface';
import {IProxyServiceInterface} from '@src-core/interface/i-proxy-service.interface';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {defaultModelFactory} from '@src-core/model/defaultModel';

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

  async down(id: string): Promise<AsyncReturn<Error, null>> {
    const proxyFilter = new FilterModel<ProxyUpstreamModel>();
    proxyFilter.addCondition({
      $opr: 'eq',
      proxyDownstream: [
        defaultModelFactory<ProxyDownstreamModel>(
          ProxyDownstreamModel,
          {
            id: 'default-id',
            refId: id,
            ip: 'default-ip',
            mask: 32,
            type: ProxyTypeEnum.MYST,
            status: ProxyStatusEnum.DISABLE,
          },
          ['id', 'ip', 'mask', 'type', 'status'],
        ),
      ],
    });
    const [proxyError, proxyDataList] = await this._proxyService.getAll(proxyFilter);
    if (proxyError) {
      return [proxyError];
    }

    const tasks = proxyDataList.map((v) => this._proxyService.remove(v.id));
    const removeResults = await Promise.all(tasks);
    for (const [removeProxy] of removeResults) {
      if (removeProxy) {
        return [removeProxy];
      }
    }

    return this._vpnProviderService.down(id);
  }
}
