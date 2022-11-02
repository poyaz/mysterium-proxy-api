import {registerAs} from '@nestjs/config';
import {DockerConfigInterface} from '@src-loader/configure/interface/docker-config.interface';

export default registerAs('docker', (): DockerConfigInterface => {
  return {
    protocol: process.env.DOCKER_PROTOCOL,
    host: process.env.DOCKER_HOST,
    port: Number(process.env.DOCKER_PORT),
  };
});
