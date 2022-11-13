import {FilterModel} from '@src-core/model/filter.model';
import {sortListObject} from '@src-infrastructure/utility/utility';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';

export function filterAndSortVpnProvider(vpnProviderList: Array<VpnProviderModel>, filterModel: FilterModel<VpnProviderModel>): [Array<VpnProviderModel>, number] {
  let dataList = vpnProviderList;

  if (filterModel.getLengthOfCondition() > 0) {
    const getCountry = filterModel.getCondition('country');
    if (getCountry) {
      dataList = dataList.filter((v) => v.country === getCountry.country);
    }

    const getProviderIdentity = filterModel.getCondition('providerIdentity');
    if (getProviderIdentity) {
      dataList = dataList.filter((v) => v.providerIdentity === getProviderIdentity.providerIdentity);
    }

    const getProviderIpType = filterModel.getCondition('providerIpType');
    if (getProviderIpType) {
      dataList = dataList.filter((v) => v.providerIpType === getProviderIpType.providerIpType);
    }

    const getIsRegister = filterModel.getCondition('isRegister');
    if (getIsRegister) {
      dataList = dataList.filter((v) => v.isRegister === getIsRegister.isRegister);
    }

    const getProxyCount = filterModel.getCondition('proxyCount');
    if (getProxyCount) {
      dataList = dataList.filter((v) => v.proxyCount === getProxyCount.proxyCount);
    }
  }

  if (filterModel.getLengthOfSortBy() > 0) {
    const geInsertDateSort = filterModel.getSortBy('insertDate');
    if (geInsertDateSort) {
      dataList = sortListObject<VpnProviderModel>(dataList, geInsertDateSort, 'insertDate');
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
