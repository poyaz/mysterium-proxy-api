import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import {map, Observable} from 'rxjs';
import {ExceptionEnum} from '../../../core/enum/exception.enum';
import {I_DATE_TIME} from '../../../core/interface/i-date-time.interface';

@Injectable()
export class OutputTransferInterceptor implements NestInterceptor {
  constructor(
    @Inject(I_DATE_TIME.DEFAULT)
    private readonly _dateTime,
  ) {
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(([err, result]) => {
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
            case ExceptionEnum.MODEL_ID_NOT_EXIST_ERROR:
              statusCode = HttpStatus.NOT_FOUND;
              error = 'Not Found';
              break;
            case ExceptionEnum.AUTHENTICATE_ERROR:
              statusCode = HttpStatus.UNAUTHORIZED;
              error = 'Unauthorized';
              break;
            default:
              statusCode = HttpStatus.BAD_REQUEST;
              error = 'Bad Request';
          }

          throw new HttpException({
            status: statusCode,
            message: err.message,
            action: err.name,
            error,
          }, statusCode);
        }

        if (typeof result !== undefined && result !== undefined && result !== null && ['boolean', 'string', 'number'].indexOf(typeof result) === -1) {
          if (Array.isArray(result)) {
            result.map((v) => {
              v.insertDate = this._convertDateToString(v.insertDate);
              v.updateDate = this._convertDateToString(v.updateDate);
            });
          } else {
            result.insertDate = this._convertDateToString(result.insertDate);
            result.updateDate = this._convertDateToString(result.updateDate);
          }
        }

        return {
          data: result,
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
