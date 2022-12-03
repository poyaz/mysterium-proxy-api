import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {FavoritesListTypeEnum, FavoritesModel} from '@src-core/model/favorites.model';
import {AsyncReturn} from '@src-core/utility';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {IUsersProxyRepositoryInterface} from '@src-core/interface/i-users-proxy-repository.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {filterAndSortFavorites} from '@src-infrastructure/utility/filterAndSortFavorites';

export class FavoritesAggregateRepository implements IGenericRepositoryInterface<FavoritesModel> {
  constructor(
    private readonly _favoritesDbRepository: IGenericRepositoryInterface<FavoritesModel>,
    private readonly _usersProxyRepository: IUsersProxyRepositoryInterface,
  ) {
  }

  async getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<FavoritesModel>>> {
    if (!filter) {
      return [null, [], 0];
    }

    const filterModel = <FilterModel<FavoritesModel>><unknown>filter;
    const userId = filterModel.getCondition('usersProxy').usersProxy.user.id;
    const usersProxyFilterModel = new FilterModel({skipPagination: true});
    const favoritesFilterModel = new FilterModel<FavoritesModel>({skipPagination: true});
    favoritesFilterModel.addCondition(filterModel.getCondition('usersProxy'));
    for (const sortBy of filterModel.getSortByList()) {
      favoritesFilterModel.addSortBy(sortBy);
    }

    const [
      [usersProxyError, usersProxyList, usersProxyTotal],
      [favoritesError, favoritesList, favoritesTotal],
    ] = await Promise.all([
      this._usersProxyRepository.getByUserId(userId, usersProxyFilterModel),
      this._favoritesDbRepository.getAll(favoritesFilterModel),
    ]);
    const multiplyExecuteError = usersProxyError || favoritesError;
    if (multiplyExecuteError) {
      return [multiplyExecuteError];
    }
    if (usersProxyTotal === 0 || favoritesTotal === 0) {
      return [null, [], 0];
    }

    const dataList = usersProxyList.map((v) => FavoritesAggregateRepository._mergeData(v, favoritesList));
    console.log(dataList);

    const [result, totalCount] = filterAndSortFavorites(dataList, filterModel);

    return [null, result, totalCount];
  }

  getById(id: string): Promise<AsyncReturn<Error, FavoritesModel | null>> {
    return Promise.resolve(undefined);
  }

  async add(model: FavoritesModel): Promise<AsyncReturn<Error, FavoritesModel>> {
    return [new UnknownException()];
  }

  addBulk(models: Array<FavoritesModel>): Promise<AsyncReturn<Error, Array<FavoritesModel>>> {
    return Promise.resolve(undefined);
  }

  update<F>(model: F): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  updateBulk<F>(models: Array<F>): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    return [new UnknownException()];
  }

  removeBulk(idList: Array<string>): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  private static _mergeData(usersProxyData: UsersProxyModel, favoritesList: Array<FavoritesModel>): FavoritesModel {
    const find = favoritesList.find((v) => v.usersProxy.id === usersProxyData.id);
    if (find) {
      find.usersProxy = usersProxyData;

      return find;
    }

    return new FavoritesModel({
      id: usersProxyData.id,
      kind: FavoritesListTypeEnum.OTHER,
      usersProxy: usersProxyData,
      insertDate: usersProxyData.insertDate,
    });
  }
}
