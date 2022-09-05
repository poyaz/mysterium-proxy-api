import {ApiProperty} from '@nestjs/swagger';
import {IsDefined, IsString, MaxLength, MinLength} from 'class-validator';

export class CreateIdentityInputDto {
  @ApiProperty({
    description: 'The passphrase of identity for login and use on proxy',
    type: String,
    minLength: 1,
    maxLength: 100,
    required: true,
    example: 'my identity password',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsDefined()
  passphrase: string;
}
