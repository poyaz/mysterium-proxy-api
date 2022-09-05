import {ApiProperty, PartialType} from '@nestjs/swagger';
import {FilterInputDto} from '@src-api/http/dto/filter-input.dto';
import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, ValidateNested} from 'class-validator';
import {instanceToPlain, Transform, Type} from 'class-transformer';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';

class FilterIdentityInputDto {
  @ApiProperty({
    description: 'The identity of VPN account',
    type: String,
    maxLength: 50,
    pattern: '^0x.+',
    required: false,
    example: '0xfeb1c4e48515ba12f60c5a912c329ec8b8a1cb56',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^0x.+/)
  identity?: string;

  @ApiProperty({
    description: 'The status of identity is enable or not',
    type: Boolean,
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({value}) => value === 'true' ? true : value === 'false' ? false : value)
  isUse?: boolean;
}

class SortIdentityInputDto {
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

export class FindIdentityQueryDto extends PartialType(FilterInputDto) {
  @Type(() => SortIdentityInputDto)
  @ValidateNested()
  @ApiProperty({
    type: SortIdentityInputDto,
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
      'sort with insertDate asc': {
        description: 'Sort by insertDate with ASC format',
        value: {
          insertDate: SortEnum.ASC,
        },
      },
    },
  })
  sorts?: SortIdentityInputDto;

  @Type(() => FilterIdentityInputDto)
  @ValidateNested()
  @ApiProperty({
    type: FilterIdentityInputDto,
    examples: {
      'no filter': {
        description: 'Search without any filters',
        value: {},
      },
      'search with identity': {
        value: {
          identity: '0xfeb1c4e48515ba12f60c5a912c329ec8b8a1cb56',
        },
      },
      'search with isUse': {
        value: {
          isUse: true,
        },
      },
      'search with identity & isUse': {
        value: {
          identity: '0xfeb1c4e48515ba12f60c5a912c329ec8b8a1cb56',
          isUse: true,
        },
      },
    },
  })
  filters?: FilterIdentityInputDto;

  static toModel(dto: FindIdentityQueryDto): FilterModel<MystIdentityModel> {
    const data = instanceToPlain(dto);

    const filterModel = new FilterModel<MystIdentityModel>(data);

    if (typeof dto.sorts?.insertDate !== 'undefined') {
      filterModel.addSortBy({insertDate: dto.sorts.insertDate});
    }

    if (typeof dto.filters?.identity !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', identity: data.filters.identity});
    }
    if (typeof dto.filters?.isUse !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', isUse: data.filters.isUse});
    }

    return filterModel;
  }
}
