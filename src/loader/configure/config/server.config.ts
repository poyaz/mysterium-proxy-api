import {registerAs} from '@nestjs/config';
import {ServerConfigInterface} from '@src-loader/configure/interface/server-config.interface';
import {convertStringToBoolean} from '@src-loader/configure/util';

export default registerAs('server', (): ServerConfigInterface => {
  return {
    host: process.env.SERVER_HOST || '127.0.0.1',
    http: {
      port: Number(process.env.SERVER_HTTP_PORT || 3000),
    },
    https: {
      port: Number(process.env.SERVER_HTTPS_PORT || 3443),
      force: convertStringToBoolean(process.env.SERVER_HTTPS_FORCE),
    },
  };
});
