import {CallHandler, ExecutionContext, Inject, Injectable, Logger, NestInterceptor} from '@nestjs/common';
import {Observable, tap} from 'rxjs';

@Injectable()
export class ExecuteDurationInterceptor implements NestInterceptor {
  constructor(
    @Inject(Logger)
    private readonly _logger: Logger,
  ) {
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();

    const method = request.method;
    const url = request.originalUrl;

    return next.handle().pipe(
      tap(() => {
        const delay = Date.now() - now;

        this._logger.log(`Execute time on {${url}, ${method}} is ${delay}ms`, 'Http');
      }),
    );
  }
}
