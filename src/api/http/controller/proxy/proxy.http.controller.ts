import {Controller, Get, UseGuards} from '@nestjs/common';
import {RoleGuard} from '@src-api/http/guard/role.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse, getSchemaPath,
} from '@nestjs/swagger';
import {UnauthorizedExceptionDto} from '@src-api/http/dto/unauthorized-exception.dto';
import {DefaultExceptionDto} from '@src-api/http/dto/default-exception.dto';
import {Roles} from '@src-api/http/decorator/roles.decorator';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {ForbiddenExceptionDto} from '@src-api/http/dto/forbidden-exception.dto';
import {DefaultArraySuccessDto} from '@src-api/http/dto/default-array-success.dto';
import {FindProxyOutputDto} from '@src-api/http/controller/proxy/dto/find-proxy-output.dto';

@Controller({
  path: 'proxy',
  version: '1',
})
@UseGuards(RoleGuard)
@ApiTags('proxy')
@ApiBearerAuth()
@ApiExtraModels(FindProxyOutputDto)
@ApiUnauthorizedResponse({description: 'Unauthorized', type: UnauthorizedExceptionDto})
@ApiForbiddenResponse({description: 'Forbidden', type: ForbiddenExceptionDto})
export class ProxyHttpController {
  @Get()
  @Roles(UserRoleEnum.ADMIN)
  @ApiOperation({description: 'Get list of all proxy', operationId: 'Get all proxy'})
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
  async findAll() {
  }
}
