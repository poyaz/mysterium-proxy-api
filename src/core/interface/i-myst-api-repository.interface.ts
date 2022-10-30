import {RunnerModel} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {AsyncReturn} from '@src-core/utility';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';

export interface IMystApiRepositoryInterface {
  getAll<F>(runner: RunnerModel, filter?: F): Promise<AsyncReturn<Error, Array<VpnProviderModel>>>;

  getById(runner: RunnerModel, id: string): Promise<AsyncReturn<Error, VpnProviderModel | null>>;

  unlockIdentity(runner: RunnerModel, identity: MystIdentityModel): Promise<AsyncReturn<Error, null>>;

  registerIdentity(runner: RunnerModel, userIdentity: string): Promise<AsyncReturn<Error, null>>;

  connect(runner: RunnerModel, vpnProviderModel: VpnProviderModel): Promise<AsyncReturn<Error, VpnProviderModel>>;

  disconnect(runner: RunnerModel, force?: boolean): Promise<AsyncReturn<Error, null>>;
}
