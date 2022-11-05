import {registerAs} from '@nestjs/config';
import {DockerConfigInterface} from '@src-loader/configure/interface/docker-config.interface';

export default registerAs('docker', (): DockerConfigInterface => {
  return {
    protocol: process.env.DOCKER_CONTROLLER_PROTOCOL || 'http',
    host: process.env.DOCKER_CONTROLLER_HOST || '127.0.0.1',
    port: Number(process.env.DOCKER_CONTROLLER_PORT || 2375),
  };
});
