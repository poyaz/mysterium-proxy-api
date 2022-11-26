import {ApiProperty, PartialType, PickType} from '@nestjs/swagger';
import {DateOutputDto} from '@src-api/http/dto/date-output.dto';
import {FindUserOutputDto} from '@src-api/http/controller/users/dto/find-user-output.dto';
import {ProxyAclMode, ProxyAclType} from '@src-core/model/proxyAclModel';

class AclPortOutputDto {
  @ApiProperty({
    description: 'The port of proxy user has access to it',
    type: Number,
    required: false,
    readOnly: true,
    example: 3128,
  })
  port: number;
}

class UserOutputDto extends PickType(FindUserOutputDto, ['id', 'username'] as const) {
}

export class FindAclOutputDto extends PartialType(DateOutputDto) {
  @ApiProperty({
    description: 'The identity of acl',
    type: String,
    required: false,
    readOnly: true,
    example: '00000000-0000-0000-0000-000000000000',
  })
  id: string;

  @ApiProperty({
    title: 'The mode of acl access',
    description: [
      'This flag show mode of acl. All mode of acl describe bellow:',
      `* Access all user to all port: If \`mode=${ProxyAclMode.ALL}\` and \`user\` property **not exist**`,
      `* Access one user to one port: If \`mode=${ProxyAclMode.CUSTOM}\` and \`user\` property exist`,
      `* Access one user to all port: If \`mode=${ProxyAclMode.ALL}\` and \`user\` property **exist**`,
    ].join('\n'),
    type: String,
    enum: ProxyAclMode,
    required: false,
    readOnly: true,
    example: ProxyAclMode.CUSTOM,
  })
  mode: ProxyAclMode;

  @ApiProperty({
    title: 'The type of acl',
    description: [
      'List of type:',
      `* When type is **${ProxyAclType.USER_PORT}** means this acl work with username and port`,
    ].join('\n'),
    type: Number,
    enum: {
      [ProxyAclType.USER_PORT.toString()]: ProxyAclType.USER_PORT,
    },
    required: false,
    readOnly: true,
    example: ProxyAclType.USER_PORT,
  })
  type: ProxyAclType;

  @ApiProperty({
    description: 'The identity of acl',
    type: UserOutputDto,
    required: false,
    readOnly: true,
    nullable: true,
  })
  user?: UserOutputDto;

  @ApiProperty({
    description: 'The identity of acl',
    type: AclPortOutputDto,
    isArray: true,
    required: false,
    readOnly: true,
    minItems: 0,
  })
  proxies: Array<AclPortOutputDto>;
}
