import {IsDefined, IsEnum, IsIn, IsNumber, IsOptional, IsString, IsUrl} from 'class-validator';
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

  @IsDefined()
  @IsString()
  JWT_SECRET_KEY: string;

  @IsOptional()
  @IsString()
  HTPASSWD_FILE?: string;

  @IsOptional()
  @IsString()
  @IsIn(['http', 'https'])
  DOCKER_CONTROLLER_PROTOCOL?: string;

  @IsOptional()
  @IsString()
  DOCKER_CONTROLLER_HOST?: string;

  @IsOptional()
  @IsNumber()
  DOCKER_CONTROLLER_PORT?: number;

  @IsOptional()
  @IsString()
  DOCKER_MYST_IMAGE?: string;

  @IsOptional()
  @IsNumber()
  DOCKER_MYST_HTTP_PORT?: number;

  @IsOptional()
  @IsString()
  DOCKER_MYST_VOLUME_KEYSTORE_PATH?: string;

  @IsOptional()
  @IsString()
  DOCKER_MYST_CONNECT_IMAGE?: string;

  @IsOptional()
  @IsString()
  DOCKER_ENVOY_IMAGE?: string;

  @IsOptional()
  @IsNumber()
  DOCKER_ENVOY_TCP_PORT?: number;

  @IsOptional()
  @IsString()
  DOCKER_ENVOY_HOST_VOLUME_CONFIG_NAME?: string;

  @IsOptional()
  @IsEnum(BooleanEnv)
  @Transform(param => param.value.toLowerCase())
  DOCKER_ENVOY_ENABLE_WAIT_STARTUP?: BooleanEnv;

  @IsOptional()
  @IsEnum(BooleanEnv)
  @Transform(param => param.value.toLowerCase())
  DOCKER_ENVOY_ENABLE_HEALTHCHECK?: BooleanEnv;

  @IsOptional()
  @IsString()
  DOCKER_SOCAT_IMAGE?: string;

  @IsOptional()
  @IsString()
  DOCKER_LABEL_NAMESPACE?: string;

  @IsDefined()
  @IsString()
  DOCKER_REAL_PROJECT_PATH: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  MYST_DISCOVER_API_ADDR?: string;

  @IsDefined()
  @IsString()
  MYST_NODE_AUTH_USERNAME: string;

  @IsDefined()
  @IsString()
  MYST_NODE_AUTH_PASSWORD: string;

  @IsOptional()
  @IsString()
  MYST_HOST_BASE_PATH_STORE?: string;

  @IsOptional()
  @IsString()
  PROXY_GLOBAL_UPSTREAM_ADDR?: string;

  @IsOptional()
  @IsNumber()
  PROXY_START_UPSTREAM_PORT?: number;

  @IsOptional()
  @IsString()
  NGINX_ACL_FILE?: string;

  @IsOptional()
  @IsEnum(BooleanEnv)
  @Transform(param => param.value.toLowerCase())
  ENABLE_ANONYMOUS_REGISTER?: BooleanEnv;
}


