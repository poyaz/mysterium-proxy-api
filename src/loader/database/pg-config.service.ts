import {TypeOrmModuleOptions, TypeOrmOptionsFactory} from '@nestjs/typeorm';
import {Inject, Injectable, Optional} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {DatabaseConfigInterface} from '@src-loader/configure/interface/database-config.interface';
import {EnvironmentEnv} from '@src-loader/configure/enum/environment.env';
import {PostgresConnectionOptions} from 'typeorm/driver/postgres/PostgresConnectionOptions';

@Injectable()
export class PgConfigService implements TypeOrmOptionsFactory {
  constructor(
    @Inject(ConfigService)
    private readonly _configService: ConfigService,
    @Optional()
    @Inject('USE_CLI')
    private readonly _useCli?: boolean,
  ) {
  }

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const NODE_ENV = this._configService.get<string>('NODE_ENV', '');
    const DATABASE_OPTIONS = this._configService.get<DatabaseConfigInterface>('postgres');

    return <PostgresConnectionOptions>{
      name: 'pg',
      type: 'postgres',

      applicationName: DATABASE_OPTIONS.applicationName,

      host: DATABASE_OPTIONS.host,
      port: DATABASE_OPTIONS.port,
      database: DATABASE_OPTIONS.db,
      username: DATABASE_OPTIONS.username,
      ...(DATABASE_OPTIONS.password && DATABASE_OPTIONS.password !== '' && {password: DATABASE_OPTIONS.password}),
      ...(DATABASE_OPTIONS.enableTls && {ssl: {rejectUnauthorized: DATABASE_OPTIONS.rejectUnauthorized}}),
      extra: {
        ...(DATABASE_OPTIONS.min && DATABASE_OPTIONS.min > 0 && {max: DATABASE_OPTIONS.min}),
        ...(DATABASE_OPTIONS.max && DATABASE_OPTIONS.max > 0 && {max: DATABASE_OPTIONS.max}),
        ...(DATABASE_OPTIONS.idleTimeout && DATABASE_OPTIONS.idleTimeout > 0 && {idleTimeoutMillis: DATABASE_OPTIONS.idleTimeout}),
      },

      entities: [`dist/infrastructure/entity/*.entity{.ts,.js}`],
      synchronize: false,
      migrations: [`dist/infrastructure/migrations/*{.ts,.js}`],
      migrationsTableName: 'migrations_history',
      migrationsRun: this._useCli ? false : NODE_ENV === '' || NODE_ENV === EnvironmentEnv.DEVELOP,
      retryAttempts: 0,
    };
  }
}
