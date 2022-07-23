export enum RunnerExecEnum {
  DOCKER = 'docker'
}

export enum RunnerSocketTypeEnum {
  HTTP = 'http'
}

export enum RunnerServiceEnum {
  SQUID = 'squid',
  MYST = 'myst',
}

export enum RunnerStatusEnum {
  RUNNING = 'running',
  RESTARTING = 'restarting',
  EXITED = 'exited',
  FAILED = 'failed'
}

export class RunnerModel {
  id: string;
  name: string;
  service: RunnerServiceEnum;
  exec: RunnerExecEnum;
  socketType: RunnerSocketTypeEnum;
  socketUri: string;
  socketPort: number;
  status: RunnerStatusEnum;
  insertDate: Date;
}
