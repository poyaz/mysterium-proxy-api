import {ProxyAclMode, ProxyAclModel, ProxyAclType} from '@src-core/model/proxyAclModel';
import {ArrayNotEmpty, IsDefined, IsEnum, IsNumber, IsUUID, Min, ValidateIf, ValidateNested} from 'class-validator';
import {ApiHideProperty, ApiProperty} from '@nestjs/swagger';
import {Transform, Type} from 'class-transformer';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {UsersModel} from '@src-core/model/users.model';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';

export class UserInputDto {
  @ApiProperty({
    description: 'The identity of user',
    type: String,
    format: 'uuid',
    required: true,
    example: '00000000-0000-0000-0000-000000000000',
  })
  @IsDefined()
  @IsUUID()
  id: string;
}

export class AclPortInputDto {
  @ApiProperty({
    description: 'The port of proxy user has access to it',
    type: Number,
    minimum: 1,
    exclusiveMinimum: true,
    required: true,
    example: 3128,
  })
  @IsDefined()
  @IsNumber()
  @Min(1)
  port: number;
}

export class CreateAclInputDto {
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
    required: true,
    example: ProxyAclMode.ALL,
  })
  @IsEnum(ProxyAclMode)
  @IsDefined()
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
    required: true,
    example: ProxyAclType.USER_PORT,
  })
  @IsEnum(ProxyAclType)
  @IsDefined()
  type: ProxyAclType;

  @ApiHideProperty()
  @Type(() => UserInputDto)
  @ValidateNested()
  @ValidateIf((obj, value) => obj.mode === ProxyAclMode.CUSTOM || (obj.mode === ProxyAclMode.ALL && value))
  @IsDefined()
  user?: UserInputDto;

  @ApiHideProperty()
  @ValidateIf((obj) => obj.mode === ProxyAclMode.CUSTOM)
  @Type(() => AclPortInputDto)
  @ValidateNested({each: true})
  @ArrayNotEmpty()
  @IsDefined()
  @Transform((params) => params.obj.mode === ProxyAclMode.CUSTOM ? params.value : undefined)
  proxies?: Array<AclPortInputDto>;

  static toModel(dto: CreateAclInputDto): ProxyAclModel {
    const model = defaultModelFactory<ProxyAclModel>(
      ProxyAclModel,
      {
        id: 'default-id',
        mode: dto.mode,
        type: dto.type,
        proxies: [],
        insertDate: new Date(),
      },
      ['id', 'proxies', 'insertDate'],
    );

    if (typeof dto?.user?.id !== 'undefined') {
      model.user = defaultModelFactory<UsersModel>(
        UsersModel,
        {
          id: dto.user.id,
          username: 'default-username',
          password: 'default-password',
          insertDate: new Date(),
        },
        ['username', 'password', 'insertDate'],
      );

      if (dto.mode === ProxyAclMode.CUSTOM) {
        model.proxies = dto.proxies.map((v) =>
          defaultModelFactory<ProxyUpstreamModel>(
            ProxyUpstreamModel,
            {
              id: 'default-id',
              listenAddr: 'default-listen-addr',
              listenPort: v.port,
              proxyDownstream: [],
              insertDate: new Date(),
            },
            ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
          ),
        );
      }
    }

    return model;
  }
}
