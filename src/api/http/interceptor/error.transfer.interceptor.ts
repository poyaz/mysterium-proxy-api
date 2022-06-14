import {CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, NestInterceptor} from '@nestjs/common';
import {map, Observable} from 'rxjs';
import {ExceptionEnum} from '../../../core/enum/exception.enum';

@Injectable()
export class ErrorTransferInterceptor implements NestInterceptor {
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
            case ExceptionEnum.MODEL_ID_NOT_EXIST_ERROR:
              statusCode = HttpStatus.NOT_FOUND;
              error = 'Not Found';
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

        return {
          data: result,
          status: 'success',
        };
      }),
    );
  }
}
