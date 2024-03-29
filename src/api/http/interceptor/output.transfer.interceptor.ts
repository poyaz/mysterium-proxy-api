import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable, Logger,
  NestInterceptor,
} from '@nestjs/common';
import {map, Observable} from 'rxjs';
import {ExceptionEnum} from '@src-core/enum/exception.enum';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {PinoLogger} from 'nestjs-pino';

@Injectable()
export class OutputTransferInterceptor implements NestInterceptor {
  constructor(
    @Inject(ProviderTokenEnum.DATE_TIME_DEFAULT)
    private readonly _dateTime,
    @Inject(PinoLogger)
    private readonly _logger: PinoLogger,
  ) {
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(([err, result, count]) => {
        if (err) {
          let statusCode: number;
          let error: string;

          switch (err.name) {
            case ExceptionEnum.UNKNOWN_ERROR:
              statusCode = HttpStatus.BAD_REQUEST;
              error = 'Bad Request';
              break;
            case ExceptionEnum.NOT_FOUND_ERROR:
            case ExceptionEnum.NOT_FOUND_USER_ERROR:
            case ExceptionEnum.NOT_FOUND_MYST_IDENTITY_ERROR:
            case ExceptionEnum.MODEL_ID_NOT_EXIST_ERROR:
              statusCode = HttpStatus.NOT_FOUND;
              error = 'Not Found';
              break;
            case ExceptionEnum.AUTHENTICATE_ERROR:
            case ExceptionEnum.PASSWORD_MISMATCH:
              statusCode = HttpStatus.UNAUTHORIZED;
              error = 'Unauthorized';
              break;
            default:
              statusCode = HttpStatus.BAD_REQUEST;
              error = 'Bad Request';
          }

          if (!err.isOperation) {
            this._logger.error(err);
          }

          throw new HttpException({
            statusCode: statusCode,
            message: err.message,
            action: err.name,
            error,
          }, statusCode);
        }

        const request = context.switchToHttp().getRequest();
        if (request.method === 'DELETE') {
          return '';
        }

        let isDataArray = false;
        let isResultFind = false;
        if (typeof result !== undefined && result !== undefined && result !== null) {
          isResultFind = true;

          if (['boolean', 'string', 'number'].indexOf(typeof result) === -1) {
            if (Array.isArray(result)) {
              isDataArray = true;
              result.map((v) => {
                v.insertDate = this._convertDateToString(v.insertDate);
                v.updateDate = this._convertDateToString(v.updateDate);

                delete v['IS_DEFAULT_MODEL'];
                delete v['_defaultProperties'];
              });
            } else {
              result.insertDate = this._convertDateToString(result.insertDate);
              result.updateDate = this._convertDateToString(result.updateDate);

              delete result['IS_DEFAULT_MODEL'];
              delete result['_defaultProperties'];
            }
          }
        }

        return {
          ...(isDataArray && count !== undefined && count !== null && !isNaN(Number(count)) && {count: Number(count)}),
          ...(isResultFind && {data: result}),
          status: 'success',
        };
      }),
    );
  }

  private _convertDateToString(date) {
    if (!date) {
      return null;
    }

    return this._dateTime.gregorianWithTimezoneString(date);
  }
}
