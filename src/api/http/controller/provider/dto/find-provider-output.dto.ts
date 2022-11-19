import {ApiProperty} from '@nestjs/swagger';
import {VpnProviderIpTypeEnum, VpnProviderStatusEnum, VpnServiceTypeEnum} from '@src-core/model/vpn-provider.model';

export class FindProviderOutputDto {
  @ApiProperty({
    description: 'The identity of vpn provider',
    type: String,
    required: false,
    readOnly: true,
    format: 'uuid',
    example: '00000000-0000-0000-0000-000000000000',
  })
  id: string;

  @ApiProperty({
    description: 'The type of service use on vpn provider',
    type: String,
    enum: VpnServiceTypeEnum,
    required: false,
    readOnly: true,
    example: VpnServiceTypeEnum.WIREGUARD,
  })
  serviceType: string;

  @ApiProperty({
    description: 'The identity serial of vpn provider (External identity)',
    type: String,
    required: false,
    readOnly: true,
  })
  providerIdentity: string;

  @ApiProperty({
    description: 'The status of ip using on provider',
    type: String,
    enum: VpnProviderStatusEnum,
    required: false,
    readOnly: true,
    nullable: true,
    example: VpnProviderStatusEnum.OFFLINE,
  })
  providerStatus?: string;

  @ApiProperty({
    description: 'The type of ip using on provider',
    type: String,
    enum: VpnProviderIpTypeEnum,
    required: false,
    readOnly: true,
    example: VpnProviderIpTypeEnum.HOSTING,
  })
  providerIpType: string;

  @ApiProperty({
    description: 'The ip address of vpn provider',
    type: String,
    format: 'ipv4',
    required: false,
    readOnly: true,
    nullable: true,
    example: '1.1.1.1',
  })
  ip?: string;

  @ApiProperty({
    description: 'The mask of vpn provider',
    type: Number,
    minimum: 0,
    maximum: 32,
    required: false,
    readOnly: true,
    nullable: true,
    example: 32,
  })
  mask?: number;

  @ApiProperty({
    description: 'The country of vpn provider',
    type: String,
    required: false,
    readOnly: true,
    example: 'GB',
  })
  country: string;

  @ApiProperty({
    description: 'The quality of downstream proxy',
    type: Number,
    required: false,
    readOnly: true,
    nullable: true,
  })
  quality?: number;

  @ApiProperty({
    description: 'The bandwidth of downstream proxy',
    type: Number,
    required: false,
    readOnly: true,
    nullable: true,
  })
  bandwidth?: number;

  @ApiProperty({
    description: 'The latency of downstream proxy',
    type: Number,
    required: false,
    readOnly: true,
    nullable: true,
  })
  latency?: number;

  @ApiProperty({
    description: 'The status of register ip address (The false value means ip has not registered yet)',
    type: Boolean,
    required: false,
    readOnly: true,
    default: false,
  })
  isRegister: boolean;

  @ApiProperty({
    description: 'The total number of proxy initiated on provider',
    type: Number,
    required: false,
    readOnly: true,
    default: 0,
  })
  proxyCount: number;
}
