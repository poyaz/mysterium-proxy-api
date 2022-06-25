import {ApiProperty} from '@nestjs/swagger';

export class DateOutputDto {
  @ApiProperty({
    description: 'The entity has been created',
    required: false,
    readOnly: true,
    type: String,
    format: 'date-time',
    example: '2022-01-01 00:00:00',
  })
  insertDate: string;

  @ApiProperty({
    description: 'The entity has been updated (Can be null)',
    required: false,
    readOnly: true,
    type: String,
    format: 'date-time',
    example: null,
  })
  updateDate?: string;
}
