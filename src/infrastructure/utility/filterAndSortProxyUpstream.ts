import {FilterModel} from '@src-core/model/filter.model';
import {sortListObject} from '@src-infrastructure/utility/utility';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {DefaultModel, defaultModelType} from '@src-core/model/defaultModel';

export function filterAndSortProxyUpstream(proxyUpstreamList: Array<ProxyUpstreamModel>, filterModel: FilterModel<ProxyUpstreamModel>): [Array<ProxyUpstreamModel>, number] {
  let dataList = proxyUpstreamList;

  if (filterModel.getLengthOfCondition() > 0) {
    const getListenPort = filterModel.getCondition('listenPort');
    if (getListenPort) {
      dataList = dataList.filter((v) => v.listenPort === getListenPort.listenPort);
    }

    const getProxyDownstream = filterModel.getCondition('proxyDownstream');
    if (getProxyDownstream && getProxyDownstream.proxyDownstream.length === 1) {
      const proxyDownstreamModelFilter = <defaultModelType<ProxyDownstreamModel>><unknown>getProxyDownstream.proxyDownstream[0];

      if (
        !proxyDownstreamModelFilter.IS_DEFAULT_MODEL
        || (proxyDownstreamModelFilter.IS_DEFAULT_MODEL && !proxyDownstreamModelFilter.isDefaultProperty('status'))
      ) {
        const status = proxyDownstreamModelFilter.status;
        switch (status) {
          case ProxyStatusEnum.DISABLE: {
            const tmpDataList = [];

            for (const data of dataList) {
              if (data.proxyDownstream.length === 0) {
                tmpDataList.push(data);
                continue;
              }

              for (const proxyDownStreamData of data.proxyDownstream) {
                if (proxyDownStreamData.status === ProxyStatusEnum.DISABLE) {
                  tmpDataList.push(data);
                }
              }
            }

            dataList = tmpDataList;
            break;
          }
          case ProxyStatusEnum.OFFLINE: {
            const tmpDataList = [];

            for (const data of dataList) {
              if (data.proxyDownstream.length === 0) {
                break;
              }

              for (const proxyDownStreamData of data.proxyDownstream) {
                if (proxyDownStreamData.status === ProxyStatusEnum.OFFLINE) {
                  tmpDataList.push(data);
                }
              }
            }

            dataList = tmpDataList;
            break;
          }
          case ProxyStatusEnum.ONLINE: {
            const tmpDataList = [];

            for (const data of dataList) {
              if (data.proxyDownstream.length === 0) {
                break;
              }

              for (const proxyDownStreamData of data.proxyDownstream) {
                if (proxyDownStreamData.status === ProxyStatusEnum.ONLINE) {
                  tmpDataList.push(data);
                }
              }
            }

            dataList = tmpDataList;
            break;
          }
        }
      }
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
