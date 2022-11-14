import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {map, Observable} from 'rxjs';
import {ProxyDownstreamModel, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {FindProxyOutputDto} from '@src-api/http/controller/proxy/dto/find-proxy-output.dto';
import {Return} from '@src-core/utility';

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

        let result: FindProxyOutputDto | Array<FindProxyOutputDto>;

        if (typeof data !== undefined && data !== undefined && data !== null) {
          if (Array.isArray(data)) {
            result = data.map<FindProxyOutputDto>((v: ProxyUpstreamModel) => ({
              id: v.id,
              identityId: (<any>v.proxyDownstream?.[0].runner?.label || []).find((v) => v.$namespace === MystIdentityModel.name)?.id,
              providerId: v.proxyDownstream?.[0].refId,
              listenAddr: v.listenAddr,
              listenPort: v.listenPort || 0,
              outgoingIp: v.proxyDownstream?.[0].ip,
              status: v.proxyDownstream?.[0].status,
            }));

            return [null, result, count];
          }

          if (typeof data === 'object') {
            result = {
              id: data.id,
              identityId: (<any>data.proxyDownstream?.[0].runner?.label)?.id,
              providerId: data.proxyDownstream?.[0].refId,
              listenAddr: data.listenAddr,
              listenPort: data.listenPort || 0,
              outgoingIp: data.proxyDownstream?.[0].ip,
              status: data.proxyDownstream?.[0].status,
            };

            return [null, result];
          }
        }

        return [null];
      }),
    );
  }
}
