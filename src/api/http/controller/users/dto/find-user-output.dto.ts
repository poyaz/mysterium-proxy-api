import {ApiProperty, PartialType} from '@nestjs/swagger';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {DateOutputDto} from '@src-api/http/dto/date-output.dto';

export class FindUserOutputDto extends PartialType(DateOutputDto) {
  @ApiProperty({
    description: 'The identity of user',
    type: String,
    required: false,
    readOnly: true,
    example: '00000000-0000-0000-0000-000000000000',
  })
  id: string;

  @ApiProperty({
    description: 'The username of user for login and use on proxy',
    type: String,
    minLength: 4,
    maxLength: 20,
    pattern: '^[a-zA-Z][a-zA-Z0-9_.-]+$',
    required: false,
    readOnly: true,
    example: 'my-user',
  })
  username: string;

  @ApiProperty({
    description: 'The role of user',
    type: String,
    enum: UserRoleEnum,
    required: false,
    readOnly: true,
    example: UserRoleEnum.USER,
  })
  role: string;

  @ApiProperty({
    description: 'The status of user',
    required: false,
    readOnly: true,
    type: Boolean,
    example: true,
  })
  isEnable: boolean;
}
