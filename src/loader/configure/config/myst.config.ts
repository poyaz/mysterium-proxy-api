import {registerAs} from '@nestjs/config';
import {MystConfigInterface} from '@src-loader/configure/interface/myst-config.interface';

export default registerAs('myst', (): MystConfigInterface => {
  return {
    discoveryHostAddr: process.env.MYST_DISCOVER_API_ADDR || 'https://discovery.mysterium.network',
    node: {
      auth: {
        username: process.env.MYST_NODE_AUTH_USERNAME,
        password: process.env.MYST_NODE_AUTH_PASSWORD,
      },
    },
  };
});
