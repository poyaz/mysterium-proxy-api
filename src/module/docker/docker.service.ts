import {Inject, Injectable, Logger, Optional} from '@nestjs/common';
import Dockerode, {DockerOptions} from 'dockerode';
import Docker = require('dockerode');
import {DOCKER_MODULE_OPTIONS} from "./docker.constant";

@Injectable()
export class DockerService {
  private readonly _docker;

  constructor(
    @Optional()
    @Inject(DOCKER_MODULE_OPTIONS)
    private readonly options: DockerOptions = {},
  ) {
    this._docker = new Docker(options);
  }

  getInstance(): Dockerode {
    return this._docker;
  }
}
