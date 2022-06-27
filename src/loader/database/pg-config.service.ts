import {TypeOrmModuleOptions, TypeOrmOptionsFactory} from '@nestjs/typeorm';
import {Inject, Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {DatabaseConfigInterface} from '../configure/interface/database-config.interface';
import {EnvironmentEnv} from '../configure/enum/environment.env';

@Injectable()
export class PgConfigService implements TypeOrmOptionsFactory {
  constructor(@Inject(ConfigService) private readonly _configService: ConfigService) {
  }

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const NODE_ENV = this._configService.get<string>('NODE_ENV', '');
    const DATABASE_OPTIONS = this._configService.get<DatabaseConfigInterface>('postgres');

    return {
      name: 'pg',
      type: 'postgres',

      applicationName: DATABASE_OPTIONS.applicationName,

      host: DATABASE_OPTIONS.host,
      port: DATABASE_OPTIONS.port,
      database: DATABASE_OPTIONS.db,
      username: DATABASE_OPTIONS.username,
      ...(DATABASE_OPTIONS.password && DATABASE_OPTIONS.password !== '' && {password: DATABASE_OPTIONS.password}),

      ...(DATABASE_OPTIONS.enableTls && {ssl: {rejectUnauthorized: DATABASE_OPTIONS.rejectUnauthorized}}),

      entities: [`dist/src/infrastructure/entity/*.entity{.ts,.js}`],
      synchronize: false,
      migrations: [`dist/storage/migrations/*{.ts,.js}`],
      migrationsTableName: 'migrations_history',
      migrationsRun: NODE_ENV === '' || NODE_ENV === EnvironmentEnv.DEVELOP,
      retryAttempts: 0,
    };
  }
}
