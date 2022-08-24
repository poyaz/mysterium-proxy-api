import {ModelRequireProp, PickOne} from '@src-core/utility';

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

export enum RunnerDependsOnStatusEnum {
  STARTED = 'started',
  HEALTHY = 'healthy',
}

export type RunnerObjectLabel<T> =
  (T extends string ? Record<string, string> : { [P in keyof T]?: string } & Record<string, string>)
  & { $namespace?: string | Array<string> };

export class RunnerModel<T = string> {
  id: string;
  serial: string;
  name: string;
  service: RunnerServiceEnum;
  exec: RunnerExecEnum;
  socketType: RunnerSocketTypeEnum;
  socketUri?: string;
  socketPort?: number;
  label?: RunnerObjectLabel<T>;
  volumes?: Array<{ source: string, dest: string }>;
  dependsOn?: Record<string, RunnerDependsOnStatusEnum>;
  status: RunnerStatusEnum;
  insertDate: Date;

  constructor(props: ModelRequireProp<typeof RunnerModel.prototype>) {
    Object.assign(this, props);
  }
}
