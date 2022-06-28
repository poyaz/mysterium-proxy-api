import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {resolve} from 'path';
import {envValidate} from './validate/env.validation';
import serverConfig from './config/server.config';
import postgresConfig from './config/postgres.config';
import squidConfig from './config/squid.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: resolve('env', 'app', '.env'),
      validate: envValidate,
      load: [serverConfig, postgresConfig, squidConfig],
    }),
  ],
})
export class ConfigureModule {
}
