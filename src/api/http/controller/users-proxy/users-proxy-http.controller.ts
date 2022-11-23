import {Controller, Get, Inject, Param, Query, UseGuards, UseInterceptors} from '@nestjs/common';
import {RoleGuard} from '@src-api/http/guard/role.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth, ApiExtraModels,
  ApiForbiddenResponse, ApiOkResponse,
  ApiOperation,
  ApiParam, ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse, getSchemaPath,
} from '@nestjs/swagger';
import {UnauthorizedExceptionDto} from '@src-api/http/dto/unauthorized-exception.dto';
import {ForbiddenExceptionDto} from '@src-api/http/dto/forbidden-exception.dto';
import {Roles} from '@src-api/http/decorator/roles.decorator';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {DefaultSuccessDto} from '@src-api/http/dto/default-success.dto';
import {DefaultArraySuccessDto} from '@src-api/http/dto/default-array-success.dto';
import {DefaultExceptionDto} from '@src-api/http/dto/default-exception.dto';
import {FindUserProxyOutputDto} from '@src-api/http/controller/users-proxy/dto/find-user-proxy-output.dto';
import {ExceptionEnum} from '@src-core/enum/exception.enum';
import {IUsersProxyServiceInterface} from '@src-core/interface/i-users-proxy-service.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {FindUsersProxyQueryDto} from '@src-api/http/controller/users-proxy/dto/find-users-proxy-query.dto';
import {OutputUsersProxyInterceptor} from '@src-api/http/controller/users-proxy/interceptor/output-users-proxy.interceptor';

@Controller({
  path: 'users',
  version: '1',
})
@UseGuards(RoleGuard)
@Roles(UserRoleEnum.ADMIN, UserRoleEnum.USER)
@ApiBearerAuth()
@ApiTags('users')
@ApiExtraModels(
  DefaultSuccessDto,
  DefaultArraySuccessDto,
  DefaultExceptionDto,
  FindUserProxyOutputDto,
  FindUsersProxyQueryDto,
)
@ApiUnauthorizedResponse({description: 'Unauthorized', type: UnauthorizedExceptionDto})
@ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
export class UsersProxyHttpController {
  constructor(
    @Inject(ProviderTokenEnum.USERS_PROXY_SERVICE_DEFAULT)
    private readonly _usersProxyService: IUsersProxyServiceInterface,
  ) {
  }

  @Get(':userId/proxy')
  @UseInterceptors(OutputUsersProxyInterceptor)
  @ApiOperation({description: 'The list of proxies user has access to it', operationId: 'Get user access proxy'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiQuery({
    name: 'sorts',
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
                    $ref: getSchemaPath(FindUserProxyOutputDto),
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
  async findByUserId(@Param('userId') userId: string, @Query() queryFilterDto: FindUsersProxyQueryDto) {
    return this._usersProxyService.getByUserId(userId, FindUsersProxyQueryDto.toModel(queryFilterDto));
  }
}
