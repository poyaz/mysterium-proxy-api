import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {FavoritesListTypeEnum, FavoritesModel} from '@src-core/model/favorites.model';
import {AsyncReturn} from '@src-core/utility';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {IUsersProxyRepositoryInterface} from '@src-core/interface/i-users-proxy-repository.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {filterAndSortFavorites} from '@src-infrastructure/utility/filterAndSortFavorites';
import {NotFoundException} from '@nestjs/common';

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
      [favoritesError, favoritesList],
    ] = await Promise.all([
      this._usersProxyRepository.getByUserId(userId, usersProxyFilterModel),
      this._favoritesDbRepository.getAll(favoritesFilterModel),
    ]);
    const multiplyExecuteError = usersProxyError || favoritesError;
    if (multiplyExecuteError) {
      return [multiplyExecuteError];
    }
    if (usersProxyTotal === 0) {
      return [null, [], 0];
    }

    const dataList = usersProxyList.map((v) => FavoritesAggregateRepository._mergeData(v, favoritesList));

    const [result, totalCount] = filterAndSortFavorites(dataList, filterModel);

    return [null, result, totalCount];
  }

  async getById(id: string): Promise<AsyncReturn<Error, FavoritesModel | null>> {
    const [favoriteError, favoriteData] = await this._favoritesDbRepository.getById(id);
    if (favoriteError) {
      return [favoriteError];
    }
    if (!favoriteData) {
      return [null, null];
    }

    const userId = favoriteData.usersProxy.user.id;
    const usersProxyFilterModel = new FilterModel({skipPagination: true});
    const [usersProxyError, usersProxyList, usersProxyTotal] = await this._usersProxyRepository.getByUserId(userId, usersProxyFilterModel);
    if (usersProxyError) {
      return [usersProxyError];
    }
    if (usersProxyTotal === 0) {
      return [null, null];
    }

    const find = usersProxyList.find((v) => v.id === favoriteData.usersProxy.id);
    if (!find) {
      return [null, null];
    }

    favoriteData.usersProxy = find;

    return [null, favoriteData];
  }

  async add(model: FavoritesModel): Promise<AsyncReturn<Error, FavoritesModel>> {
    return [new UnknownException()];
  }

  async addBulk(models: Array<FavoritesModel>): Promise<AsyncReturn<Error, Array<FavoritesModel>>> {
    const addUserIdList = models.map<string>((v) => v.usersProxy.user.id);
    if ([...new Set(addUserIdList)].length > 1) {
      return [new UnknownException()];
    }

    const userId = addUserIdList[0];
    const usersProxyFilterModel = new FilterModel({skipPagination: true});
    const [usersProxyError, usersProxyList, usersProxyTotal] = await this._usersProxyRepository.getByUserId(userId, usersProxyFilterModel);
    if (usersProxyError) {
      return [usersProxyError];
    }
    if (usersProxyTotal === 0) {
      return [new NotFoundException()];
    }

    const usersProxyMatchList = usersProxyList.filter((userProxy) => models.findIndex((favorite) => favorite.usersProxy.id === userProxy.id) > -1);
    if (usersProxyMatchList.length !== models.length) {
      return [new NotFoundException()];
    }

    const [addError, addDataList, addTotal] = await this._favoritesDbRepository.addBulk(models);
    if (addError) {
      return [addError];
    }

    const dataList = usersProxyMatchList
      .map((v) => FavoritesAggregateRepository._mergeData(v, addDataList))
      .filter((v) => v.kind !== FavoritesListTypeEnum.OTHER);

    return [null, dataList, addTotal];
  }

  async update<F>(model: F): Promise<AsyncReturn<Error, null>> {
    return this._favoritesDbRepository.update(model);
  }

  async updateBulk<F>(models: Array<F>): Promise<AsyncReturn<Error, null>> {
    return this._favoritesDbRepository.updateBulk(models);
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    return [new UnknownException()];
  }

  async removeBulk(idList: Array<string>): Promise<AsyncReturn<Error, null>> {
    return this._favoritesDbRepository.removeBulk(idList);
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
