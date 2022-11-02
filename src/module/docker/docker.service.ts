import {Inject, Injectable, Logger, Optional} from '@nestjs/common';
import Dockerode, {DockerOptions} from 'dockerode';
import Docker = require('dockerode');

@Injectable()
export class DockerService {
  private readonly _logger = new Logger('DockerService');
  private readonly _docker;

  constructor(
    @Optional()
    private readonly options: DockerOptions = {},
  ) {
    this._docker = new Docker(options);
  }

  getInstance(): Dockerode {
    return this._docker;
  }
}
