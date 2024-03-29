import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {map, Observable} from 'rxjs';

@Injectable()
export class RemoveSpecialFieldOfProviderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(([err, result, count]) => {
        if (err) {
          return [err];
        }

        if (typeof result !== undefined && result !== undefined && result !== null) {
          if (Array.isArray(result)) {
            result.map((v) => {
              delete v.providerName;
              delete v.runner;
            });
          } else if (typeof result === 'object') {
            delete result.providerName;
            delete result.runner;
          }
        }

        return [null, result, count];
      }),
    );
  }
}
