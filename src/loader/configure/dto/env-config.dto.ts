import {IsEmpty, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString} from 'class-validator';
import {EnvironmentEnv} from '../enum/environment.env';
import {BooleanEnv} from '../enum/boolean.env';
import {Transform} from 'class-transformer';

export class EnvConfigDto {
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
}


