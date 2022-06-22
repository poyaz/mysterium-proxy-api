import {IsEmpty, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';
import {EnvironmentEnv} from '../enum/environment.env';
import {BooleanEnv} from '../enum/boolean.env';
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
  DB_PG_HOST?: string;

  @IsOptional()
  @IsString()
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
  @IsString()
  DB_PG_MAX?: number;

  @IsOptional()
  @IsString()
  DB_PG_IDLE_TIMEOUT?: number;

  @IsOptional()
  @IsEnum(BooleanEnv)
  @Transform(param => param.value.toLowerCase())
  DB_PG_USE_TLS?: BooleanEnv;

  @IsOptional()
  @IsEnum(BooleanEnv)
  @Transform(param => param.value.toLowerCase())
  DB_PG_TLS_REJECT_UNAUTHORIZED?: BooleanEnv;
}


