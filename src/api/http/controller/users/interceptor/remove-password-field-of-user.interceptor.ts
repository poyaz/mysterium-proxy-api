import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {map, Observable} from 'rxjs';

@Injectable()
export class RemovePasswordFieldOfUserInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(([err, result, count]) => {
        if (err) {
          return [err];
        }

        if (typeof result !== undefined && result !== undefined && result !== null) {
          if (Array.isArray(result)) {
            result.map((v) => {
              delete v.password;
            });
          } else {
            delete result.password;
          }
        }

        return [null, result, count];
      }),
    );
  }
}
