import {Injectable, NotFoundException} from '@nestjs/common';
import {IFavoritesServiceInterface} from '@src-core/interface/i-favorites-service.interface';
import {UpdateModel} from '@src-core/model/update.model';
import {FavoritesListTypeEnum, FavoritesModel} from '@src-core/model/favorites.model';
import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';

@Injectable()
export class FavoritesService implements IFavoritesServiceInterface {
  constructor(
    private readonly _favoritesRepository: IGenericRepositoryInterface<FavoritesModel>,
    private readonly _usersService: IUsersServiceInterface,
  ) {
  }

  async getByUserId(userId: string, filter?: FilterModel<FavoritesModel>): Promise<AsyncReturn<Error, Array<FavoritesModel>>> {
    const [userError] = await this._usersService.findOne(userId);
    if (userError) {
      return [userError];
    }

    const filterModel = !filter ? new FilterModel<FavoritesModel>() : filter;
    filterModel.addCondition({
      $opr: 'eq',
      usersProxy: defaultModelFactory<UsersProxyModel>(
        UsersProxyModel,
        {
          id: 'default-id',
          listenAddr: 'default-listen-addr',
          listenPort: 0,
          user: {
            id: userId,
            username: 'default-username',
            password: 'default-password',
          },
          proxyDownstream: [],
          insertDate: new Date(),
        },
        ['id', 'listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
      ),
    });

    return this._favoritesRepository.getAll<FilterModel<FavoritesModel>>(filterModel);
  }

  async createBulk(models: Array<FavoritesModel>): Promise<AsyncReturn<Error, Array<FavoritesModel>>> {
    return this._favoritesRepository.addBulk(models);
  }

  async update(model: UpdateModel<FavoritesModel>): Promise<AsyncReturn<Error, null>> {
    const [favoriteError, favoriteData] = await this._favoritesRepository.getById(model.id);
    if (favoriteError) {
      return [favoriteError];
    }
    if (!favoriteData) {
      return [new NotFoundException()];
    }

    return this._favoritesRepository.update(model);
  }

  async updateBulkKind(kind: FavoritesListTypeEnum, proxiesListId: Array<string>): Promise<AsyncReturn<Error, null>> {
    const updateModelList = proxiesListId.map((v) => new UpdateModel<FavoritesModel>(v, {kind: kind}));

    return this._favoritesRepository.updateBulk(updateModelList);
  }

  removeBulk(favoritesListId: Array<string>): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }
}
