import {registerAs} from '@nestjs/config';
import {MystConfigInterface} from '@src-loader/configure/interface/myst-config.interface';
import {resolve} from 'path';

export default registerAs('myst', (): MystConfigInterface => {
  return {
    discoveryHostAddr: process.env.MYST_DISCOVER_API_ADDR || 'https://discovery.mysterium.network',
    node: {
      auth: {
        username: process.env.MYST_NODE_AUTH_USERNAME,
        password: process.env.MYST_NODE_AUTH_PASSWORD,
      },
    },
    basePathStore: process.env.MYST_HOST_BASE_PATH_STORE || resolve('storage', 'tmp', 'myst', 'identity'),
  };
});
