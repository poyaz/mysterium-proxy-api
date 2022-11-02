import {ModuleMetadata, Type} from '@nestjs/common';
import {DockerOptions} from 'dockerode';

export interface DockerOptionsFactory {
  createDockerOptions(): Promise<DockerOptions> | DockerOptions;
}

export interface DockerModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<DockerModuleAsyncOptions>;
  useClass?: Type<DockerModuleAsyncOptions>;
  useFactory?: (...args: any[]) => Promise<DockerOptions> | DockerOptions;
  inject?: any[];
}
