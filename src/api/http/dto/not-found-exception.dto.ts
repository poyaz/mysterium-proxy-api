import {ApiResponseProperty} from '@nestjs/swagger';
import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class NotFoundExceptionDto {
  @ApiResponseProperty({type: Number, example: 404})
  statusCode?: number;

  @ApiResponseProperty({type: String, example: 'Not Found'})
  message?: string;

  @ApiResponseProperty({type: String, example: ExceptionEnum.NOT_FOUND_ERROR})
  action?: string;

  @ApiResponseProperty({type: String})
  error?: string;
}
