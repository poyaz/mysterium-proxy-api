import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject, Param,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {
  ApiBadRequestResponse,
  ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation, ApiParam, ApiQuery,
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
import {NotFoundExceptionDto} from '@src-api/http/dto/not-found-exception.dto';
import {ExceptionEnum} from '@src-core/enum/exception.enum';
import {NoBodySuccessDto} from '@src-api/http/dto/no-body-success.dto';
import {DefaultSuccessDto} from '@src-api/http/dto/default-success.dto';

@Controller({
  path: 'provider/myst',
  version: '1',
})
@UseGuards(RoleGuard)
@UseInterceptors(RemoveSpecialFieldOfProviderInterceptor)
@Roles(UserRoleEnum.ADMIN)
@ApiTags('provider')
@ApiBearerAuth()
@ApiExtraModels(DefaultArraySuccessDto, FindProviderQueryDto, FindProviderOutputDto, DefaultExceptionDto)
@ApiUnauthorizedResponse({description: 'Unauthorized', type: UnauthorizedExceptionDto})
@ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
export class MystProviderHttpController {
  constructor(
    @Inject(ProviderTokenEnum.MYST_PROVIDER_SERVICE_DEFAULT)
    private readonly _providerService: IProviderServiceInterface,
  ) {
  }

  @Get()
  @ApiOperation({description: 'Get list of all myst vpn provider', operationId: 'Get all myst provider'})
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
  @ApiBadRequestResponse({
    description: 'Bad Request',
    schema: {
      anyOf: [
        {
          allOf: [
            {
              title: ExceptionEnum.UNKNOWN_ERROR,
              description: 'Unknown error happened',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.REPOSITORY_ERROR,
              description: 'Fail to read data from proxy resource',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.REPOSITORY_ERROR,
                },
              },
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.FILL_DATA_REPOSITORY_ERROR,
              description: 'Can not fill data from proxy resource',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.FILL_DATA_REPOSITORY_ERROR,
                },
              },
            },
          ],
        },
      ],
    },
  })
  async findAll(@Query() queryFilterDto: FindProviderQueryDto) {
    return this._providerService.getAll(FindProviderQueryDto.toModel(queryFilterDto));
  }

  @Get(':providerId')
  @ApiOperation({description: 'Get info of one provider with ID', operationId: 'Get provider'})
  @ApiParam({name: 'providerId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiOkResponse({
    description: 'Get provider data',
    schema: {
      allOf: [
        {$ref: getSchemaPath(DefaultSuccessDto)},
        {
          properties: {
            data: {
              type: 'object',
              $ref: getSchemaPath(FindProviderOutputDto),
            },
          },
        },
      ],
    },
  })
  @ApiNotFoundResponse({
    description: 'The provider id not found.',
    schema: {
      allOf: [
        {
          $ref: getSchemaPath(NotFoundExceptionDto),
        },
        {
          properties: {
            action: {
              example: ExceptionEnum.NOT_FOUND_MYST_IDENTITY_ERROR,
            },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request',
    schema: {
      anyOf: [
        {
          allOf: [
            {
              title: ExceptionEnum.UNKNOWN_ERROR,
              description: 'Unknown error happened',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.REPOSITORY_ERROR,
              description: 'Fail to read data from downstream resource',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.REPOSITORY_ERROR,
                },
              },
            },
          ],
        },
      ],
    },
  })
  async findOne(@Param('providerId') providerId: string) {
    return this._providerService.getById(providerId);
  }

  @Put(':providerId')
  @ApiOperation({description: 'Connect to myst vpn provider', operationId: 'Connect myst provider'})
  @ApiParam({name: 'providerId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiOkResponse({
    description: 'The myst vpn has been successfully connected.',
    type: NoBodySuccessDto,
  })
  @ApiNotFoundResponse({
    description: 'The provider id not found',
    schema: {
      anyOf: [
        {
          allOf: [
            {
              title: ExceptionEnum.NOT_FOUND_ERROR,
              description: 'The provider id not found',
              $ref: getSchemaPath(NotFoundExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.NOT_FOUND_ERROR,
                },
              },
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.NOT_FOUND_MYST_IDENTITY_ERROR,
              description: 'The myst identity not found',
              $ref: getSchemaPath(NotFoundExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.NOT_FOUND_MYST_IDENTITY_ERROR,
                },
              },
            },
          ],
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request',
    schema: {
      anyOf: [
        {
          allOf: [
            {
              title: ExceptionEnum.UNKNOWN_ERROR,
              description: 'Unknown error happened',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.REPOSITORY_ERROR,
              description: 'Fail to read data from proxy resource',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.REPOSITORY_ERROR,
                },
              },
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.PROVIDER_IDENTITY_IN_USE,
              description: 'The provider identity is in use',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.PROVIDER_IDENTITY_IN_USE,
                },
              },
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.NOT_RUNNING_SERVICE,
              description: 'Can not found running myst identity service',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.NOT_FOUND_MYST_IDENTITY_ERROR,
                },
              },
            },
          ],
        },
      ],
    },
  })
  async connect(@Param('providerId') providerId: string) {
    const [error] = await this._providerService.up(providerId);
    if (error) {
      return [error];
    }

    return [null, null];
  }

  @Delete(':providerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({description: 'Disconnect form myst vpn provider', operationId: 'Disconnect myst provider'})
  @ApiParam({name: 'providerId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiNoContentResponse({
    description: 'The myst vpn has been successfully disconnected.',
  })
  @ApiNotFoundResponse({
    description: 'The provider id not found.',
    schema: {
      allOf: [
        {$ref: getSchemaPath(NotFoundExceptionDto)},
        {
          properties: {
            action: {
              example: ExceptionEnum.NOT_FOUND_ERROR,
            },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request',
    schema: {
      anyOf: [
        {
          allOf: [
            {
              title: ExceptionEnum.UNKNOWN_ERROR,
              description: 'Unknown error happened',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.REPOSITORY_ERROR,
              description: 'Fail to read data from proxy resource',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.REPOSITORY_ERROR,
                },
              },
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.PROVIDER_IDENTITY_NOT_CONNECTING,
              description: 'The provider identity is not connect',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.PROVIDER_IDENTITY_NOT_CONNECTING,
                },
              },
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.NOT_RUNNING_SERVICE,
              description: 'Can not found running myst identity service',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.NOT_FOUND_MYST_IDENTITY_ERROR,
                },
              },
            },
          ],
        },
      ],
    },
  })
  async disconnect(@Param('providerId') providerId: string) {
    return this._providerService.down(providerId);
  }
}
