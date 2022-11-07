import {ModelRequireProp, PickOne, UniqueArray} from '@src-core/utility';

export enum RunnerExecEnum {
  DOCKER = 'docker'
}

export enum RunnerSocketTypeEnum {
  HTTP = 'http',
  TCP = 'tcp',
  NONE = 'none',
}

export enum RunnerServiceEnum {
  MYST_CONNECT = 'myst-connect',
  ENVOY = 'envoy',
  SOCAT = 'socat',
  MYST = 'myst',
}

export enum RunnerServiceVolumeEnum {
  MYST_KEYSTORE = 'keystore'
}

export enum RunnerStatusEnum {
  CREATING = 'created',
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
  (T extends string ? Record<string, string> : { [P in keyof T]?: string })
  & { $namespace: string };

export type RunnerLabelNamespace<T> =
  T extends Array<any>
    ? UniqueArray<T> extends never
    ? ['Encountered value with duplicates']
    : T extends readonly [infer X, ...infer Rest]
      ? [RunnerObjectLabel<X>, ...RunnerLabelNamespace<Rest>]
      : RunnerObjectLabel<T>
    : RunnerObjectLabel<T>;

export class RunnerModel<T = string> {
  id: string;
  serial: string;
  name: string;
  service: RunnerServiceEnum;
  exec: RunnerExecEnum;
  socketType: RunnerSocketTypeEnum;
  socketUri?: string;
  socketPort?: number;
  label?: RunnerLabelNamespace<T>;
  volumes?: Array<{ source: string, dest: string, name?: RunnerServiceVolumeEnum }>;
  dependsOn?: Record<string, RunnerDependsOnStatusEnum>;
  status: RunnerStatusEnum;
  insertDate: Date;

  constructor(props: ModelRequireProp<typeof RunnerModel.prototype>) {
    Object.assign(this, props);
  }
}
