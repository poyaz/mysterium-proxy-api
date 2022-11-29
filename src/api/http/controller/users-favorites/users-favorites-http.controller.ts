import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus, Inject,
  Param,
  Patch,
  Post,
  Put,
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
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
import {ForbiddenExceptionDto} from '@src-api/http/dto/forbidden-exception.dto';
import {DefaultSuccessDto} from '@src-api/http/dto/default-success.dto';
import {DefaultArraySuccessDto} from '@src-api/http/dto/default-array-success.dto';
import {DefaultExceptionDto} from '@src-api/http/dto/default-exception.dto';
import {FindUsersFavoritesQueryDto} from '@src-api/http/controller/users-favorites/dto/find-users-favorites-query.dto';
import {ExceptionEnum} from '@src-core/enum/exception.enum';
import {ValidateExceptionDto} from '@src-api/http/dto/validate-exception.dto';
import {CreateUsersFavoritesInputDto} from '@src-api/http/controller/users-favorites/dto/create-users-favorites-input.dto';
import {FavoritesListTypeEnum} from '@src-core/model/favorites.model';
import {CreateUsersFavoritesBulkInputDto} from '@src-api/http/controller/users-favorites/dto/create-users-favorites-bulk-input.dto';
import {OwnAccess} from '@src-api/http/decorator/own-access.decorator';
import {FindUsersFavoritesOutputDto} from '@src-api/http/controller/users-favorites/dto/find-users-favorites-output.dto';
import {ProxyStatusEnum} from '@src-core/model/proxy.model';
import {UpdateUsersFavoritesInputDto} from '@src-api/http/controller/users-favorites/dto/update-users-favorites-input.dto';
import {NoBodySuccessDto} from '@src-api/http/dto/no-body-success.dto';
import {UpdateUsersFavoritesBulkKindInputDto} from '@src-api/http/controller/users-favorites/dto/update-users-favorites-bulk-kind-input.dto';
import {DeleteUsersFavoritesBulkInputDto} from '@src-api/http/controller/users-favorites/dto/delete-users-favorites-bulk-input.dto';
import {IFavoritesServiceInterface} from '@src-core/interface/i-favorites-service.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';

@Controller({
  path: 'users',
  version: '1',
})
@UseGuards(RoleGuard)
@Roles(UserRoleEnum.USER, UserRoleEnum.ADMIN)
@OwnAccess()
@ApiBearerAuth()
@ApiTags('users - favorites list')
@ApiExtraModels(
  DefaultSuccessDto,
  DefaultArraySuccessDto,
  DefaultExceptionDto,
  CreateUsersFavoritesInputDto,
  CreateUsersFavoritesBulkInputDto,
  FindUsersFavoritesOutputDto,
)
@ApiUnauthorizedResponse({description: 'Unauthorized', type: UnauthorizedExceptionDto})
@ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
export class UsersFavoritesHttpController {
  constructor(
    @Inject(ProviderTokenEnum.FAVORITES_SERVICE_DEFAULT)
    private readonly _favoritesService: IFavoritesServiceInterface,
  ) {
  }

  @Get(':userId/favorites')
  @ApiOperation({
    description: 'The list of favorites user has created by own user',
    operationId: 'Get user favorites provider',
  })
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
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
                    $ref: getSchemaPath(FindUsersFavoritesOutputDto),
                  },
                },
              },
            },
          ],
        },
        examples: {
          'With data': {
            description: 'With records',
            value: {
              count: 2,
              data: [
                <FindUsersFavoritesOutputDto>{
                  id: '00000000-0000-0000-0000-000000000000',
                  kind: FavoritesListTypeEnum.FAVORITE,
                  proxy: {
                    id: '00000000-0000-0000-0000-000000000000',
                    listenAddr: 'proxy.example.com',
                    listenPort: 3128,
                    outgoingIp: '55.12.60.0',
                    outgoingCountry: 'GB',
                    status: ProxyStatusEnum.ONLINE,
                    auth: {
                      'id': '00000000-0000-0000-0000-000000000000',
                      'username': 'my-user',
                      'password': 'my password',
                    },
                  },
                  insertDate: '2022-01-01 00:00:00',
                },
                <FindUsersFavoritesOutputDto>{
                  id: '00000000-0000-0000-0000-000000000000',
                  kind: FavoritesListTypeEnum.TODAY,
                  proxy: {
                    id: '00000000-0000-0000-0000-000000000000',
                    listenAddr: 'proxy.example.com',
                    listenPort: 3129,
                    outgoingIp: '20.112.0.10',
                    outgoingCountry: 'GB',
                    status: ProxyStatusEnum.ONLINE,
                    auth: {
                      'id': '00000000-0000-0000-0000-000000000000',
                      'username': 'my-user',
                      'password': 'my password',
                    },
                  },
                  note: 'This is my note about this proxy',
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
  async findByUserId(@Param('userId') userId: string, @Query() queryFilterDto: FindUsersFavoritesQueryDto) {
    return this._favoritesService.getByUserId(userId, FindUsersFavoritesQueryDto.toModel(queryFilterDto));
  }

  @Post(':userId/favorites')
  @ApiOperation({description: 'Register new bulk group of favorites', operationId: 'Add new bulk favorite'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiBody({
    schema: {
      $ref: getSchemaPath(CreateUsersFavoritesBulkInputDto),
    },
    examples: {
      'Add multiply providers into favorite list': {
        description: 'Add multiply providers into favorite list',
        value: <CreateUsersFavoritesBulkInputDto>{
          kind: FavoritesListTypeEnum.FAVORITE,
          bulk: [
            {proxyId: '00000000-0000-0000-0000-000000000000'},
          ],
        },
      },
      'Add multiply providers into favorite list (With note)': {
        description: 'Add multiply providers into favorite list (With note)',
        value: <CreateUsersFavoritesBulkInputDto>{
          kind: FavoritesListTypeEnum.FAVORITE,
          bulk: [
            {
              proxyId: '00000000-0000-0000-0000-000000000000',
              note: 'Information about proxy X',
            },
          ],
        },
      },
      'Add multiply providers into today list': {
        description: 'Add multiply providers into today list',
        value: <CreateUsersFavoritesBulkInputDto>{
          kind: FavoritesListTypeEnum.TODAY,
          bulk: [
            {proxyId: '00000000-0000-0000-0000-000000000000'},
          ],
        },
      },
      'Add multiply providers into today list (With note)': {
        description: 'Add multiply providers into today list (With note)',
        value: <CreateUsersFavoritesBulkInputDto>{
          kind: FavoritesListTypeEnum.TODAY,
          bulk: [
            {
              proxyId: '00000000-0000-0000-0000-000000000000',
              note: 'Information about proxy X',
            },
          ],
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'The proxy has been successfully created.',
    schema: {
      allOf: [
        {$ref: getSchemaPath(DefaultArraySuccessDto)},
        {
          properties: {
            data: {
              type: 'array',
              minItems: 0,
              items: {
                $ref: getSchemaPath(FindUsersFavoritesOutputDto),
              },
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
  @ApiUnprocessableEntityResponse({description: 'Unprocessable Entity', type: ValidateExceptionDto})
  async createBulkByUserId(
    @Param('userId') userId: string,
    @Body() createUsersFavoritesBulkDto: CreateUsersFavoritesBulkInputDto,
  ) {
    return this._favoritesService.createBulk(CreateUsersFavoritesBulkInputDto.toModel(createUsersFavoritesBulkDto));
  }

  @Put(':userId/favorites/:favoriteId')
  @ApiOperation({description: 'Update exist favorite', operationId: 'Update favorite'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiParam({name: 'favoriteId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiOkResponse({type: NoBodySuccessDto})
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
  async updateByUserId(
    @Param('userId') userId: string,
    @Param('favoriteId') favoriteId: string,
    @Body() updateFavoriteDto: UpdateUsersFavoritesInputDto,
  ) {
    return this._favoritesService.update(UpdateUsersFavoritesInputDto.toModel(favoriteId, updateFavoriteDto));
  }

  @Patch(':userId/favorites')
  @ApiOperation({description: 'Change bulk group of favorites', operationId: 'Change bulk favorite'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiOkResponse({type: NoBodySuccessDto})
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
  async updateBulkKindByUserId(
    @Param('userId') userId: string,
    @Body() updateFavoriteDto: UpdateUsersFavoritesBulkKindInputDto,
  ) {
    return this._favoritesService.updateBulkKind(updateFavoriteDto.kind, updateFavoriteDto.proxiesList);
  }

  @Delete(':userId/favorites')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({description: 'Delete bulk group of favorites', operationId: 'Remove bulk favorite'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiNoContentResponse({
    description: 'The favorites list has been successfully deleted.',
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
      ],
    },
  })
  async removeBulkByUserId(
    @Param('userId') userId: string,
    @Body() deleteBulkFavoriteDto: DeleteUsersFavoritesBulkInputDto,
  ) {
    return [null, deleteBulkFavoriteDto];
  }
}
