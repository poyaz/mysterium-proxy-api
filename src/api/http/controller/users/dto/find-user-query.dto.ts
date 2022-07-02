import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {ApiProperty, PartialType} from '@nestjs/swagger';
import {instanceToPlain, Transform, Type} from 'class-transformer';
import {FilterModel, SortEnum} from '../../../../../core/model/filter.model';
import {UsersModel} from '../../../../../core/model/users.model';
import {FilterInputDto} from '../../../dto/filter-input.dto';

class FilterUserInputDto {
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
}

class SortUserInputDto {
  @ApiProperty({
    type: String,
    required: false,
    enum: SortEnum,
    example: SortEnum.ASC,
    default: SortEnum.ASC,
  })
  @IsOptional()
  @IsString()
  @IsEnum(SortEnum)
  @Transform(({value}) => value.toString().toLowerCase())
  username?: SortEnum;

  @ApiProperty({
    type: String,
    required: false,
    enum: SortEnum,
    example: SortEnum.ASC,
    default: SortEnum.ASC,
  })
  @IsOptional()
  @IsString()
  @IsEnum(SortEnum)
  @Transform(({value}) => value.toString().toLowerCase())
  isEnable?: SortEnum;

  @ApiProperty({
    type: String,
    required: false,
    enum: SortEnum,
    example: SortEnum.ASC,
    default: SortEnum.ASC,
  })
  @IsOptional()
  @IsString()
  @IsEnum(SortEnum)
  @Transform(({value}) => value.toString().toLowerCase())
  insertDate?: SortEnum.ASC | SortEnum.DESC;
}

export class FindUserQueryDto extends PartialType(FilterInputDto) {
  @Type(() => SortUserInputDto)
  @ValidateNested()
  @ApiProperty({
    type: SortUserInputDto,
    examples: {
      'no sort': {
        description: 'Default sort by insertDate DESC',
        value: {},
      },
      'sort with username asc': {
        description: 'Sort by username with ASC format',
        value: {
          username: SortEnum.ASC,
        },
      },
      'sort with username desc': {
        description: 'Sort by username with DESC format',
        value: {
          username: SortEnum.DESC,
        },
      },
      'sort with insertDate desc': {
        description: 'Sort by insertDate with DESC format',
        value: {
          insertDate: SortEnum.DESC,
        },
      },
      'sort with username asc & isEnable asc': {
        description: 'Sort by username and isEnable with ASC format',
        value: {
          username: SortEnum.ASC,
          isEnable: SortEnum.ASC,
        },
      },
    },
  })
  sorts?: SortUserInputDto;

  @Type(() => FilterUserInputDto)
  @ValidateNested()
  @ApiProperty({
    type: FilterUserInputDto,
    examples: {
      'no filter': {
        description: 'Search without any filters',
        value: {},
      },
      'with username': {
        value: {
          username: 'my-user',
        },
      },
      'search with isEnable': {
        value: {
          isEnable: true,
        },
      },
      'search with username & isEnable': {
        value: {
          username: 'my-user',
          isEnable: true,
        },
      },
    },
  })
  filters?: FilterUserInputDto;

  static toModel(dto: FindUserQueryDto): FilterModel<UsersModel> {
    const data = instanceToPlain(dto);

    const filterModel = new FilterModel<UsersModel>(data);

    if (typeof dto.sorts?.username !== 'undefined') {
      filterModel.addSortBy({username: dto.sorts.username});
    }
    if (typeof dto.sorts?.isEnable !== 'undefined') {
      filterModel.addSortBy({isEnable: dto.sorts.isEnable});
    }
    if (typeof dto.sorts?.insertDate !== 'undefined') {
      filterModel.addSortBy({insertDate: dto.sorts.insertDate});
    }

    if (typeof dto.filters?.username !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', username: data.filters.username});
    }
    if (typeof dto.filters?.isEnable !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', isEnable: data.filters.isEnable});
    }

    return filterModel;
  }
}
