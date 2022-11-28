import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {map, Observable} from 'rxjs';
import {Return} from '@src-core/utility';
import {FindAclOutputDto} from '@src-api/http/controller/acl/dto/find-acl-output.dto';
import {ProxyAclModel} from '@src-core/model/proxyAclModel';

type InputMapData = Return<Error, ProxyAclModel | Array<ProxyAclModel>>;
type OutputMapData = Return<Error, FindAclOutputDto | Array<FindAclOutputDto>>;

@Injectable()
export class OutputAclInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map<InputMapData, OutputMapData>(([err, data, count]) => {
        if (err) {
          return [err];
        }

        let result: FindAclOutputDto | Array<FindAclOutputDto>;

        if (typeof data !== undefined && data !== undefined && data !== null) {
          if (Array.isArray(data)) {
            result = data.map<FindAclOutputDto>((v: ProxyAclModel) => ({
              id: v.id,
              mode: v.mode,
              type: v.type,
             ...(v.user && {user: {id: v.user.id, username: v.user.username}}),
              proxies: v.proxies.map((d) => ({port: d.listenPort})).filter((d) => d && 'port' in d),
            }));

            return [null, result, count];
          }

          if (typeof data === 'object') {
            result = {
              id: data.id,
              mode: data.mode,
              type: data.type,
              ...(data.user && {user: {id: data.user.id, username: data.user.username}}),
              proxies: data.proxies.map((d) => ({port: d.listenPort})).filter((d) => d && 'port' in d),
            };

            return [null, result];
          }
        }

        return [null];
      }),
    );
  }
}
