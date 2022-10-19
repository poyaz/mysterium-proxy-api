import {FilterModel} from '@src-core/model/filter.model';
import {sortListObject} from '@src-infrastructure/utility/utility';
import {RunnerModel} from '@src-core/model/runner.model';

export function filterAndSortRunner<T>(runnerList: Array<RunnerModel<T>>, filterModel: FilterModel<RunnerModel<T>>): [Array<RunnerModel<T>>, number] {
  let dataList = runnerList;

  if (filterModel.getLengthOfSortBy() > 0) {
    const getNameSort = filterModel.getSortBy('name');
    if (getNameSort) {
      dataList = sortListObject<RunnerModel<T>>(dataList, getNameSort, 'name');
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
