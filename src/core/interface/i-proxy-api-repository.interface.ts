import {AsyncReturn} from '@src-core/utility';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';

export interface IProxyApiRepositoryInterface {
  getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<VpnProviderModel>>>;

  getById(id: string): Promise<AsyncReturn<Error, VpnProviderModel | null>>;
}
