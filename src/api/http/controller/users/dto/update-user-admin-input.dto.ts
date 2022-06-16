import {UsersModel} from '../../../../../core/model/users.model';
import {instanceToPlain, plainToClass} from 'class-transformer';
import {ApiProperty} from '@nestjs/swagger';
import {IsBoolean, IsDefined, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength} from 'class-validator';
import {MatchConfirm} from '../../../decorator/match-confirm.decorator';

export class UpdateUserAdminInputDto {
  @ApiProperty({
    description: 'The password of user for login and use on proxy',
    type: String,
    minLength: 6,
    maxLength: 50,
    required: false,
    example: 'new password',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @IsOptional()
  password: string;

  @ApiProperty({
    description: 'The confirm of password',
    type: String,
    minLength: 6,
    maxLength: 50,
    required: false,
    example: 'new password',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @IsOptional()
  @MatchConfirm('password', {message: 'The confirmPassword not match with password'})
  confirmPassword: string;

  @ApiProperty({
    description: 'The status of user',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isEnable?: boolean;

  static toModel(dto: UpdateUserAdminInputDto): UsersModel {
    const data = instanceToPlain(dto);

    return plainToClass(UsersModel, data);
  }
}
