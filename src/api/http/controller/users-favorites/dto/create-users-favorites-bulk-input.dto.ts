import {FavoritesListTypeEnum, FavoritesModel} from '@src-core/model/favorites.model';
import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsEnum, Max,
  ValidateNested,
} from 'class-validator';
import {ApiProperty, OmitType, PickType} from '@nestjs/swagger';
import {CreateUsersFavoritesInputDto} from '@src-api/http/controller/users-favorites/dto/create-users-favorites-input.dto';
import {Type} from 'class-transformer';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';

export class CreateUsersFavoritesProxyInputDto extends OmitType(CreateUsersFavoritesInputDto, ['kind']) {
}

export class CreateUsersFavoritesBulkInputDto extends PickType(CreateUsersFavoritesInputDto, ['kind']) {
  @ApiProperty({
    description: 'List of proxy with information about each proxy',
    type: CreateUsersFavoritesProxyInputDto,
    isArray: true,
    minItems: 1,
    maxItems: 100,
  })
  @Type(() => CreateUsersFavoritesProxyInputDto)
  @ValidateNested({each: true})
  @IsArray()
  @ArrayNotEmpty()
  @Max(100)
  @IsDefined()
  bulk: Array<CreateUsersFavoritesProxyInputDto>;

  static toModel(userId: string, dto: CreateUsersFavoritesBulkInputDto): Array<FavoritesModel> {
    return dto.bulk.map((v) => defaultModelFactory<FavoritesModel>(
      FavoritesModel,
      {
        id: 'default-id',
        kind: dto.kind,
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: v.proxyId,
            listenAddr: 'default-listen-addr',
            listenPort: 3128,
            proxyDownstream: [],
            user: {
              id: userId,
              username: 'default-username',
              password: 'default-password',
            },
            insertDate: new Date(),
          },
          ['listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
        note: v.note,
        insertDate: new Date(),
      },
      ['id', 'insertDate'],
    ));
  }
}
