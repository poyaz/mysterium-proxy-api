import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import {RoleGuard} from '@src-api/http/guard/role.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {UnauthorizedExceptionDto} from '@src-api/http/dto/unauthorized-exception.dto';
import {DefaultExceptionDto} from '@src-api/http/dto/default-exception.dto';
import {Roles} from '@src-api/http/decorator/roles.decorator';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {ForbiddenExceptionDto} from '@src-api/http/dto/forbidden-exception.dto';
import {DefaultArraySuccessDto} from '@src-api/http/dto/default-array-success.dto';
import {FindProxyOutputDto} from '@src-api/http/controller/proxy/dto/find-proxy-output.dto';
import {DefaultSuccessDto} from '@src-api/http/dto/default-success.dto';
import {FindProxyQueryDto} from '@src-api/http/controller/proxy/dto/find-proxy-query.dto';
import {ExceptionEnum} from '@src-core/enum/exception.enum';
import {CreateProxyInputDto} from '@src-api/http/controller/proxy/dto/create-proxy-input.dto';
import {ValidateExceptionDto} from '@src-api/http/dto/validate-exception.dto';
import {NotFoundExceptionDto} from '@src-api/http/dto/not-found-exception.dto';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {IProxyServiceInterface} from '@src-core/interface/i-proxy-service.interface';
import {OutputProxyInterceptor} from '@src-api/http/controller/proxy/interceptor/output-proxy.interceptor';

@Controller({
  path: 'proxy',
  version: '1',
})
@UseGuards(RoleGuard)
@UseInterceptors(OutputProxyInterceptor)
@ApiTags('proxy')
@ApiBearerAuth()
@ApiExtraModels(
  DefaultSuccessDto,
  DefaultArraySuccessDto,
  DefaultExceptionDto,
  FindProxyQueryDto,
  FindProxyOutputDto,
)
@ApiUnauthorizedResponse({description: 'Unauthorized', type: UnauthorizedExceptionDto})
@ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
export class ProxyHttpController {
  constructor(
    @Inject(ProviderTokenEnum.PROXY_SERVICE_DEFAULT)
    private readonly _proxyService: IProxyServiceInterface,
  ) {
  }

  @Get()
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({description: 'Get list of all proxy', operationId: 'Get all proxy'})
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
                    $ref: getSchemaPath(FindProxyOutputDto),
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
  async findAll(@Query() queryFilterDto: FindProxyQueryDto) {
    return this._proxyService.getAll(FindProxyQueryDto.toModel(queryFilterDto));
  }

  @Post()
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({description: 'Register new proxy', operationId: 'Add new proxy'})
  @ApiBody({
    type: CreateProxyInputDto,
    examples: {
      withoutListener: {
        description: 'Without address (use default address) and port (use random port) listener',
        value: {} as CreateProxyInputDto,
      },
      withAddressListener: {
        description: 'With custom address listener (Use random port)',
        value: {
          listenAddr: 'proxy2.example.com',
        } as CreateProxyInputDto,
      },
      withPortListener: {
        description: 'With custom port listener (Use default address listener)',
        value: {
          listenPort: 8080,
        } as CreateProxyInputDto,
      },
      withAddressAndPortListener: {
        description: 'With custom address and port listener',
        value: {
          listenAddr: 'proxy2.example.com',
          listenPort: 8080,
        } as CreateProxyInputDto,
      },
    },
  })
  @ApiCreatedResponse({
    description: 'The proxy has been successfully created.',
    schema: {
      allOf: [
        {$ref: getSchemaPath(DefaultSuccessDto)},
        {
          properties: {
            data: {
              type: 'object',
              $ref: getSchemaPath(FindProxyOutputDto),
            },
          },
        },
      ],
    },
  })
  @ApiUnprocessableEntityResponse({description: 'Unprocessable Entity', type: ValidateExceptionDto})
  @ApiNotFoundResponse({description: 'The proxy not found', type: NotFoundExceptionDto})
  @ApiBadRequestResponse({
    description: 'Bad request',
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
  async create(@Body() createProxyDto: CreateProxyInputDto) {
    return this._proxyService.create(CreateProxyInputDto.toModel(createProxyDto));
  }

  @Delete(':proxyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({description: 'Delete proxy with ID', operationId: 'Remove proxy'})
  @ApiParam({name: 'proxyId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiNoContentResponse({
    description: 'The proxy has been successfully deleted.',
  })
  @ApiNotFoundResponse({description: 'The proxy not found', type: NotFoundExceptionDto})
  @ApiBadRequestResponse({
    description: 'Bad request',
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
  async remove(@Param('proxyId') proxyId: string) {
  }
}
