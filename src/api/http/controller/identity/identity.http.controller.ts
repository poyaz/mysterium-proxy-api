import {
  Body,
  Controller, Delete,
  Get, HttpCode, HttpStatus, Inject, NestInterceptor,
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
import {
  RemoveSpecialFieldOfIdentityInterceptor
} from '@src-api/http/controller/identity/interceptor/remove-special-field-of-identity.interceptor';
import {ForbiddenExceptionDto} from '@src-api/http/dto/forbidden-exception.dto';
import {FindIdentityOutputDto} from '@src-api/http/controller/identity/dto/find-identity-output.dto';
import {ExceptionEnum} from '@src-core/enum/exception.enum';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {FileInterceptor} from '@nestjs/platform-express';
import {CreateIdentityInputDto} from '@src-api/http/controller/identity/dto/create-identity-input.dto';
import {ValidateExceptionDto} from '@src-api/http/dto/validate-exception.dto';
import {
  IdentityJsonFileValidationPipe
} from '@src-api/http/controller/identity/pipe/identity-json-file-validation.pipe';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {IMystIdentityServiceInterface} from '@src-core/interface/i-myst-identity-service.interface';

@Controller({
  path: 'identity/myst/',
  version: '1',
})
@UseGuards(RoleGuard)
@UseInterceptors(RemoveSpecialFieldOfIdentityInterceptor)
@Roles(UserRoleEnum.ADMIN)
@ApiTags('identity')
@ApiBearerAuth()
@ApiExtraModels(
  DefaultSuccessDto,
  DefaultArraySuccessDto,
  DefaultExceptionDto,
  NotFoundExceptionDto,
  FindIdentityQueryDto,
  FindIdentityOutputDto,
  CreateIdentityInputDto,
)
@ApiUnauthorizedResponse({description: 'Unauthorized', type: UnauthorizedExceptionDto})
@ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
export class IdentityHttpController {
  constructor(
    @Inject(ProviderTokenEnum.MYST_IDENTITY_SERVICE_DEFAULT)
    private readonly _mystIdentityService: IMystIdentityServiceInterface,
  ) {
  }

  @Get()
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
  @ApiBadRequestResponse({description: 'Bad Request', type: DefaultExceptionDto})
  async findAll(@Query() queryFilterDto: FindIdentityQueryDto) {
    return this._mystIdentityService.getAll(FindIdentityQueryDto.toModel(queryFilterDto));
  }

  @Get(':identityId')
  @ApiOperation({description: 'Get info of one identity with ID', operationId: 'Get identity'})
  @ApiParam({name: 'identityId', type: String, example: '00000000-0000-0000-0000-000000000000'})
  @ApiOkResponse({
    description: 'Get identity data',
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
        {
          $ref: getSchemaPath(NotFoundExceptionDto)
        },
        {
          properties: {
            action: {
              example: ExceptionEnum.NOT_FOUND_MYST_IDENTITY_ERROR,
            },
          },
        },
      ],
    }
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
              title: ExceptionEnum.ADDRESS_IDENTITY,
              description: 'Can not found identity address',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.ADDRESS_IDENTITY,
                },
              },
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.PARSE_IDENTITY,
              description: 'Can not parse identity file',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.PARSE_IDENTITY,
                },
              },
            },
          ],
        },
      ]
    }
  })
  async findOne(@Param('identityId') identityId: string) {
    return this._mystIdentityService.getById(identityId);
  }

  @Post()
  @UseInterceptors(<NestInterceptor><any>FileInterceptor('file'))
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
  @ApiNotFoundResponse({description: 'The identity service not found', type: NotFoundException})
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
        {
          allOf: [
            {
              title: ExceptionEnum.EXIST_ERROR,
              description: 'Item is exist',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.EXIST_ERROR,
                },
              },
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.INVALID_FILE_TYPE,
              description: 'Invalid identity file type',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.INVALID_FILE_TYPE,
                },
              },
            },
          ],
        },
      ],
    },
  })
  async create(
    @Body() createIdentityDto: CreateIdentityInputDto,
    @UploadedFile(IdentityJsonFileValidationPipe) file: Express.Multer.File,
  ) {
    return this._mystIdentityService.create(CreateIdentityInputDto.toModel(createIdentityDto, file));
  }

  @Delete(':identityId')
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
              title: ExceptionEnum.MYST_IDENTITY_IN_USE,
              description: 'The identity is in use',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.MYST_IDENTITY_IN_USE,
                },
              },
            },
          ],
        },
        {
          allOf: [
            {
              title: ExceptionEnum.INVALID_FILE_TYPE,
              description: 'Invalid identity file type',
            },
            {
              $ref: getSchemaPath(DefaultExceptionDto),
            },
            {
              properties: {
                action: {
                  example: ExceptionEnum.INVALID_FILE_TYPE,
                },
              },
            },
          ],
        },
      ],
    },
  })
  async remove(@Param('identityId') identityId: string) {
    return this._mystIdentityService.remove(identityId);
  }
}
