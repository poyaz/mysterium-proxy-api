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
  UseGuards,
} from '@nestjs/common';
import {RoleGuard} from '@src-api/http/guard/role.guard';
import {Roles} from '@src-api/http/decorator/roles.decorator';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody, ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation, ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse, ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {DefaultSuccessDto} from '@src-api/http/dto/default-success.dto';
import {DefaultArraySuccessDto} from '@src-api/http/dto/default-array-success.dto';
import {DefaultExceptionDto} from '@src-api/http/dto/default-exception.dto';
import {UnauthorizedExceptionDto} from '@src-api/http/dto/unauthorized-exception.dto';
import {ForbiddenExceptionDto} from '@src-api/http/dto/forbidden-exception.dto';
import {FindAclQueryDto} from '@src-api/http/controller/acl/dto/find-acl-query.dto';
import {FindUserQueryDto} from '@src-api/http/controller/users/dto/find-user-query.dto';
import {ExceptionEnum} from '@src-core/enum/exception.enum';
import {FindAclOutputDto} from '@src-api/http/controller/acl/dto/find-acl-output.dto';
import {ProxyAclMode, ProxyAclType} from '@src-core/model/proxyAclModel';
import {AclPortInputDto, CreateAclInputDto, UserInputDto} from '@src-api/http/controller/acl/dto/create-acl-input.dto';
import {ValidateExceptionDto} from '@src-api/http/dto/validate-exception.dto';
import {NotFoundExceptionDto} from '@src-api/http/dto/not-found-exception.dto';
import {IProxyAclServiceInterface} from '@src-core/interface/i-proxy-acl-service.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';

@Controller({
  path: 'acl',
  version: '1',
})
@UseGuards(RoleGuard)
@Roles(UserRoleEnum.ADMIN)
@ApiBearerAuth()
@ApiTags('acl')
@ApiExtraModels(
  DefaultSuccessDto,
  DefaultArraySuccessDto,
  DefaultExceptionDto,
  FindUserQueryDto,
  FindAclOutputDto,
  CreateAclInputDto,
  UserInputDto,
  AclPortInputDto,
)
@ApiUnauthorizedResponse({description: 'Unauthorized', type: UnauthorizedExceptionDto})
@ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
export class AclHttpController {
  constructor(
    @Inject(ProviderTokenEnum.PROXY_ACL_SERVICE_DEFAULT)
    private readonly _proxyAclService: IProxyAclServiceInterface,
  ) {
  }

  @Get()
  @ApiOperation({description: 'Get all acl', operationId: 'Get all acl'})
  @ApiQuery({
    name: 'sorts',
    required: false,
    style: 'deepObject',
    explode: true,
    type: 'object',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    style: 'deepObject',
    explode: true,
    type: 'object',
  })
  @ApiQuery({
    name: 'filters[user]',
    required: false,
    style: 'deepObject',
    explode: true,
    type: 'object',
    examples: {
      'No user filter': {
        value: {},
      },
      'with user id': {
        description: 'Search with user id',
        value: {
          id: '00000000-0000-0000-0000-000000000000',
        },
      },
    },
  })
  @ApiOkResponse({
    content: {
      'application/json': {
        schema: {
          allOf: [
            {$ref: getSchemaPath(DefaultArraySuccessDto)},
            {
              properties: {
                data: {
                  type: 'array',
                  minItems: 0,
                  items: {
                    $ref: getSchemaPath(FindAclOutputDto),
                  },
                },
              },
            },
          ],
        },
        examples: {
          'With access all users to all ports': {
            description: 'All users access to all ports',
            value: {
              count: 1,
              data: [
                <FindAclOutputDto>{
                  id: '00000000-0000-0000-0000-000000000000',
                  mode: ProxyAclMode.ALL,
                  type: ProxyAclType.USER_PORT,
                  proxies: [],
                  insertDate: '2022-01-01 00:00:00',
                },
              ],
              status: 'success',
            },
          },
          'With access one users to all ports': {
            description: 'All users access to all ports',
            value: {
              count: 1,
              data: [
                <FindAclOutputDto>{
                  id: '00000000-0000-0000-0000-000000000000',
                  mode: ProxyAclMode.ALL,
                  type: ProxyAclType.USER_PORT,
                  user: {
                    id: '00000000-0000-0000-0000-000000000000',
                    username: 'user1',
                  },
                  proxies: [],
                  insertDate: '2022-01-01 00:00:00',
                },
              ],
              status: 'success',
            },
          },
          'With access one users to multiply ports': {
            description: 'All users access to all ports',
            value: {
              count: 2,
              data: [
                <FindAclOutputDto>{
                  id: '00000000-0000-0000-0000-000000000000',
                  mode: ProxyAclMode.CUSTOM,
                  type: ProxyAclType.USER_PORT,
                  user: {
                    id: '00000000-0000-0000-0000-000000000000',
                    username: 'user1',
                  },
                  proxies: [{port: 3128}, {port: 3129}],
                  insertDate: '2022-01-01 00:00:00',
                },
                <FindAclOutputDto>{
                  id: '00000000-0000-0000-0000-000000000000',
                  mode: ProxyAclMode.CUSTOM,
                  type: ProxyAclType.USER_PORT,
                  user: {
                    id: '00000000-0000-0000-0000-000000000000',
                    username: 'user1',
                  },
                  proxies: [{port: 3130}],
                  insertDate: '2022-01-01 00:00:00',
                },
              ],
              status: 'success',
            },
          },
          'Without data': {
            description: 'Without any records',
            value: {
              count: 0,
              data: [],
              status: 'success',
            },
          },
        },
      },
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
  @ApiUnprocessableEntityResponse({description: 'Unprocessable Entity', type: ValidateExceptionDto})
  async findAll(@Query() queryFilterDto: FindAclQueryDto) {
    return this._proxyAclService.getAll(FindAclQueryDto.toModel(queryFilterDto));
  }

  @Post()
  @ApiOperation({description: 'Add new acl', operationId: 'Add new acl'})
  @ApiBody({
    schema: {
      allOf: [
        {$ref: getSchemaPath(CreateAclInputDto)},
        {
          oneOf: [
            {
              description: 'Add new acl for access all port to all users',
              title: 'Access all users to all ports',
              required: [],
            },
            {
              description: 'Add new acl for access all port to one users',
              title: 'Access one user to all ports',
              properties: {
                user: {
                  $ref: getSchemaPath(UserInputDto),
                },
              },
              required: ['user'],
            },
            {
              description: 'Add new acl for access one or multiply port to one users',
              title: 'Access one users to one or multiply port',
              properties: {
                user: {
                  $ref: getSchemaPath(UserInputDto),
                },
                proxies: {
                  type: 'array',
                  items: {
                    $ref: getSchemaPath(AclPortInputDto),
                  },
                },
              },
              required: ['user', 'proxies'],
            },
          ],
        },
      ],
    },
    examples: {
      'Access all users to all ports': {
        description: 'Access all users to all ports',
        value: <CreateAclInputDto>{
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
        },
      },
      'Access one users to all ports': {
        description: 'Access one users to all ports',
        value: <CreateAclInputDto>{
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          user: {
            id: '00000000-0000-0000-0000-000000000000',
          },
        },
      },
      'Access one users to one ports': {
        description: 'Access one users to all ports',
        value: <CreateAclInputDto>{
          mode: ProxyAclMode.CUSTOM,
          type: ProxyAclType.USER_PORT,
          user: {
            id: '00000000-0000-0000-0000-000000000000',
          },
          proxies: <Array<AclPortInputDto>>[{port: 3128}],
        },
      },
      'Access one users to multiply ports': {
        description: 'Access one users to all ports',
        value: <CreateAclInputDto>{
          mode: ProxyAclMode.CUSTOM,
          type: ProxyAclType.USER_PORT,
          user: {
            id: '00000000-0000-0000-0000-000000000000',
          },
          proxies: <Array<AclPortInputDto>>[{port: 3128}, {port: 3129}, {port: 3130}],
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'The acl has been successfully created.',
    schema: {
      allOf: [
        {$ref: getSchemaPath(DefaultSuccessDto)},
        {
          properties: {
            data: {
              type: 'object',
              $ref: getSchemaPath(FindAclOutputDto),
            },
          },
        },
      ],
    },
  })
  @ApiUnprocessableEntityResponse({description: 'Unprocessable Entity', type: ValidateExceptionDto})
  async create(@Body() createAclDto: CreateAclInputDto) {
    return this._proxyAclService.create(CreateAclInputDto.toModel(createAclDto));
  }

  @Delete(':aclId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({description: 'Delete acl with ID', operationId: 'Remove acl'})
  @ApiParam({name: 'aclId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiNoContentResponse({
    description: 'The acl has been successfully deleted.',
  })
  @ApiNotFoundResponse({description: 'The acl not found', type: NotFoundExceptionDto})
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
  async remove(@Param('aclId') aclId: string) {
    return [null, null];
  }
}
