import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {map, Observable} from 'rxjs';
import {ProxyDownstreamModel, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {FindProxyOutputDto} from '@src-api/http/controller/proxy/dto/find-proxy-output.dto';
import {Return} from '@src-core/utility';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';

type InputMapData = Return<Error, ProxyUpstreamModel | Array<ProxyUpstreamModel>>;
type OutputMapData = Return<Error, FindProxyOutputDto | Array<FindProxyOutputDto>>;

@Injectable()
export class OutputProxyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map<InputMapData, OutputMapData>(([err, data, count]) => {
        if (err) {
          return [err];
        }

        if (typeof data !== undefined && data !== undefined && data !== null) {
          if (Array.isArray(data)) {
            const result = data.map((v) => OutputProxyInterceptor._toObj(v));

            return [null, result, count];
          }

          if (typeof data === 'object') {
            const result = OutputProxyInterceptor._toObj(data);

            return [null, result];
          }
        }

        return [null];
      }),
    );
  }

  private static _toObj(data: ProxyUpstreamModel): FindProxyOutputDto {
    const providerInfo = (<any>data.runner?.label).find((v) => v.$namespace === VpnProviderModel.name);

    return {
      id: data.id,
      identityId: (<any>data.runner?.label).find((v) => v.$namespace === MystIdentityModel.name)?.id,
      userIdentity: providerInfo.userIdentity,
      providerId: providerInfo.id,
      providerIdentity: providerInfo.providerIdentity,
      listenAddr: data.listenAddr,
      listenPort: data.listenPort || 0,
      outgoingIp: data.proxyDownstream?.[0].ip,
      outgoingCountry: data.proxyDownstream?.[0].country,
      status: data.proxyDownstream?.[0].status,
      insertDate: data.insertDate,
    };
  }
}
