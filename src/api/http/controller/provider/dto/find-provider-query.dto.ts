import {ApiProperty, OmitType, PartialType} from '@nestjs/swagger';
import {IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, ValidateNested} from 'class-validator';
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
    },
  })
  filters?: FilterProviderInputDto;

  static toModel(dto: FindProviderQueryDto): FilterModel<VpnProviderModel> {
    const data = instanceToPlain(dto);

    const filterModel = new FilterModel<VpnProviderModel>(data);

    if (typeof dto.filters?.country !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', country: data.filters.country});
    }
    if (typeof dto.filters?.providerIdentity !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', providerIdentity: data.filters.providerIdentity});
    }
    if (typeof dto.filters?.providerIpType !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', providerIpType: data.filters.providerIpType});
    }
    if (typeof dto.filters?.isRegister !== 'undefined') {
      filterModel.addCondition({$opr: 'eq', isRegister: data.filters.isRegister});
    }

    return filterModel;
  }
}
