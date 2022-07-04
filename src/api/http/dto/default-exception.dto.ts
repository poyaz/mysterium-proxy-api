import {ApiResponseProperty} from '@nestjs/swagger';
import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class DefaultExceptionDto {
  @ApiResponseProperty({type: Number, example: 400})
  statusCode?: number;

  @ApiResponseProperty({type: String, example: 'Error message'})
  message?: string;

  @ApiResponseProperty({type: String, example: ExceptionEnum.UNKNOWN_ERROR})
  action?: string;

  @ApiResponseProperty({type: String})
  error?: string;
}
