import {plainToInstance} from 'class-transformer';
import {validateSync} from 'class-validator';
import {EnvConfigDto} from '../dto/env-config.dto';

function removeObjectItem(obj: Record<string, unknown>) {
  for (const key in obj) {
    if (!Object.hasOwnProperty.call(obj, key)) {
      continue;
    }

    if (obj[key] === '') {
      delete obj[key];
    }
  }

  return obj;
}

export function envValidate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvConfigDto,
    removeObjectItem(config),
    {enableImplicitConversion: true},
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: true,
    stopAtFirstError: true,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
