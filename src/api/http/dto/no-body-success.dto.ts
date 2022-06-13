import {ApiResponseProperty} from '@nestjs/swagger';

export class NoBodySuccessDto {
  @ApiResponseProperty({type: String, example: 'success'})
  status: string;
}
