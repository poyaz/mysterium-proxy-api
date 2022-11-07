import {ApiProperty} from '@nestjs/swagger';

export class FindProxyOutputDto {
  @ApiProperty({
    description: 'The identity of proxy',
    type: String,
    required: false,
    readOnly: true,
    format: 'uuid',
    example: '00000000-0000-0000-0000-000000000000',
  })
  id: string;

  @ApiProperty({
    description: 'The ip or hostname of upstream proxy',
    type: String,
    required: false,
    readOnly: true,
    example: 'proxy.example.com',
  })
  listenAddr: string;

  @ApiProperty({
    description: 'The port of upstream proxy',
    type: Number,
    required: false,
    readOnly: true,
    example: 3128,
  })
  listenPort: number;

  @ApiProperty({
    description: 'The identity of VPN account',
    type: String,
    required: false,
    readOnly: true,
    format: 'uuid',
    example: '00000000-0000-0000-0000-000000000000',
  })
  identityId: string;

  @ApiProperty({
    description: 'The identity of VPN provider',
    type: String,
    required: false,
    readOnly: true,
    format: 'uuid',
    example: '00000000-0000-0000-0000-000000000000',
  })
  providerId: string;

  @ApiProperty({
    description: 'The outgoing ip address of VPN',
    type: String,
    required: false,
    readOnly: true,
    format: 'ipv4',
    example: '55.12.60.0',
  })
  outgoingIp: string;
}
