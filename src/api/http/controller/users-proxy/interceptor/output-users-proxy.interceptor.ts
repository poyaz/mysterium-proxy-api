import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {map, Observable} from 'rxjs';
import {Return} from '@src-core/utility';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {FindUsersProxyOutputDto} from '@src-api/http/controller/users-proxy/dto/find-users-proxy-output.dto';

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

        let result: FindUsersProxyOutputDto | Array<FindUsersProxyOutputDto>;

        if (typeof data !== undefined && data !== undefined && data !== null) {
          if (Array.isArray(data)) {
            result = data.map<FindUsersProxyOutputDto>((v: UsersProxyModel) => ({
              id: v.id,
              listenAddr: v.listenAddr,
              listenPort: v.listenPort || 0,
              outgoingIp: v.proxyDownstream?.[0].ip,
              outgoingCountry: v.proxyDownstream?.[0].country,
              status: v.proxyDownstream?.[0].status,
              auth: {
                id: v.user.id,
                username: v.user.username,
                password: v.user.password,
              },
            }));

            return [null, result, count];
          }

          if (typeof data === 'object') {
            result = {
              id: data.id,
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
            };

            return [null, result];
          }
        }

        return [null];
      }),
    );
  }
}
