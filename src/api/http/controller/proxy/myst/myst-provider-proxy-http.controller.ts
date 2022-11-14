import {
  Body,
  Controller,
  Inject,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse, ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse, ApiExtraModels, ApiForbiddenResponse, ApiNotFoundResponse,
  ApiOperation,
  ApiParam, ApiTags, ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {DefaultSuccessDto} from '@src-api/http/dto/default-success.dto';
import {FindProxyOutputDto} from '@src-api/http/controller/proxy/dto/find-proxy-output.dto';
import {ValidateExceptionDto} from '@src-api/http/dto/validate-exception.dto';
import {NotFoundExceptionDto} from '@src-api/http/dto/not-found-exception.dto';
import {ExceptionEnum} from '@src-core/enum/exception.enum';
import {DefaultExceptionDto} from '@src-api/http/dto/default-exception.dto';
import {CreateProxyWithConnectInputDto} from '@src-api/http/controller/proxy/myst/dto/create-proxy-with-connect-input.dto';
import {RoleGuard} from '@src-api/http/guard/role.guard';
import {OutputProxyInterceptor} from '@src-api/http/controller/proxy/interceptor/output-proxy.interceptor';
import {DefaultArraySuccessDto} from '@src-api/http/dto/default-array-success.dto';
import {FindProxyQueryDto} from '@src-api/http/controller/proxy/dto/find-proxy-query.dto';
import {UnauthorizedExceptionDto} from '@src-api/http/dto/unauthorized-exception.dto';
import {ForbiddenExceptionDto} from '@src-api/http/dto/forbidden-exception.dto';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {IProviderProxyInterface} from '@src-core/interface/i-provider-proxy.interface';

@Controller({
  path: 'provider/myst',
  version: '1',
})
@UseGuards(RoleGuard)
@UseInterceptors(OutputProxyInterceptor)
@ApiTags('provider')
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
export class MystProviderProxyHttpController {
  constructor(
    @Inject(ProviderTokenEnum.MYST_PROVIDER_PROXY_SERVICE_DEFAULT)
    private readonly _vpnProviderProxyService: IProviderProxyInterface,
  ) {
  }

  @Post(':providerId/proxy')
  @ApiOperation({
    description: 'Connect to myst vpn provider and create proxy',
    operationId: 'Connect myst provider and create proxy',
  })
  @ApiParam({name: 'providerId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiBody({
    type: CreateProxyWithConnectInputDto,
    examples: {
      withoutListener: {
        description: 'Without port (use random port) listener',
        value: {} as CreateProxyWithConnectInputDto,
      },
      withPortListener: {
        description: 'With custom port listener',
        value: {
          listenPort: 8080,
        } as CreateProxyWithConnectInputDto,
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
  async create(@Param('providerId') providerId: string, @Body() createProxyDto: CreateProxyWithConnectInputDto) {
    return this._vpnProviderProxyService.create(CreateProxyWithConnectInputDto.toModel(providerId, createProxyDto));
  }
}
