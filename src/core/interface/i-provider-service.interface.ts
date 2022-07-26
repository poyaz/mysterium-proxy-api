import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';

export interface IProviderServiceInterface {
  findAll(filter?: FilterModel<VpnProviderModel>): Promise<AsyncReturn<Error, Array<VpnProviderModel>>>;

  up(id: string): Promise<AsyncReturn<Error, VpnProviderModel>>;

  down(id: string): Promise<AsyncReturn<Error, null>>;
}
