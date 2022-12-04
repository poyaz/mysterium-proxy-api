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

        if (typeof data !== undefined && data !== undefined && data !== null) {
          if (Array.isArray(data)) {
            const result = data.map((v) => OutputAclInterceptor._toObj(v));

            return [null, result, count];
          }

          if (typeof data === 'object') {
            const result = OutputAclInterceptor._toObj(data);

            return [null, result];
          }
        }

        return [null];
      }),
    );
  }

  private static _toObj(data: ProxyAclModel): FindAclOutputDto {
    return {
      id: data.id,
      mode: data.mode,
      type: data.type,
      ...(data.user && {user: {id: data.user.id, username: data.user.username}}),
      proxies: data.proxies.map((proxy) => ({port: proxy.listenPort})).filter((proxy) => proxy && 'port' in proxy),
      insertDate: data.insertDate,
    };
  }
}
