import {ApiProperty} from '@nestjs/swagger';
import {IsDefined, IsNumber, IsOptional, IsUUID, Max, Min} from 'class-validator';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {defaultModelFactory} from '@src-core/model/defaultModel';

export class CreateProxyInputDto {
  @ApiProperty({
    description: 'The identity of VPN provider',
    type: String,
    format: 'uuid',
    required: true,
    example: '00000000-0000-0000-0000-000000000000',
  })
  @IsDefined()
  @IsUUID()
  providerId: string;

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
    const defaultProperties: Array<keyof ProxyUpstreamModel> = ['id', 'listenAddr', 'insertDate'];
    const obj: Pick<ProxyUpstreamModel, 'proxyDownstream' | 'listenPort'> = {
      proxyDownstream: [],
      listenPort: 0,
    };

    obj.proxyDownstream = [
      defaultModelFactory<ProxyDownstreamModel>(
        ProxyDownstreamModel,
        {
          id: 'default-id',
          refId: dto.providerId,
          ip: 'default-ip',
          mask: 32,
          type: ProxyTypeEnum.MYST,
          status: ProxyStatusEnum.OFFLINE,
        },
        ['id', 'ip', 'mask', 'status'],
      ),
    ];

    if (dto.listenPort) {
      obj.listenPort = dto.listenPort;
    } else {
      defaultProperties.push('listenPort');
    }

    return defaultModelFactory<ProxyUpstreamModel>(
      ProxyUpstreamModel,
      {
        id: 'default-id',
        listenAddr: 'default-listen-addr',
        ...obj,
        insertDate: new Date(),
      },
      defaultProperties,
    );
  }
}
