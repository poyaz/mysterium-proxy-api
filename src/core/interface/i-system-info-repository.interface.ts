import {AsyncReturn} from '@src-core/utility';

export interface ISystemInfoRepositoryInterface {
  getOutgoingIpAddress(): Promise<AsyncReturn<Error, string>>;
}
