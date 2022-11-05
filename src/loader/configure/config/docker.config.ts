import {registerAs} from '@nestjs/config';
import {DockerConfigInterface} from '@src-loader/configure/interface/docker-config.interface';

export default registerAs('docker', (): DockerConfigInterface => {
  return {
    protocol: process.env.DOCKER_CONTROLLER_PROTOCOL || 'http',
    host: process.env.DOCKER_CONTROLLER_HOST || '127.0.0.1',
    port: Number(process.env.DOCKER_CONTROLLER_PORT || 2375),
    containerInfo: {
      myst: {
        image: process.env.DOCKER_MYST_IMAGE || 'myst-service:v1.0',
        httpPort: Number(process.env.DOCKER_MYST_HTTP_PORT || 4449),
        volumes: {
          keystore: process.env.DOCKER_MYST_VOLUME_KEYSTORE_PATH || '/var/lib/mysterium-node/keystore/',
        },
      },
      mystConnect: {
        image: process.env.DOCKER_MYST_CONNECT_IMAGE || 'myst-connect-service:v1.0',
      },
    },
    networkName: process.env.DOCKER_PROJECT_NETWORK_NAME || 'network-mysterium-proxy-main',
    labelNamespace: process.env.DOCKER_LABEL_NAMESPACE || 'com.mysterium-proxy',
  };
});
