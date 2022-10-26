import {Controller, Get, Inject, Query, UseGuards, UseInterceptors} from '@nestjs/common';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {
  ApiBadRequestResponse,
  ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation, ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {Roles} from '@src-api/http/decorator/roles.decorator';
import {DefaultArraySuccessDto} from '@src-api/http/dto/default-array-success.dto';
import {RoleGuard} from '@src-api/http/guard/role.guard';
import {UnauthorizedExceptionDto} from '@src-api/http/dto/unauthorized-exception.dto';
import {DefaultExceptionDto} from '@src-api/http/dto/default-exception.dto';
import {ForbiddenExceptionDto} from '@src-api/http/dto/forbidden-exception.dto';
import {FindProviderOutputDto} from '@src-api/http/controller/provider/dto/find-provider-output.dto';
import {RemoveSpecialFieldOfProviderInterceptor} from '@src-api/http/controller/provider/interceptor/remove-special-field-of-provider.interceptor';
import {FindProviderQueryDto} from '@src-api/http/controller/provider/dto/find-provider-query.dto';

@Controller({
  path: 'provider/myst',
  version: '1',
})
@UseGuards(RoleGuard)
@UseInterceptors(RemoveSpecialFieldOfProviderInterceptor)
@ApiTags('provider')
@ApiBearerAuth()
@ApiExtraModels(DefaultArraySuccessDto, FindProviderQueryDto, FindProviderOutputDto)
@ApiUnauthorizedResponse({description: 'Unauthorized', type: UnauthorizedExceptionDto})
@ApiBadRequestResponse({description: 'Bad Request', type: DefaultExceptionDto})
@ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
export class MystProviderHttpController {
  constructor(
    @Inject(ProviderTokenEnum.MYST_PROVIDER_SERVICE_DEFAULT)
    private readonly _providerService: IProviderServiceInterface,
  ) {
  }

  @Get()
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({description: 'Get list of all myst vpn provider', operationId: 'Get all myst vpn provider'})
  @ApiQuery({
    name: 'filters',
    required: false,
    style: 'deepObject',
    explode: true,
    type: 'object',
  })
  @ApiOkResponse({
    schema: {
      anyOf: [
        {
          allOf: [
            {
              title: 'With data',
            },
            {$ref: getSchemaPath(DefaultArraySuccessDto)},
            {
              properties: {
                count: {
                  type: 'number',
                  example: 1,
                },
                data: {
                  type: 'array',
                  items: {
                    $ref: getSchemaPath(FindProviderOutputDto),
                  },
                },
              },
            },
          ],
        },
        {
          allOf: [
            {
              title: 'Without data',
            },
            {$ref: getSchemaPath(DefaultArraySuccessDto)},
            {
              properties: {
                count: {
                  type: 'number',
                  example: 0,
                },
                data: {
                  type: 'array',
                  example: [],
                },
              },
            },
          ],
        },
      ],
    },
  })
  findAll(@Query() queryFilterDto: FindProviderQueryDto) {
    return this._providerService.getAll(FindProviderQueryDto.toModel(queryFilterDto));
  }
}
