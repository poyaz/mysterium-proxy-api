import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {map, Observable} from 'rxjs';
import {Return} from '@src-core/utility';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {FindUsersProxyOutputDto} from '@src-api/http/controller/users-proxy/dto/find-users-proxy-output.dto';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';

type InputMapData = Return<Error, UsersProxyModel | Array<UsersProxyModel>>;
type OutputMapData = Return<Error, FindUsersProxyOutputDto | Array<FindUsersProxyOutputDto>>;

@Injectable()
export class OutputUsersProxyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map<InputMapData, OutputMapData>(([err, data, count]) => {
        if (err) {
          return [err];
        }

        if (typeof data !== undefined && data !== undefined && data !== null) {
          if (Array.isArray(data)) {
            const result = data.map((v) => OutputUsersProxyInterceptor._toObj(v));

            return [null, result, count];
          }

          if (typeof data === 'object') {
            const result = OutputUsersProxyInterceptor._toObj(data);

            return [null, result];
          }
        }

        return [null];
      }),
    );
  }

  private static _toObj(data: UsersProxyModel): FindUsersProxyOutputDto {
    const providerInfo = (<any>data.runner?.label).find((v) => v.$namespace === VpnProviderModel.name);

    return {
      id: data.id,
      userIdentity: providerInfo.userIdentity,
      providerIdentity: providerInfo.providerIdentity,
      listenAddr: data.listenAddr,
      listenPort: data.listenPort || 0,
      outgoingIp: data.proxyDownstream?.[0].ip,
      outgoingCountry: data.proxyDownstream?.[0].country,
      status: data.proxyDownstream?.[0].status,
      auth: {
        id: data.user.id,
        username: data.user.username,
        password: data.user.password,
      },
      insertDate: data.insertDate,
    };
  }
}
