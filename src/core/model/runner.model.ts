import {ModelRequireProp} from '@src-core/utility';

export enum RunnerExecEnum {
  DOCKER = 'docker'
}

export enum RunnerSocketTypeEnum {
  HTTP = 'http',
  NONE = 'none',
}

export enum RunnerServiceEnum {
  SQUID = 'squid',
  MYST_CONNECT = 'myst-connect',
  ENVOY = 'envoy',
  MYST = 'myst',
}

export enum RunnerStatusEnum {
  CREATING = 'creating',
  RUNNING = 'running',
  RESTARTING = 'restarting',
  EXITED = 'exited',
  FAILED = 'failed'
}

export class RunnerModel {
  id: string;
  serial: string;
  name: string;
  service: RunnerServiceEnum;
  exec: RunnerExecEnum;
  socketType: RunnerSocketTypeEnum;
  socketUri?: string;
  socketPort?: number;
  label?: Record<string, string>;
  status: RunnerStatusEnum;
  insertDate: Date;

  constructor(props: ModelRequireProp<typeof RunnerModel.prototype>) {
    Object.assign(this, props);
  }
}
