import {ApiProperty} from '@nestjs/swagger';
import {IsNumber, IsOptional, IsString, Max, Min} from 'class-validator';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {defaultModelFactory} from '@src-core/model/defaultModel';

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

  static toModel(dto: CreateProxyInputDto): ProxyUpstreamModel {
    const defaultProperties: Array<keyof ProxyUpstreamModel> = ['id', 'proxyDownstream', 'insertDate'];
    const obj: Pick<ProxyUpstreamModel, 'listenAddr' | 'listenPort'> = {
      listenAddr: 'default-addr',
      listenPort: 0,
    };

    if (dto.listenAddr) {
      obj.listenAddr = dto.listenAddr;
    } else {
      defaultProperties.push('listenAddr');
    }

    if (dto.listenPort) {
      obj.listenPort = dto.listenPort;
    } else {
      defaultProperties.push('listenPort');
    }

    return defaultModelFactory<ProxyUpstreamModel>(
      ProxyUpstreamModel,
      {
        id: 'default-id',
        ...obj,
        proxyDownstream: [],
        insertDate: new Date(),
      },
      defaultProperties,
    );
  }
}
