import {ApiProperty} from '@nestjs/swagger';
import {ArrayNotEmpty, IsArray, IsDefined, IsUUID} from 'class-validator';

export class DeleteUsersFavoritesBulkInputDto {
  @ApiProperty({
    description: 'List of proxy with each proxy ID',
    type: String,
    format: 'uuid',
    isArray: true,
    minItems: 1,
    example: ['00000000-0000-0000-0000-000000000000'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', {each: true})
  @IsDefined()
  bulk: Array<string>;
}
