import {ApiProperty, PartialType} from '@nestjs/swagger';
import {FilterInputDto} from '@src-api/http/dto/filter-input.dto';
import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {ProxyAclModel} from '@src-core/model/proxyAclModel';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {UsersModel} from '@src-core/model/users.model';
import {IsDefined, IsEnum, IsOptional, IsString, IsUUID, ValidateNested} from 'class-validator';
import {Transform, Type} from 'class-transformer';

class FilterUserInputDto {
  @ApiProperty({
    description: 'The identity of user',
    type: String,
    format: 'uuid',
    required: true,
    example: '00000000-0000-0000-0000-000000000000',
  })
  @IsDefined()
  @IsUUID()
  id: string;
}

class FilterAclInputDto {
  @ApiProperty({
    description: 'The user info object',
    type: FilterUserInputDto,
    required: false,
    nullable: true,
  })
  @Type(() => FilterUserInputDto)
  @ValidateNested()
  @IsOptional()
  user: FilterUserInputDto;
}

class SortAclInputDto {
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

export class FindAclQueryDto extends PartialType(FilterInputDto) {
  @Type(() => SortAclInputDto)
  @ValidateNested()
  @ApiProperty({
    type: SortAclInputDto,
    examples: {
      'no sort': {
        description: 'Default sort by insertDate DESC',
        value: {},
      },
      'sort with insertDate desc': {
        description: 'Sort by insertDate with DESC format',
        value: {
          insertDate: SortEnum.DESC,
        },
      },
    },
  })
  sorts?: SortAclInputDto;

  @Type(() => FilterAclInputDto)
  @ValidateNested()
  @ApiProperty({
    type: FilterAclInputDto,
    examples: {
      'no filter': {
        description: 'Search without any filters',
        value: {},
      },
    },
  })
  filters?: FilterAclInputDto;

  static toModel(dto: FindAclQueryDto): FilterModel<ProxyAclModel> {
    const obj: { page?: number, limit?: number } = {};
    if (typeof dto.page !== 'undefined') {
      obj.page = dto.page;
    }
    if (typeof dto.limit !== 'undefined') {
      obj.limit = dto.limit;
    }

    const filterModel = new FilterModel<ProxyAclModel>(obj);

    if (typeof dto.sorts?.insertDate !== 'undefined') {
      filterModel.addSortBy({insertDate: dto.sorts.insertDate});
    }

    if (typeof dto.filters?.user?.id !== 'undefined') {
      filterModel.addCondition({
        $opr: 'eq',
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: dto.filters?.user?.id,
            username: 'default-username',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['username', 'password', 'insertDate'],
        ),
      });
    }

    return filterModel;
  }
}
