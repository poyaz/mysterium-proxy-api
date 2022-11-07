import {ApiProperty} from '@nestjs/swagger';
import {IsNumber, IsOptional, IsString, Max, Min} from 'class-validator';

export class CreateProxyInputDto {
  @ApiProperty({
    description: 'The ip or hostname of upstream proxy (Default use outgoing server ip)',
    type: String,
    required: false,
    example: 'proxy.example.com',
  })
  @IsOptional()
  @IsString()
  listenAddr?: string;

  @ApiProperty({
    description: 'The port of upstream proxy',
    type: Number,
    minimum: 1000,
    maximum: 100000,
    exclusiveMaximum: true,
    exclusiveMinimum: true,
    required: false,
    example: 3128,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(100000)
  listenPort?: number;
}
