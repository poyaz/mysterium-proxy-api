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
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import {CreateUserInputDto} from './dto/create-user-input.dto';
import {UpdatePasswordInputDto} from './dto/update-password-input.dto';
import {I_USER_SERVICE, IUsersServiceInterface} from '../../../../core/interface/i-users-service.interface';
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
  ApiParam, ApiQuery,
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
import {LoginInputDto} from './dto/login-input.dto';
import {I_AUTH_SERVICE, IAuthServiceInterface} from '../../../../core/interface/i-auth-service.interface';
import {DefaultArraySuccessDto} from '../../dto/default-array-success.dto';

@Controller({
  path: 'users',
  version: '1',
})
@UseGuards(RolesGuard)
@ApiTags('users')
@ApiExtraModels(DefaultSuccessDto, DefaultArraySuccessDto, FindUserOutputDto, NotFoundExceptionDto, FindUserQueryDto)
@ApiUnauthorizedResponse({description: 'Unauthorized', type: UnauthorizedExceptionDto})
@ApiBadRequestResponse({description: 'Bad Request', type: DefaultExceptionDto})
export class UsersHttpController {
  constructor(
    @Inject(I_USER_SERVICE.DEFAULT)
    private readonly _usersService: IUsersServiceInterface,
    @Inject(I_AUTH_SERVICE.DEFAULT)
    private readonly _authService: IAuthServiceInterface,
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
  @ApiBearerAuth()
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
  @ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
  async findAll(@Query() queryFilterDto: FindUserQueryDto) {
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
  @ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
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
  @ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
  async updateAdmin(@Param('userId') userId: string, @Body() updateUserDto: UpdateUserAdminInputDto) {
    return this._usersService.update(UpdateUserAdminInputDto.toModel(userId, updateUserDto));
  }

  @Patch(':userId')
  @Roles(UserRoleEnum.USER)
  @ApiOperation({description: 'Change password of user', operationId: 'Change password of user'})
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
  @ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
  async updatePassword(@Param('userId') userId: string, @Body() updateUserDto: UpdatePasswordInputDto) {
    return this._usersService.update(UpdatePasswordInputDto.toModel(userId, updateUserDto));
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
  @ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
  async remove(@Param('userId') userId: string) {
    return this._usersService.remove(userId);
  }

  @Post('/login')
  @HttpCode(200)
  @ExcludeAuth()
  @ApiOperation({description: 'Login user exist in system', operationId: 'Login user'})
  @ApiOkResponse({
    description: 'The user has been successfully login.',
    schema: {
      allOf: [
        {$ref: getSchemaPath(DefaultSuccessDto)},
        {
          properties: {
            data: {
              type: 'string',
              example: 'JWT token',
            },
          },
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access when your login information not valid',
    type: UnauthorizedExceptionDto,
  })
  async login(@Body() loginDto: LoginInputDto) {
    const {username, password} = LoginInputDto.toObject(loginDto);

    return this._authService.login(username, password);
  }
}
