import {RunnerModel} from '@src-core/model/runner.model';
import {ModelRequireProp} from '@src-core/utility';

export enum ProxyTypeEnum {
  INTERFACE = 1,
  MYST,
}

export enum ProxyStatusEnum {
  DISABLE,
  OFFLINE,
  ONLINE,
}

export class ProxyDownstreamModel {
  id: string;
  refId: string;
  ip: string;
  mask: number;
  type: ProxyTypeEnum;
  runner?: RunnerModel;
  status: ProxyStatusEnum;

  constructor(props: ModelRequireProp<typeof ProxyDownstreamModel.prototype>) {
    Object.assign(this, props);
  }

  clone() {
    return Object.assign(Object.create(this), this);
  }
}

export class ProxyUpstreamModel {
  id: string;
  listenAddr: string;
  listenPort: number;
  proxyDownstream: Array<ProxyDownstreamModel>;
  runner?: RunnerModel;
  insertDate: Date;

  constructor(props: ModelRequireProp<typeof ProxyUpstreamModel.prototype>) {
    Object.assign(this, props);
  }

  clone(): ProxyUpstreamModel {
    return Object.assign(Object.create(this), this);
  }
}

export class ProxyInstanceModel {
  id: string;
  proxyUpstream: Array<ProxyUpstreamModel>;

  constructor(props: ModelRequireProp<typeof ProxyInstanceModel.prototype>) {
    Object.assign(this, props);
  }

  clone(): ProxyInstanceModel {
    return Object.assign(Object.create(this), this);
  }
}
