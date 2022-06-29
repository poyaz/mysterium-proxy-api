import {ApiResponseProperty} from '@nestjs/swagger';

export class DefaultArraySuccessDto<T> {
  @ApiResponseProperty({type: Number, example: 1})
  count?: number;

  @ApiResponseProperty()
  data?: Array<T>;

  @ApiResponseProperty({type: String, example: 'success'})
  status?: string;
}
