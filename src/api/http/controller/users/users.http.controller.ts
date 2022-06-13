import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  HttpException,
  Put,
  HttpCode,
  HttpStatus, UseGuards, SetMetadata, UsePipes,
} from '@nestjs/common';
import {CreateUserInputDto} from './dto/create-user-input.dto';
import {UpdatePasswordInputDto} from './dto/update-password-input.dto';
import {I_USER_SERVICE, IUsersService} from '../../../../core/interface/i-users-service.interface';
import {UpdateUserAdminInputDto} from './dto/update-user-admin-input.dto';
import {
  ApiBasicAuth,
  ApiBearerAuth, ApiBody,
  ApiCreatedResponse, ApiExtraModels,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiParamOptions,
  ApiQuery,
  ApiResponse, ApiResponseProperty,
  ApiTags,
  ApiUnprocessableEntityResponse, getSchemaPath, refs,
} from '@nestjs/swagger';
import {FindUserInputDto} from './dto/find-user-input.dto';
import {ValidateExceptionDto} from '../../dto/validate-exception.dto';
import {ApiResponseModelProperty} from '@nestjs/swagger/dist/decorators/api-model-property.decorator';
import {DefaultException} from '../../dto/default-exception.dto';
import {NoBodySuccessDto} from '../../dto/no-body-success.dto';
import {RolesGuard} from '../../guard/roles.guard';
import {UserRoleEnum} from '../../../../core/enum/user-role.enum';
import {Roles} from '../../decorator/roles.decorator';
import {ExcludeAuth} from '../../decorator/exclude-auth.decorator';
import {CreateAdminUserGuard} from './guard/create-admin-user.guard';

@Controller('users')
@UseGuards(RolesGuard)
@ApiTags('users')
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
  @ApiOperation({description: 'Register new user'})
  @ApiCreatedResponse({description: 'The user has been successfully created.', type: FindUserInputDto})
  @ApiUnprocessableEntityResponse({
    description: 'Unprocessable Entity', type: ValidateExceptionDto,
  })
  @ApiBody({
    type: CreateUserInputDto,
    examples: {
      anonymous: {
        description: 'Anonymous user register',
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
  create(@Body() createUserDto: CreateUserInputDto) {
    console.log(CreateUserInputDto.toModel(createUserDto));

    return this._usersService.create(CreateUserInputDto.toModel(createUserDto));
  }

  @Get()
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({description: 'Get all users'})
  @ApiBearerAuth()
  @ApiOkResponse({type: FindUserInputDto, isArray: true})
  findAll() {
    return this._usersService.findAll();
  }

  @Get(':userId')
  @Roles(UserRoleEnum.ADMIN, UserRoleEnum.USER)
  @ApiOperation({description: 'Get info of one user with ID'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiBearerAuth()
  @ApiOkResponse({type: FindUserInputDto})
  @ApiNotFoundResponse({description: 'The user id not found.'})
  findOne(@Param('userId') userId: string) {
    return this._usersService.findOne(userId);
  }

  @Put(':userId')
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({description: 'Update all fields of users'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiBearerAuth()
  @ApiOkResponse({type: NoBodySuccessDto})
  @ApiNotFoundResponse({description: 'The user id not found.'})
  updateAdmin(@Param('userId') userId: string, @Body() updateUserDto: UpdateUserAdminInputDto) {
    return this._usersService.update(UpdateUserAdminInputDto.toModel(updateUserDto));
  }

  @Patch(':userId')
  @Roles(UserRoleEnum.USER)
  @ApiOperation({description: 'Update password of user'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiBearerAuth()
  @ApiOkResponse({type: NoBodySuccessDto})
  @ApiNotFoundResponse({description: 'The user id not found.'})
  updatePassword(@Param('userId') userId: string, @Body() updateUserDto: UpdatePasswordInputDto) {
    return this._usersService.update(UpdatePasswordInputDto.toModel(updateUserDto));
  }

  @Delete(':userId')
  @Roles(UserRoleEnum.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({description: 'Delete user with ID'})
  @ApiParam({name: 'userId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiBearerAuth()
  @ApiNoContentResponse({description: 'The user has been successfully deleted.', type: ''})
  @ApiNotFoundResponse({description: 'The user id not found.', type: DefaultException})
  remove(@Param('userId') userId: string) {
    return this._usersService.remove(userId);
  }
}
