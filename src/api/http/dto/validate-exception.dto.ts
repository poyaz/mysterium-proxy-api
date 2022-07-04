import {ApiResponseProperty} from '@nestjs/swagger';

export class ValidateExceptionDto {
  @ApiResponseProperty({type: Number, example: 422})
  statusCode?: number;

  @ApiResponseProperty({type: [String]})
  message?: Array<string>;

  @ApiResponseProperty({type: String, example: 'Unprocessable Entity'})
  error?: string;
}
