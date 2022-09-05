import {ApiProperty, PartialType} from '@nestjs/swagger';
import {DateOutputDto} from '@src-api/http/dto/date-output.dto';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {instanceToPlain, plainToInstance} from 'class-transformer';

export class FindIdentityOutputDto extends PartialType(DateOutputDto) {
  @ApiProperty({
    description: 'The identity of user',
    type: String,
    required: false,
    readOnly: true,
    example: '00000000-0000-0000-0000-000000000000',
  })
  id: string;

  @ApiProperty({
    description: 'The identity of VPN account',
    type: String,
    maxLength: 50,
    pattern: '^0x.+',
    required: false,
    example: '0xfeb1c4e48515ba12f60c5a912c329ec8b8a1cb56',
  })
  identity?: string;

  @ApiProperty({
    description: 'The status of identity is enable or not',
    type: Boolean,
    required: false,
    example: true,
  })
  isUse?: boolean;
}
