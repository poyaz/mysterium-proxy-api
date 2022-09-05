import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {map, Observable} from 'rxjs';
import {composeNode} from 'yaml/dist/compose/compose-node';

@Injectable()
export class RemoveSpecialFieldOfIdentityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(([err, result, count]) => {
        if (err) {
          return [err];
        }

        if (typeof result !== undefined && result !== undefined && result !== null) {
          if (Array.isArray(result)) {
            result.map((v) => {
              delete v.passphrase;
              delete v.path;
              delete v.filename;
            });
          } else if (typeof result === 'object') {
            delete result.passphrase;
            delete result.path;
            delete result.filename;
          }
        }

        return [null, result, count];
      }),
    );
  }
}
