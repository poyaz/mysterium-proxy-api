import {ApiProperty} from '@nestjs/swagger';
import {instanceToPlain, plainToInstance} from 'class-transformer';
import {UsersModel} from '../../../../../core/model/users-model';
import {IsBoolean, IsDefined, IsOptional, IsString, Matches, MaxLength, MinLength} from 'class-validator';
import {MatchConfirm} from '../../../decorator/match-confirm.decorator';

export class CreateUserInputDto {
  @ApiProperty({
    description: 'The username of user for login and use on proxy',
    type: String,
    minLength: 4,
    maxLength: 20,
    pattern: '^[a-zA-Z][a-zA-Z0-9_.-]+$',
    required: true,
    example: 'my-user',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_.-]+$/)
  @IsDefined()
  username: string;

  @ApiProperty({
    description: 'The password of user for login and use on proxy',
    type: String,
    minLength: 6,
    maxLength: 50,
    required: true,
    example: 'my password',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @IsDefined()
  password: string;

  @ApiProperty({
    description: 'The confirm of password',
    type: String,
    minLength: 6,
    maxLength: 50,
    required: true,
    example: 'my password',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @IsDefined()
  @MatchConfirm('password', {message: 'The confirmPassword not match with password'})
  confirmPassword: string;

  @ApiProperty({
    description: 'The status of user',
    required: false,
    readOnly: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnable?: boolean;

  static toModel(dto: CreateUserInputDto): UsersModel {
    const data = instanceToPlain(dto);
    delete data['role'];

    return plainToInstance(UsersModel, data, {excludePrefixes: ['confirmPassword']});
  }
}
