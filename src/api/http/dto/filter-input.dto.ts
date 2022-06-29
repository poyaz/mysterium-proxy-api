import {ApiHideProperty, ApiProperty} from '@nestjs/swagger';
import {IsArray, IsInt, IsNumber, IsObject, IsOptional, IsString, Matches, Max, Min} from 'class-validator';
import {Transform} from 'class-transformer';
import objectContaining = jasmine.objectContaining;

export class FilterInputDto<T> {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  @Transform(({value}) => !isNaN(Number(value)) ? Number(value) : value)
  @ApiProperty({
    description: 'The page number of records',
    minimum: 1,
    maximum: 10000,
    exclusiveMaximum: true,
    exclusiveMinimum: true,
    format: 'int32',
    nullable: true,
    example: null,
    default: 1,
    required: false,
  })
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Transform(({value}) => !isNaN(Number(value)) ? Number(value) : value)
  @ApiProperty({
    description: 'The total item show per page',
    minimum: 1,
    maximum: 500,
    exclusiveMaximum: true,
    exclusiveMinimum: true,
    format: 'int32',
    nullable: true,
    example: null,
    default: 100,
    required: false,
  })
  limit?: number;

  @IsOptional()
  @IsObject()
  @ApiProperty({
    description: 'Sort by object key ASC or DESC',
    type: 'object',
    required: false,
  })
  sorts?: Record<keyof T, 'ass' | 'desc'>;

  @IsOptional()
  @IsObject()
  @ApiProperty({
    description: 'Filter query for fetch data',
    type: 'object',
    required: false,
  })
  filters?: Record<keyof T, any>;
}
