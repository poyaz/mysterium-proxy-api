import {ApiProperty, PartialType} from '@nestjs/swagger';
import {IsEnum, IsOptional, IsString, ValidateNested} from 'class-validator';
import {Transform, Type} from 'class-transformer';
import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {FavoritesListTypeEnum, FavoritesModel} from '@src-core/model/favorites.model';
import {FilterInputDto} from '@src-api/http/dto/filter-input.dto';

class FilterUsersFavoritesInputDto {
  @ApiProperty({
    description: 'The kind of favorite list',
    type: String,
    enum: FavoritesListTypeEnum,
    required: false,
    nullable: true,
  })
  @IsEnum(FavoritesListTypeEnum)
  @IsOptional()
  kind: FavoritesListTypeEnum;
}

class SortUsersFavoritesInputDto {
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

export class FindUsersFavoritesQueryDto extends PartialType(FilterInputDto) {
  @Type(() => SortUsersFavoritesInputDto)
  @ValidateNested()
  @ApiProperty({
    type: SortUsersFavoritesInputDto,
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
  sorts?: SortUsersFavoritesInputDto;

  @Type(() => FilterUsersFavoritesInputDto)
  @ValidateNested()
  @ApiProperty({
    type: FilterUsersFavoritesInputDto,
    examples: {
      'no filter': {
        description: 'Search without any filters',
        value: {},
      },
      'With favorite kind filter': {
        description: `Search with **${FavoritesListTypeEnum.FAVORITE}** kind filter`,
        value: {
          kind: FavoritesListTypeEnum.FAVORITE,
        },
      },
      'With today kind filter': {
        description: `Search with **${FavoritesListTypeEnum.TODAY}** kind filter`,
        value: {
          kind: FavoritesListTypeEnum.TODAY,
        },
      },
      'With other kind filter': {
        description: `Search with **${FavoritesListTypeEnum.OTHER}** kind filter`,
        value: {
          kind: FavoritesListTypeEnum.OTHER,
        },
      },
    },
  })
  filters?: FilterUsersFavoritesInputDto;

  static toModel(dto: FindUsersFavoritesQueryDto): FilterModel<FavoritesModel> {
    const obj: { page?: number, limit?: number } = {};
    if (typeof dto.page !== 'undefined') {
      obj.page = dto.page;
    }
    if (typeof dto.limit !== 'undefined') {
      obj.limit = dto.limit;
    }

    const filterModel = new FilterModel<FavoritesModel>(obj);

    if (typeof dto.filters?.kind !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', kind: dto.filters.kind});
    }

    if (typeof dto.sorts?.insertDate !== 'undefined') {
      filterModel.addSortBy({insertDate: dto.sorts.insertDate});
    }

    return filterModel;
  }
}
