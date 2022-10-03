import {RunnerModel} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {AsyncReturn} from '@src-core/utility';

export interface IMystApiRepositoryInterface {
  unlockIdentity(runner: RunnerModel, identity: MystIdentityModel): Promise<AsyncReturn<Error, null>>;

  registerIdentity(runner: RunnerModel, userIdentity: string): Promise<AsyncReturn<Error, null>>;

  connect(runner: RunnerModel, VpnProviderModel): Promise<AsyncReturn<Error, null>>;

  disconnect(runner: RunnerModel): Promise<AsyncReturn<Error, null>>;
}
