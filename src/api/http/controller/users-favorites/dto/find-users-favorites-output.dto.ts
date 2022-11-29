import {ApiProperty, PickType} from '@nestjs/swagger';
import {FavoritesListTypeEnum} from '@src-core/model/favorites.model';
import {FindProviderOutputDto} from '@src-api/http/controller/provider/dto/find-provider-output.dto';
import {FindUsersProxyOutputDto} from '@src-api/http/controller/users-proxy/dto/find-users-proxy-output.dto';

class ProviderInfoDto extends PickType(FindProviderOutputDto, ['id', 'providerIdentity']) {
}

export class FindUsersFavoritesOutputDto {
  @ApiProperty({
    description: 'The identity of favorite',
    type: String,
    required: false,
    readOnly: true,
    example: '00000000-0000-0000-0000-000000000000',
  })
  id: string;

  @ApiProperty({
    title: 'The kind of favorite list',
    description: [
      'This flag show kind of favorite list. All kind of favorite describe bellow:',
      `* Show **favorite** list: \`${FavoritesListTypeEnum.FAVORITE}\``,
      `* Show **today** list: \`${FavoritesListTypeEnum.TODAY}\``,
      `* Show **all proxy except favorite and today** list: \`${FavoritesListTypeEnum.OTHER}\``,
    ].join('\n'),
    type: String,
    enum: FavoritesListTypeEnum,
    required: false,
    readOnly: true,
    example: FavoritesListTypeEnum.FAVORITE,
  })
  kind: FavoritesListTypeEnum;

  @ApiProperty({
    description: 'The proxy information',
    type: FindUsersProxyOutputDto,
    required: false,
    readOnly: true,
  })
  proxy: FindUsersProxyOutputDto;

  @ApiProperty({
    description: 'The note about proxy',
    type: String,
    required: false,
    readOnly: true,
    nullable: true,
    example: 'Information about proxy X',
  })
  note?: string;
}
