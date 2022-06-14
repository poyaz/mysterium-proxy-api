import {ApiResponseProperty} from '@nestjs/swagger';

export class DefaultSuccessDto<T> {
  @ApiResponseProperty()
  data?: T;

  @ApiResponseProperty({type: String, example: 'success'})
  status?: string;
}
