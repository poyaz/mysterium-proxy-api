import {ApiProperty, OmitType, PartialType} from '@nestjs/swagger';
import {IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested} from 'class-validator';
import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {instanceToPlain, Transform, Type} from 'class-transformer';
import {FilterInputDto} from '@src-api/http/dto/filter-input.dto';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';

class FilterProxyInputDto {
  @ApiProperty({
    description: 'The port of upstream proxy',
    type: Number,
    minimum: 1000,
    maximum: 100000,
    exclusiveMaximum: true,
    exclusiveMinimum: true,
    required: false,
    example: 3128,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(100000)
  listenPort?: number;
}

export class FindProxyQueryDto extends OmitType(FilterInputDto, ['sorts'] as const) {
  @Type(() => FilterProxyInputDto)
  @ValidateNested()
  @ApiProperty({
    type: FilterProxyInputDto,
    examples: {
      'no filter': {
        description: 'Search without any filters',
        value: {},
      },
      'search with listenPort': {
        value: {
          listenPort: 3128,
        },
      },
    },
  })
  filters?: FilterProxyInputDto;

  static toModel(dto: FindProxyQueryDto): FilterModel<ProxyUpstreamModel> {
    const data = instanceToPlain(dto);

    const filterModel = new FilterModel<ProxyUpstreamModel>(data);

    if (typeof dto.filters?.listenPort !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', listenPort: data.filters.listenPort});
    }

    return filterModel;
  }
}
