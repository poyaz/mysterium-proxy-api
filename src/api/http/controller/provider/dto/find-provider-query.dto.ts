import {ApiProperty, OmitType, PartialType} from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches, Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {instanceToPlain, Transform, Type} from 'class-transformer';
import {FilterInputDto} from '@src-api/http/dto/filter-input.dto';
import {VpnProviderIpTypeEnum, VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {FilterModel} from '@src-core/model/filter.model';

class FilterProviderInputDto {
  @ApiProperty({
    description: 'The name of country location',
    type: String,
    maxLength: 3,
    pattern: '[A-Z]+',
    required: false,
    example: 'GB',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  @Matches(/[A-Z]+/)
  country?: string;

  @ApiProperty({
    description: 'The identity of VPN provider',
    type: String,
    maxLength: 50,
    pattern: '^0x.+',
    required: false,
    example: '0xe26ee1cba6e9c3c48cb72f8be863cb99e95d2a64',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^0x.+/)
  providerIdentity?: string;

  @ApiProperty({
    description: 'The type of VPN provider',
    type: String,
    enum: VpnProviderIpTypeEnum,
    required: false,
    example: VpnProviderIpTypeEnum.RESIDENTIAL,
  })
  @IsOptional()
  @IsString()
  @IsEnum(VpnProviderIpTypeEnum)
  providerIpType?: VpnProviderIpTypeEnum;

  @ApiProperty({
    description: 'The status of VPN is registered or not',
    type: Boolean,
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({value}) => value === 'true' ? true : value === 'false' ? false : value)
  isRegister?: boolean;

  @ApiProperty({
    description: 'The total number of proxy initiated on provider',
    type: Number,
    minimum: 0,
    maximum: 1000,
    exclusiveMaximum: true,
    exclusiveMinimum: true,
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  @Transform(({value}) => Number(value))
  proxyCount?: number;
}

export class FindProviderQueryDto extends OmitType(FilterInputDto, ['sorts'] as const) {
  @Type(() => FilterProviderInputDto)
  @ValidateNested()
  @ApiProperty({
    type: FilterProviderInputDto,
    examples: {
      'no filter': {
        description: 'Search without any filters',
        value: {},
      },
      'search with country': {
        value: {
          country: 'GB',
        },
      },
      'search with providerIdentity': {
        value: {
          providerIdentity: '0xfeb1c4e48515ba12f60c5a912c329ec8b8a1cb56',
        },
      },
      'search with providerIpType': {
        value: {
          providerIpType: 'residential',
        },
      },
      'search with isRegister': {
        value: {
          isRegister: true,
        },
      },
      'search with country & isRegister': {
        value: {
          country: 'GB',
          isRegister: true,
        },
      },
      'search with no proxy assign to provider': {
        description: 'Get list of provider is register and no proxy assign to them',
        value: {
          isRegister: true,
          proxyCount: 0,
        },
      },
      'search with at least proxy assign to provider': {
        value: {
          proxyCount: 1,
        },
      },
      'search with any number of proxy assign to provider': {
        value: {
          proxyCount: 3,
        },
      },
    },
  })
  filters?: FilterProviderInputDto;

  static toModel(dto: FindProviderQueryDto): FilterModel<VpnProviderModel> {
    const obj: { page?: number, limit?: number } = {};
    if (typeof dto.page !== 'undefined') {
      obj.page = dto.page;
    }
    if (typeof dto.limit !== 'undefined') {
      obj.limit = dto.limit;
    }

    const filterModel = new FilterModel<VpnProviderModel>(obj);

    if (typeof dto.filters?.country !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', country: dto.filters.country});
    }
    if (typeof dto.filters?.providerIdentity !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', providerIdentity: dto.filters.providerIdentity});
    }
    if (typeof dto.filters?.providerIpType !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', providerIpType: dto.filters.providerIpType});
    }
    if (typeof dto.filters?.isRegister !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', isRegister: dto.filters.isRegister});
    }
    if (typeof dto.filters?.proxyCount !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', proxyCount: dto.filters.proxyCount});
    }

    return filterModel;
  }
}
