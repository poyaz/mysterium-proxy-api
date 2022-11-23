import {ApiProperty, OmitType} from '@nestjs/swagger';
import {FilterInputDto} from '@src-api/http/dto/filter-input.dto';
import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {Transform, Type} from 'class-transformer';
import {IsEnum, IsOptional, IsString, ValidateNested} from 'class-validator';

class SortUsersProxyInputDto {
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

export class FindUsersProxyQueryDto extends OmitType(FilterInputDto, ['filters'] as const) {
  @Type(() => SortUsersProxyInputDto)
  @ValidateNested()
  @ApiProperty({
    type: SortUsersProxyInputDto,
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
  sorts?: SortUsersProxyInputDto;

  static toModel(dto: FindUsersProxyQueryDto): FilterModel<UsersProxyModel> {
    const obj: { page?: number, limit?: number } = {};
    if (typeof dto.page !== 'undefined') {
      obj.page = dto.page;
    }
    if (typeof dto.limit !== 'undefined') {
      obj.limit = dto.limit;
    }

    const filterModel = new FilterModel<UsersProxyModel>(obj);

    if (typeof dto.sorts?.insertDate !== 'undefined') {
      filterModel.addSortBy({insertDate: dto.sorts.insertDate});
    }

    return filterModel;
  }
}
