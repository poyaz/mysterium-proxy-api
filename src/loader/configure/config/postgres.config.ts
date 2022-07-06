import {registerAs} from '@nestjs/config';
import {DatabaseConfigInterface} from '@src-loader/configure/interface/database-config.interface';
import {convertStringToBoolean} from '@src-loader/configure/util';

export default registerAs('postgres', (): DatabaseConfigInterface => {
  return {
    host: process.env.DB_PG_HOST || '127.0.0.1',
    port: Number(process.env.DB_PG_PORT || 5432),
    db: process.env.DB_PG_DATABASE || 'proxy',
    username: process.env.DB_PG_USERNAME,
    password: process.env.DB_PG_PASSWORD,
    enableTls: convertStringToBoolean(process.env.DB_PG_USE_TLS),
    rejectUnauthorized: convertStringToBoolean(process.env.DB_PG_TLS_REJECT_UNAUTHORIZED),
    applicationName: process.env.DB_PG_APPLICATION_NAME || 'proxy-typeorm',
    ...(process.env.DB_PG_MIN && {min: Number(process.env.DB_PG_MIN)}),
    ...(process.env.DB_PG_MAX && {max: Number(process.env.DB_PG_MAX)}),
    ...(process.env.DB_PG_IDLE_TIMEOUT && {idleTimeout: Number(process.env.DB_PG_IDLE_TIMEOUT)}),
  };
});
