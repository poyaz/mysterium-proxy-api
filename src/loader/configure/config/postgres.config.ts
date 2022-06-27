import {registerAs} from '@nestjs/config';
import {DatabaseConfigInterface} from '../interface/database-config.interface';
import {convertStringToBoolean} from '../util';

export default registerAs('postgres', (): DatabaseConfigInterface => {
  const obj: DatabaseConfigInterface = {
    host: process.env.DB_PG_HOST || '127.0.0.1',
    port: Number(process.env.DB_PG_PORT || 5432),
    db: process.env.DB_PG_DATABASE || 'proxy',
    username: process.env.DB_PG_USERNAME,
    password: process.env.DB_PG_PASSWORD,
    enableTls: convertStringToBoolean(process.env.DB_PG_USE_TLS),
    rejectUnauthorized: convertStringToBoolean(process.env.DB_PG_TLS_REJECT_UNAUTHORIZED),
    applicationName: process.env.DB_APPLICATION_NAME || 'proxy-typeorm',
  };
  if (process.env.DB_PG_MAX) {
    obj.max = Number(process.env.DB_PG_MAX);
  }
  if (process.env.DB_PG_MAX) {
    obj.idleTimeout = Number(process.env.DB_PG_IDLE_TIMEOUT);
  }

  return obj;
});
