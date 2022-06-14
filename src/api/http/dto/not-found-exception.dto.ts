import {ApiResponseProperty} from '@nestjs/swagger';

export class NotFoundExceptionDto {
  @ApiResponseProperty({type: Number, example: 404})
  statusCode?: number;

  @ApiResponseProperty({type: String, example: 'Not Found'})
  message?: string;
}
