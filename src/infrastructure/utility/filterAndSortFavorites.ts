import {FilterModel} from '@src-core/model/filter.model';
import {sortListObject} from '@src-infrastructure/utility/utility';
import {FavoritesModel} from '@src-core/model/favorites.model';

export function filterAndSortFavorites(favoritesList: Array<FavoritesModel>, filterModel: FilterModel<FavoritesModel>): [Array<FavoritesModel>, number] {
  let dataList = favoritesList;

  if (filterModel.getLengthOfCondition() > 0) {
    const getKindFilter = filterModel.getCondition('kind');
    if (getKindFilter) {
      dataList = dataList.filter((v) => v.kind === getKindFilter.kind);
    }
  }

  if (filterModel.getLengthOfSortBy() > 0) {
    const geInsertDateSort = filterModel.getSortBy('insertDate');
    if (geInsertDateSort) {
      dataList = sortListObject<FavoritesModel>(dataList, geInsertDateSort, 'insertDate');
    }
  }

  if (!filterModel.skipPagination) {
    const pageNumber = filterModel.page;
    const pageSize = filterModel.limit;
    const resultPagination = dataList.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

    return [resultPagination, dataList.length];
  }

  return [dataList, dataList.length];
}
