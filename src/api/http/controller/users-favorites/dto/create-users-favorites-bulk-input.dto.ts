import {FavoritesListTypeEnum} from '@src-core/model/favorites.model';
import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import {ApiProperty, OmitType, PickType} from '@nestjs/swagger';
import {CreateUsersFavoritesInputDto} from '@src-api/http/controller/users-favorites/dto/create-users-favorites-input.dto';
import {Type} from 'class-transformer';

export class CreateUsersFavoritesProxyInputDto extends OmitType(CreateUsersFavoritesInputDto, ['kind']) {
}

export class CreateUsersFavoritesBulkInputDto extends PickType(CreateUsersFavoritesInputDto, ['kind']) {
  @ApiProperty({
    description: 'List of proxy with information about each proxy',
    type: CreateUsersFavoritesProxyInputDto,
    isArray: true,
    minItems: 1,
  })
  @Type(() => CreateUsersFavoritesProxyInputDto)
  @ValidateNested({each: true})
  @IsArray()
  @ArrayNotEmpty()
  @IsDefined()
  bulk: Array<CreateUsersFavoritesProxyInputDto>;

  static toModel(dto: CreateUsersFavoritesBulkInputDto) {
  }
}
