import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  Put,
  HttpCode,
  HttpStatus,
  UseGuards, UseInterceptors, Query,
} from '@nestjs/common';
import {CreateUserInputDto} from './dto/create-user-input.dto';
import {UpdatePasswordInputDto} from './dto/update-password-input.dto';
import {I_USER_SERVICE, IUsersService} from '../../../../core/interface/i-users-service.interface';
import {UpdateUserAdminInputDto} from './dto/update-user-admin-input.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth, ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags, ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {FindUserOutputDto} from './dto/find-user-output.dto';
import {ValidateExceptionDto} from '../../dto/validate-exception.dto';
import {DefaultExceptionDto} from '../../dto/default-exception.dto';
import {NoBodySuccessDto} from '../../dto/no-body-success.dto';
import {RolesGuard} from '../../guard/roles.guard';
import {UserRoleEnum} from '../../../../core/enum/user-role.enum';
import {Roles} from '../../decorator/roles.decorator';
import {ExcludeAuth} from '../../decorator/exclude-auth.decorator';
import {CreateAdminUserGuard} from './guard/create-admin-user.guard';
import {DefaultSuccessDto} from '../../dto/default-success.dto';
import {UnauthorizedExceptionDto} from '../../dto/unauthorized-exception.dto';
import {ForbiddenExceptionDto} from '../../dto/forbidden-exception.dto';
import {NotFoundExceptionDto} from '../../dto/not-found-exception.dto';
import {RemovePasswordFieldOfUserInterceptor} from './interceptor/remove-password-field-of-user.interceptor';
import {FindUserQueryDto} from './dto/find-user-query.dto';
import {ExceptionEnum} from '../../../../core/enum/exception.enum';

@Controller('users')
@UseGuards(RolesGuard)
@ApiTags('users')
@ApiExtraModels(DefaultSuccessDto, FindUserOutputDto, NotFoundExceptionDto)
@ApiUnauthorizedResponse({description: 'Unauthorized', type: UnauthorizedExceptionDto})
@ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
@ApiBadRequestResponse({description: 'Bad Request', type: DefaultExceptionDto})
export class UsersHttpController {
  constructor(
    @Inject(I_USER_SERVICE.DEFAULT)
    private readonly _usersService: IUsersService,
  ) {
  }

  @Post()
  @ExcludeAuth()
  @Roles(UserRoleEnum.ADMIN)
  @UseGuards(CreateAdminUserGuard)
  @ApiOperation({description: 'Register new user', operationId: 'Add new user'})
  @ApiBody({
    type: CreateUserInputDto,
    examples: {
      anonymous: {
        description: 'Anonymous user register',
        value: {
          username: 'my-user',
          password: 'my password',
          confirmPassword: 'my password',
        } as CreateUserInputDto,
      },
      admin: {
        description: 'Admin user register',
        value: {
          username: 'my-user',
          password: 'my password',
          confirmPassword: 'my password',
          isEnable: false,
        } as CreateUserInputDto,
      },
    },
  })
  @ApiCreatedResponse({
    description: 'The user has been successfully created.',
    schema: {
      allOf: [
        {$ref: getSchemaPath(DefaultSuccessDto)},
        {
          properties: {
            data: {
              type: 'object',
              $ref: getSchemaPath(FindUserOutputDto),
            },
          },
        },
      ],
    },
  })
  @ApiUnprocessableEntityResponse({description: 'Unprocessable Entity', type: ValidateExceptionDto})
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access when you filled attributes properties which need authentication',
    type: UnauthorizedExceptionDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden access when you filled attributes properties which need access to this field',
    type: ForbiddenExceptionDto,
  })
  async create(@Body() createUserDto: CreateUserInputDto) {
    return this._usersService.create(CreateUserInputDto.toModel(createUserDto));
  }

  @Get()
  @Roles(UserRoleEnum.ADMIN)
  @UseInterceptors(RemovePasswordFieldOfUserInterceptor)
  @ApiOperation({description: 'Get all users', operationId: 'Get all users'})
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      anyOf: [
        {
          allOf: [
            {
              title: 'With data',
            },
            {$ref: getSchemaPath(DefaultSuccessDto)},
            {
              properties: {
                data: {
                  type: 'array',
                  items: {
                    $ref: getSchemaPath(FindUserOutputDto),
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
            {$ref: getSchemaPath(DefaultSuccessDto)},
            {
              properties: {
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
  findAll(@Query('filter') queryFilterDto: FindUserQueryDto) {
    return this._usersService.findAll(FindUserQueryDto.toModel(queryFilterDto));
  }

  @Get(':userId')
  @Roles(UserRoleEnum.ADMIN, UserRoleEnum.USER)
  @UseInterceptors(RemovePasswordFieldOfUserInterceptor)
  @ApiOperation({description: 'Get info of one user with ID', operationId: 'Get user'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      allOf: [
        {$ref: getSchemaPath(DefaultSuccessDto)},
        {
          properties: {
            data: {
              type: 'object',
              $ref: getSchemaPath(FindUserOutputDto),
            },
          },
        },
      ],
    },
  })
  @ApiNotFoundResponse({
    description: 'The user id not found.',
    schema: {
      allOf: [
        {$ref: getSchemaPath(NotFoundExceptionDto)},
        {
          properties: {
            action: {
              example: ExceptionEnum.NOT_FOUND_USER_ERROR,
            },
          },
        },
      ],
    },
  })
  async findOne(@Param('userId') userId: string) {
    return this._usersService.findOne(userId);
  }

  @Put(':userId')
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({description: 'Update all fields of users', operationId: 'Update user info by admin'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiBearerAuth()
  @ApiOkResponse({type: NoBodySuccessDto})
  @ApiNotFoundResponse({
    description: 'The user id not found.',
    schema: {
      allOf: [
        {$ref: getSchemaPath(NotFoundExceptionDto)},
        {
          properties: {
            action: {
              example: ExceptionEnum.NOT_FOUND_USER_ERROR,
            },
          },
        },
      ],
    },
  })
  async updateAdmin(@Param('userId') userId: string, @Body() updateUserDto: UpdateUserAdminInputDto) {
    return this._usersService.update(UpdateUserAdminInputDto.toModel(userId, updateUserDto));
  }

  @Patch(':userId')
  @Roles(UserRoleEnum.USER)
  @ApiOperation({description: 'Update password of user', operationId: 'Update password of user'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiBearerAuth()
  @ApiOkResponse({type: NoBodySuccessDto})
  @ApiNotFoundResponse({
    description: 'The user id not found.',
    schema: {
      allOf: [
        {$ref: getSchemaPath(NotFoundExceptionDto)},
        {
          properties: {
            action: {
              example: ExceptionEnum.NOT_FOUND_USER_ERROR,
            },
          },
        },
      ],
    },
  })
  async updatePassword(@Param('userId') userId: string, @Body() updateUserDto: UpdatePasswordInputDto) {
    return this._usersService.update(UpdatePasswordInputDto.toModel(updateUserDto));
  }

  @Delete(':userId')
  @Roles(UserRoleEnum.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({description: 'Delete user with ID', operationId: 'Remove user'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiBearerAuth()
  @ApiNoContentResponse({
    description: 'The user has been successfully deleted.',
  })
  @ApiNotFoundResponse({
    description: 'The user id not found.',
    schema: {
      allOf: [
        {$ref: getSchemaPath(NotFoundExceptionDto)},
        {
          properties: {
            action: {
              example: ExceptionEnum.NOT_FOUND_USER_ERROR,
            },
          },
        },
      ],
    },
  })
  async remove(@Param('userId') userId: string) {
    return this._usersService.remove(userId);
  }
}
