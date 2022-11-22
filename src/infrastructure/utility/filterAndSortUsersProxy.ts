import {FilterModel} from '@src-core/model/filter.model';
import {sortListObject} from '@src-infrastructure/utility/utility';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';

export function filterAndSortUsersProxy(proxyAclList: Array<UsersProxyModel>, filterModel: FilterModel<UsersProxyModel>): [Array<UsersProxyModel>, number] {
  let dataList = proxyAclList;

  if (filterModel.getLengthOfSortBy() > 0) {
    const geInsertDateSort = filterModel.getSortBy('insertDate');
    if (geInsertDateSort) {
      dataList = sortListObject<UsersProxyModel>(dataList, geInsertDateSort, 'insertDate');
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
