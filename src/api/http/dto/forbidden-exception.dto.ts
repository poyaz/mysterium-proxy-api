import {HttpStatus} from '@nestjs/common';
import {ApiResponseProperty} from '@nestjs/swagger';

export class ForbiddenExceptionDto {
  @ApiResponseProperty({type: Number, example: 403})
  statusCode?: number;

  @ApiResponseProperty({type: String, example: 'Forbidden resource'})
  message?: string;

  @ApiResponseProperty({type: String, example: 'Forbidden'})
  error?: string;
}
