import {UsersModel} from '@src-core/model/users.model';
import {instanceToPlain, plainToInstance} from 'class-transformer';
import {ApiProperty} from '@nestjs/swagger';
import {IsBoolean, IsOptional, IsString, MaxLength, MinLength} from 'class-validator';
import {MatchConfirm} from '@src-api/http/decorator/match-confirm.decorator';
import {UpdateModel} from '@src-core/model/update.model';

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

  static toModel(userId: string, dto: UpdateUserAdminInputDto): UpdateModel<UsersModel> {
    const data = instanceToPlain(dto, {excludePrefixes: ['confirmPassword']});
    const usersModel = plainToInstance(UsersModel, data);

    return new UpdateModel<UsersModel>(userId, usersModel);
  }
}
