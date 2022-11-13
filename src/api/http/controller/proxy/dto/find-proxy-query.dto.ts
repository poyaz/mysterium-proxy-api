import {ApiProperty, OmitType} from '@nestjs/swagger';
import {IsEnum, IsNumber, IsOptional, Max, Min, ValidateNested} from 'class-validator';
import {FilterModel} from '@src-core/model/filter.model';
import {instanceToPlain, Transform, Type} from 'class-transformer';
import {FilterInputDto} from '@src-api/http/dto/filter-input.dto';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {defaultModelFactory} from '@src-core/model/defaultModel';

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
  @Transform(({value}) => Number(value))
  listenPort?: number;

  @ApiProperty({
    description: 'The port of upstream proxy',
    type: String,
    enum: ProxyStatusEnum,
    required: false,
    example: ProxyStatusEnum.ONLINE,
  })
  @IsOptional()
  @IsEnum(ProxyStatusEnum)
  @Transform(({value}) => Number(value))
  status?: ProxyStatusEnum;
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
      'search with ONLINE status': {
        description: 'Get online list of proxy',
        value: {
          status: ProxyStatusEnum.ONLINE,
        },
      },
      'search with OFFLINE status': {
        description: 'Get offline list of proxy',
        value: {
          status: ProxyStatusEnum.OFFLINE,
        },
      },
      'search with DISABLE status': {
        description: 'Get disable list of proxy',
        value: {
          status: ProxyStatusEnum.DISABLE,
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
    if (typeof dto.filters?.status !== 'undefined') {
      const downstreamFilter = defaultModelFactory<ProxyDownstreamModel>(
        ProxyDownstreamModel,
        {
          id: 'default-id',
          refId: 'default-ref-id',
          ip: 'default-ip',
          mask: 32,
          type: ProxyTypeEnum.MYST,
          status: dto.filters.status,
        },
        ['id', 'refId', 'ip', 'mask', 'type'],
      );
      filterModel.addCondition({$opr: 'eq', proxyDownstream: [downstreamFilter]});
    }

    return filterModel;
  }
}
