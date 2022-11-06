import {RunnerModel} from '@src-core/model/runner.model';
import {ModelRequireProp} from '@src-core/utility';

export enum VpnServiceTypeEnum {
  WIREGUARD = 'wireguard',
}

export enum VpnProviderName {
  MYSTERIUM = 'mysterium',
}

export enum VpnProviderIpTypeEnum {
  HOSTING = 'hosting',
  RESIDENTIAL = 'residential',
  BUSINESS = 'business',
  MOBILE = 'mobile',
  ORGANIZATION = 'organization',
  EDUCATION = 'education',
}

export enum VpnProviderStatusEnum {
  OFFLINE = 'offline',
  PENDING = 'pending',
  ONLINE = 'online',
}

export class VpnProviderModel {
  id: string;
  userIdentity?: string;
  serviceType: VpnServiceTypeEnum;
  providerName: VpnProviderName;
  providerIdentity: string;
  providerStatus?: VpnProviderStatusEnum;
  providerIpType: VpnProviderIpTypeEnum;
  ip?: string;
  mask?: number;
  country: string;
  serverOutgoingIp?: string;
  runner?: RunnerModel;
  quality?: number;
  bandwidth?: number;
  latency?: number;
  isRegister: boolean;
  insertDate: Date;

  constructor(props: ModelRequireProp<typeof VpnProviderModel.prototype>) {
    Object.assign(this, props);
  }

  clone() {
    return Object.assign(Object.create(this), this);
  }
}
