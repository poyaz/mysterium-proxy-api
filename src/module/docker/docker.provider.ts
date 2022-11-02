import {DockerOptions} from 'dockerode';
import {DOCKER_CLIENT, DOCKER_MODULE_OPTIONS} from './docker.constant';
import {Provider} from '@nestjs/common';
import {DockerService} from './docker.service';

export function createDockerProvider(options: DockerOptions): any[] {
  return [
    {provide: DOCKER_MODULE_OPTIONS, useValue: options || {}},
    checkDockerVersion,
  ];
}

export const checkDockerVersion = (): Provider => ({
  provide: DOCKER_CLIENT,
  inject: [DockerService],
  useFactory: async (docker: DockerService) => {
    console.log('sssssssssssssssssssssssssss')
    await docker.getInstance().version();
  },
});
