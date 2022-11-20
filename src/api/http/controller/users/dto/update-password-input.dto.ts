import {ApiProperty} from '@nestjs/swagger';
import {UsersModel} from '@src-core/model/users.model';
import {instanceToPlain, plainToInstance} from 'class-transformer';
import {MatchConfirm} from '@src-api/http/decorator/match-confirm.decorator';
import {IsDefined, IsString, MaxLength, MinLength} from 'class-validator';
import {UpdateModel} from '@src-core/model/update.model';

export class UpdatePasswordInputDto {
  @ApiProperty({
    description: 'The current password of user',
    type: String,
    minLength: 6,
    maxLength: 20,
    required: true,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @IsDefined()
  currentPassword: string;

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
  confirmPassword: string;

  static toModel(userId: string, dto: UpdatePasswordInputDto): UpdateModel<UsersModel> {
    const data = instanceToPlain(dto, {excludePrefixes: ['currentPassword', 'confirmPassword']});
    const usersModel = plainToInstance(UsersModel, data);

    return new UpdateModel<UsersModel>(userId, usersModel);
  }
}
