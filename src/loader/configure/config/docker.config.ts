import {registerAs} from '@nestjs/config';
import {DockerConfigInterface} from '@src-loader/configure/interface/docker-config.interface';
import {convertStringToBoolean} from '@src-loader/configure/util';

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
      envoy: {
        image: process.env.DOCKER_ENVOY_IMAGE || 'envoy-service:v2.0',
        tcpPort: Number(process.env.DOCKER_ENVOY_TCP_PORT || 10001),
        volumes: {
          config: process.env.DOCKER_ENVOY_HOST_VOLUME_CONFIG_NAME || 'volume-mysterium-envoy-config',
        },
        isEnableWaitStartup: convertStringToBoolean(process.env.DOCKER_ENVOY_ENABLE_WAIT_STARTUP || 'true'),
        isEnableHealthcheck: convertStringToBoolean(process.env.DOCKER_ENVOY_ENABLE_HEALTHCHECK || 'true'),
      },
      socat: {
        image: process.env.DOCKER_SOCAT_IMAGE || 'alpine/socat:latest',
      }
    },
    networkName: process.env.DOCKER_PROJECT_NETWORK_NAME || 'network-mysterium-proxy-main',
    labelNamespace: process.env.DOCKER_LABEL_NAMESPACE || 'com.mysterium-proxy',
    realProjectPath: process.env.DOCKER_REAL_PROJECT_PATH,
  };
});
