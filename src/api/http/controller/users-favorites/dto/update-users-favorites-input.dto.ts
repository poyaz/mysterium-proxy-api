import {PickType} from '@nestjs/swagger';
import {CreateUsersFavoritesInputDto} from '@src-api/http/controller/users-favorites/dto/create-users-favorites-input.dto';
import {UpdateModel} from '@src-core/model/update.model';
import {FavoritesModel} from '@src-core/model/favorites.model';

export class UpdateUsersFavoritesInputDto extends PickType(CreateUsersFavoritesInputDto, ['kind', 'note']) {
  static toModel(favoriteId: string, dto: UpdateUsersFavoritesInputDto): UpdateModel<FavoritesModel> {
    return new UpdateModel<FavoritesModel>(favoriteId, {
      ...(dto.kind && {kind: dto.kind}),
      ...(dto.note && {note: dto.note}),
    });
  }
}
