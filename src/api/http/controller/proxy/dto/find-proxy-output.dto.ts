import {ApiProperty, PartialType} from '@nestjs/swagger';
import {ProxyStatusEnum} from '@src-core/model/proxy.model';
import {DateOutputDto} from '@src-api/http/dto/date-output.dto';

export class FindProxyOutputDto extends PartialType(DateOutputDto) {
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
    nullable: true,
    format: 'uuid',
    example: '00000000-0000-0000-0000-000000000000',
  })
  identityId?: string;

  @ApiProperty({
    description: 'The identity of VPN provider',
    type: String,
    required: false,
    readOnly: true,
    nullable: true,
    format: 'uuid',
    example: '00000000-0000-0000-0000-000000000000',
  })
  providerId?: string;

  @ApiProperty({
    description: 'The outgoing ip address of VPN',
    type: String,
    required: false,
    readOnly: true,
    nullable: true,
    format: 'ipv4',
    example: '55.12.60.0',
  })
  outgoingIp?: string;

  @ApiProperty({
    description: 'The outgoing country of VPN',
    type: String,
    required: false,
    readOnly: true,
    nullable: true,
    example: 'GB',
  })
  outgoingCountry?: string;

  @ApiProperty({
    title: 'The status of proxy',
    description: [
      'List of status:',
      `* When status is **${ProxyStatusEnum.DISABLE}** means proxy has been disabled`,
      `* When status is **${ProxyStatusEnum.OFFLINE}** means proxy has been offline`,
      `* When status is **${ProxyStatusEnum.ONLINE}** means proxy has been online`,
    ].join('\n'),
    type: Number,
    enum: {
      [ProxyStatusEnum.DISABLE.toString()]: ProxyStatusEnum.DISABLE,
      [ProxyStatusEnum.OFFLINE.toString()]: ProxyStatusEnum.OFFLINE,
      [ProxyStatusEnum.ONLINE.toString()]: ProxyStatusEnum.ONLINE,
    },
    required: false,
    readOnly: true,
    example: ProxyStatusEnum.ONLINE,
  })
  status: ProxyStatusEnum;
}
