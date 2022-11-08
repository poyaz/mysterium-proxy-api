import {FilterModel} from '@src-core/model/filter.model';
import {sortListObject} from '@src-infrastructure/utility/utility';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';

export function filterAndSortProxyUpstream(proxyUpstreamList: Array<ProxyUpstreamModel>, filterModel: FilterModel<ProxyUpstreamModel>): [Array<ProxyUpstreamModel>, number] {
  let dataList = proxyUpstreamList;

  if (filterModel.getLengthOfCondition() > 0) {
    const getListenPort = filterModel.getCondition('listenPort');
    if (getListenPort) {
      dataList = dataList.filter((v) => v.listenPort === getListenPort.listenPort);
    }
  }

  if (filterModel.getLengthOfSortBy() > 0) {
    const geInsertDateSort = filterModel.getSortBy('insertDate');
    if (geInsertDateSort) {
      dataList = sortListObject<ProxyUpstreamModel>(dataList, geInsertDateSort, 'insertDate');
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
