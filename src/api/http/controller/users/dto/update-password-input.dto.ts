import {ApiProperty} from '@nestjs/swagger';
import {UsersModel} from '../../../../../core/model/users.model';
import {instanceToPlain, plainToClass} from 'class-transformer';
import {MatchConfirm} from '../../../decorator/match-confirm.decorator';
import {IsDefined, IsString, MaxLength, MinLength} from 'class-validator';

export class UpdatePasswordInputDto {
  @ApiProperty({
    description: 'The password of user for login and use on proxy',
    type: String,
    minLength: 6,
    maxLength: 20,
    required: true,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @IsDefined()
  password: string;

  @ApiProperty({
    description: 'The confirm of password',
    type: String,
    minLength: 6,
    maxLength: 20,
    required: true,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @IsDefined()
  @MatchConfirm('password')
  passwordConfirm: string;

  static toModel(dto: UpdatePasswordInputDto): UsersModel {
    const data = instanceToPlain(dto);

    return plainToClass(UsersModel, data, {excludePrefixes: ['confirmPassword']});
  }
}
