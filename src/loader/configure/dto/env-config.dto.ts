import {IsDefined, IsEnum, IsIn, IsNumber, IsOptional, IsString} from 'class-validator';
import {EnvironmentEnv} from '@src-loader/configure/enum/environment.env';
import {BooleanEnv} from '@src-loader/configure/enum/boolean.env';
import {Transform} from 'class-transformer';

export class EnvConfigDto {
  @IsOptional()
  @IsString()
  TZ?: string;

  @IsOptional()
  @IsEnum(EnvironmentEnv)
  @Transform(param => param.value.toLowerCase())
  NODE_ENV?: EnvironmentEnv;

  @IsOptional()
  @IsEnum(BooleanEnv)
  @Transform(param => param.value.toLowerCase())
  FAKE_AUTH_GUARD?: BooleanEnv;

  @IsOptional()
  @IsString()
  SERVER_HOST?: string;

  @IsOptional()
  @IsNumber()
  SERVER_HTTP_PORT?: number;

  @IsOptional()
  @IsNumber()
  SERVER_HTTPS_PORT?: number;

  @IsOptional()
  @IsEnum(BooleanEnv)
  @Transform(param => param.value.toLowerCase())
  SERVER_HTTPS_FORCE?: BooleanEnv;

  @IsOptional()
  @IsString()
  SERVER_UPLOAD_PATH?: string;

  @IsOptional()
  @IsString()
  DB_PG_HOST?: string;

  @IsOptional()
  @IsNumber()
  DB_PG_PORT?: number;

  @IsOptional()
  @IsString()
  DB_PG_DATABASE?: string;

  @IsOptional()
  @IsString()
  DB_PG_USERNAME?: string;

  @IsOptional()
  @IsString()
  DB_PG_PASSWORD?: string;

  @IsOptional()
  @IsNumber()
  DB_PG_MIN?: number;

  @IsOptional()
  @IsNumber()
  DB_PG_MAX?: number;

  @IsOptional()
  @IsNumber()
  DB_PG_IDLE_TIMEOUT?: number;

  @IsOptional()
  @IsEnum(BooleanEnv)
  @Transform(param => param.value.toLowerCase())
  DB_PG_USE_TLS?: BooleanEnv;

  @IsOptional()
  @IsEnum(BooleanEnv)
  @Transform(param => param.value.toLowerCase())
  DB_PG_TLS_REJECT_UNAUTHORIZED?: BooleanEnv;

  @IsOptional()
  @IsString()
  DB_PG_APPLICATION_NAME?: string;

  @IsOptional()
  @IsString()
  DB_REDIS_HOST?: string;

  @IsOptional()
  @IsNumber()
  DB_REDIS_PORT?: number;

  @IsOptional()
  @IsString()
  DB_REDIS_DATABASE?: string;

  @IsOptional()
  @IsString()
  DB_REDIS_PASSWORD?: string;

  @IsString()
  JWT_SECRET_KEY: string;

  @IsOptional()
  @IsString()
  SQUID_PWD_FILE?: string;

  @IsOptional()
  @IsString()
  @IsIn(['http', 'https'])
  DOCKER_PROTOCOL: string;

  @IsOptional()
  @IsString()
  DOCKER_HOST: string;

  @IsOptional()
  @IsNumber()
  DOCKER_PORT: number;
}


