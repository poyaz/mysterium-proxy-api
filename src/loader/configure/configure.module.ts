import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {resolve} from 'path';
import {envValidate} from './validate/env.validation';
import serverConfig from './config/server.config';
import postgresConfig from './config/postgres.config';
import redisConfig from './config/redis.config';
import htpasswdConfig from './config/htpasswd.config';
import dockerConfig from './config/docker.config';
import mystConfig from './config/myst.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: resolve('env', 'app', '.env'),
      validate: envValidate,
      load: [
        serverConfig,
        postgresConfig,
        redisConfig,
        htpasswdConfig,
        dockerConfig,
        mystConfig,
      ],
    }),
  ],
})
export class ConfigureModule {
}
