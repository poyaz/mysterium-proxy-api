import {IpInterfaceModel} from '@src-core/model/ip-interface.model';
import {FilterModel} from '@src-core/model/filter.model';
import {sortListObject} from '@src-infrastructure/utility/utility';

export function filterAndSortIpInterface(ipList: Array<IpInterfaceModel>, filterModel: FilterModel<IpInterfaceModel>): [Array<IpInterfaceModel>, number] {
  let dataList = ipList;

  if (filterModel.getLengthOfCondition() > 0) {
    const getNameFilter = filterModel.getCondition('name');
    if (getNameFilter) {
      dataList = dataList.filter((v) => v.name === getNameFilter.name);
    }

    const getIpFilter = filterModel.getCondition('ip');
    if (getIpFilter) {
      dataList = dataList.filter((v) => v.ip === getIpFilter.ip);
    }

    const getIsUseFilter = filterModel.getCondition('isUse');
    if (getIsUseFilter) {
      dataList = dataList.filter((v) => v.isUse === getIsUseFilter.isUse);
    }
  }

  if (filterModel.getLengthOfSortBy() > 0) {
    const getNameSort = filterModel.getSortBy('name');
    if (getNameSort) {
      dataList = sortListObject<IpInterfaceModel>(dataList, getNameSort, 'name');
    }

    const getIpSort = filterModel.getSortBy('ip');
    if (getIpSort) {
      dataList = sortListObject<IpInterfaceModel>(dataList, getIpSort, 'ip');
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
