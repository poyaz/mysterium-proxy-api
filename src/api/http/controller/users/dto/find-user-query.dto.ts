import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import {instanceToPlain, Transform} from 'class-transformer';
import {FilterModel} from '../../../../../core/model/filter.model';
import {UsersModel} from '../../../../../core/model/users.model';

export class FindUserQueryDto {
  @ApiProperty({
    description: 'The username of user for searching',
    type: String,
    maxLength: 20,
    pattern: '^[a-zA-Z][a-zA-Z0-9_.-]+$',
    required: false,
    example: 'my-user',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_.-]+$/)
  username?: string;

  @ApiProperty({
    description: 'The status of user is enable or not',
    type: Boolean,
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({value}) => value === 'true' ? true : value === 'false' ? false : value)
  isEnable?: boolean;

  static toModel(dto: FindUserQueryDto): FilterModel<UsersModel> {
    const data = instanceToPlain(dto);

    const filterModel = new FilterModel<UsersModel>();
    if (typeof dto.username !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', username: data.username});
    }
    if (typeof dto.isEnable !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', isEnable: data.isEnable});
    }

    return filterModel;
  }
}
