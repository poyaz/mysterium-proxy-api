import {ApiProperty, OmitType, PickType} from '@nestjs/swagger';
import {FindProxyOutputDto} from '@src-api/http/controller/proxy/dto/find-proxy-output.dto';
import {FindUserOutputDto} from '@src-api/http/controller/users/dto/find-user-output.dto';

class UserAuthInfoDto extends PickType(FindUserOutputDto, ['id', 'username'] as const) {
  @ApiProperty({
    description: 'The password of user for login and use on proxy',
    type: String,
    minLength: 6,
    maxLength: 50,
    required: false,
    readOnly: true,
    example: 'my password',
  })
  password: string;
}

export class FindUsersProxyOutputDto extends OmitType(FindProxyOutputDto, ['identityId', 'providerId'] as const) {
  @ApiProperty({
    required: false,
    readOnly: true,
  })
  auth: UserAuthInfoDto;
}
