import {ApiProperty} from '@nestjs/swagger';
import {ArrayMaxSize, ArrayNotEmpty, IsArray, IsDefined, IsUUID, Max} from 'class-validator';

export class DeleteUsersFavoritesBulkInputDto {
  @ApiProperty({
    description: 'List of proxy with each proxy ID',
    type: String,
    format: 'uuid',
    isArray: true,
    minItems: 1,
    maxItems: 100,
    example: ['00000000-0000-0000-0000-000000000000'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('all', {each: true})
  @IsDefined()
  proxiesList: Array<string>;
}
