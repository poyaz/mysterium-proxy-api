import {registerAs} from '@nestjs/config';
import {DatabaseConfigInterface} from '@src-loader/configure/interface/database-config.interface';
import {convertStringToBoolean} from '@src-loader/configure/util';
import {RedisConfigInterface} from '@src-loader/configure/interface/redis-config.interface';

export default registerAs('redis', (): RedisConfigInterface => {
  return {
    host: process.env.DB_REDIS_HOST || '127.0.0.1',
    port: Number(process.env.DB_REDIS_PORT || 6379),
    db: Number(process.env.DB_REDIS_DATABASE || 1),
    ...(process.env.DB_REDIS_PASSWORD && {password: process.env.DB_REDIS_PASSWORD}),
  };
});
