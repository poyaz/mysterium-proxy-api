import {DockerOptions} from 'dockerode';
import {DOCKER_CLIENT, DOCKER_LOGGER, DOCKER_MODULE_OPTIONS} from './docker.constant';
import {Logger, Provider} from '@nestjs/common';
import {DockerService} from './docker.service';
import {DockerModule} from "./docker.module";

export function createDockerProviderOptions(options: DockerOptions): Provider[] {
  return [
    {
      provide: DOCKER_MODULE_OPTIONS, useValue: options || {}
    }
  ];
}

export function createDockerProvider(): Provider[] {
  return [
    dockerLogger(),
    checkDockerVersion(),
  ];
}

export const dockerLogger = (): Provider => ({
  provide: DOCKER_LOGGER,
  useValue: new Logger(DockerModule.name),
})

export const checkDockerVersion = (): Provider => ({
  provide: DOCKER_CLIENT,
  inject: [DockerService, DOCKER_LOGGER],
  useFactory: async (docker: DockerService, logger: Logger) => {
    try {
      await docker.getInstance().version();
    } catch (error) {
      logger.error(`Can't connect to docker API`);

      throw error;
    }
  },
});
