import {
  Body,
  Controller, Delete,
  Get, HttpCode, HttpStatus,
  Param, Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {RoleGuard} from '@src-api/http/guard/role.guard';
import {
  ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse,
  ApiExtraModels, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse,
  ApiOperation, ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse, ApiUnprocessableEntityResponse, getSchemaPath,
} from '@nestjs/swagger';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {DefaultSuccessDto} from '@src-api/http/dto/default-success.dto';
import {DefaultArraySuccessDto} from '@src-api/http/dto/default-array-success.dto';
import {NotFoundExceptionDto} from '@src-api/http/dto/not-found-exception.dto';
import {UnauthorizedExceptionDto} from '@src-api/http/dto/unauthorized-exception.dto';
import {DefaultExceptionDto} from '@src-api/http/dto/default-exception.dto';
import {Roles} from '@src-api/http/decorator/roles.decorator';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {FindIdentityQueryDto} from '@src-api/http/controller/identity/dto/find-identity-query.dto';
import {RemoveSpecialFieldOfIdentityInterceptor} from '@src-api/http/controller/identity/interceptor/remove-special-field-of-identity.interceptor';
import {ForbiddenExceptionDto} from '@src-api/http/dto/forbidden-exception.dto';
import {FindIdentityOutputDto} from '@src-api/http/controller/identity/dto/find-identity-output.dto';
import {ExceptionEnum} from '@src-core/enum/exception.enum';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {FileInterceptor} from '@nestjs/platform-express';
import {CreateIdentityInputDto} from '@src-api/http/controller/identity/dto/create-identity-input.dto';
import {ValidateExceptionDto} from '@src-api/http/dto/validate-exception.dto';
import {IdentityJsonFileValidationPipe} from '@src-api/http/controller/identity/pipe/identity-json-file-validation.pipe';

const mystIdentityModelList = [
  new MystIdentityModel({
    id: 'e88ff52a-44c9-4592-9421-bda9ccfe4f57',
    identity: '0x0e97730858ec6065541e99f08cf9d1809ddb7aa1',
    passphrase: 'password',
    path: '/path/of/identity/0x0e97730858ec6065541e99f08cf9d1809ddb7aa1',
    filename: '0x0e97730858ec6065541e99f08cf9d1809ddb7aa1.json',
    isUse: false,
    insertDate: new Date(),
  }),
  new MystIdentityModel({
    id: '90a0ec35-21c0-4b5d-af06-c78d1c12813b',
    identity: '0x2bb00f2600989c06d2d552a003453c84bfa494ba',
    passphrase: 'password',
    path: '/path/of/identity/0x2bb00f2600989c06d2d552a003453c84bfa494ba',
    filename: '0x2bb00f2600989c06d2d552a003453c84bfa494ba.json',
    isUse: true,
    insertDate: new Date(),
  }),
];

@Controller({
  path: 'identity/myst/',
  version: '1',
})
@UseGuards(RoleGuard)
@UseInterceptors(RemoveSpecialFieldOfIdentityInterceptor)
@ApiTags('identity')
@ApiBearerAuth()
@ApiExtraModels(DefaultSuccessDto, DefaultArraySuccessDto, NotFoundExceptionDto, FindIdentityQueryDto, FindIdentityOutputDto, CreateIdentityInputDto)
@ApiUnauthorizedResponse({description: 'Unauthorized', type: UnauthorizedExceptionDto})
@ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
@ApiBadRequestResponse({description: 'Bad Request', type: DefaultExceptionDto})
export class IdentityHttpController {

  @Get()
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({description: 'Get all identity', operationId: 'Get all identity'})
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
                    $ref: getSchemaPath(FindIdentityOutputDto),
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
  async findAll(@Query() queryFilterDto: FindIdentityQueryDto) {
    return [null, mystIdentityModelList, mystIdentityModelList.length];
  }

  @Get(':identityId')
  @Roles(UserRoleEnum.ADMIN, UserRoleEnum.USER)
  @ApiOperation({description: 'Get info of one identity with ID', operationId: 'Get identity'})
  @ApiParam({name: 'identityId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiOkResponse({
    schema: {
      allOf: [
        {$ref: getSchemaPath(DefaultSuccessDto)},
        {
          properties: {
            data: {
              type: 'object',
              $ref: getSchemaPath(FindIdentityOutputDto),
            },
          },
        },
      ],
    },
  })
  @ApiNotFoundResponse({
    description: 'The identity id not found.',
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
  async findOne(@Param('identityId') identityId: string) {
    const find = mystIdentityModelList.find((v) => v.id === identityId);
    if (!find) {
      return [new NotFoundException()];
    }

    return [null, find];
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({description: 'Add new identity', operationId: 'Add new identity'})
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        {$ref: getSchemaPath(CreateIdentityInputDto)},
        {
          properties: {
            file: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      ],
    },
  })
  @ApiCreatedResponse({
    description: 'The identity has been successfully created.',
    schema: {
      allOf: [
        {$ref: getSchemaPath(DefaultSuccessDto)},
        {
          properties: {
            data: {
              type: 'string',
              description: 'The id of job. You should check result of job with this id',
              example: '00000000-0000-0000-0000-000000000000',
            },
          },
        },
      ],
    },
  })
  @ApiUnprocessableEntityResponse({description: 'Unprocessable Entity', type: ValidateExceptionDto})
  async create(
    @Body() createIdentityDto: CreateIdentityInputDto,
    @UploadedFile(IdentityJsonFileValidationPipe) file: Express.Multer.File,
  ) {
    return [null, '00000000-0000-0000-0000-000000000000'];
  }

  @Delete(':identityId')
  @Roles(UserRoleEnum.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({description: 'Delete identity with ID', operationId: 'Remove identity'})
  @ApiParam({name: 'identity', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiNoContentResponse({
    description: 'The identity has been successfully deleted.',
  })
  @ApiNotFoundResponse({
    description: 'The identity id not found.',
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
  async remove(@Param('identityId') identityId: string) {
    const find = mystIdentityModelList.find((v) => v.id === identityId);
    if (!find) {
      return [new NotFoundException()];
    }

    return [null];
  }
}