import {FilterModel} from '@src-core/model/filter.model';
import {AsyncReturn} from '@src-core/utility';
import {FavoritesListTypeEnum, FavoritesModel} from '@src-core/model/favorites.model';
import {UpdateModel} from '@src-core/model/update.model';

export interface IFavoritesServiceInterface {
  getByUserId(userId: string, filter?: FilterModel<FavoritesModel>): Promise<AsyncReturn<Error, Array<FavoritesModel>>>;

  createBulk(models: Array<FavoritesModel>): Promise<AsyncReturn<Error, Array<FavoritesModel>>>;

  update(model: UpdateModel<FavoritesModel>): Promise<AsyncReturn<Error, null>>;

  updateBulkKind(kind: FavoritesListTypeEnum, proxiesListId: Array<string>): Promise<AsyncReturn<Error, null>>;

  removeBulk(favoritesListId: Array<string>): Promise<AsyncReturn<Error, null>>;
}
