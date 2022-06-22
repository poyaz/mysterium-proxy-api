import {Global, Module} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PgConfigService} from './pg-config.service';

@Global()
@Module({
  imports: [],
  providers: [ConfigService, PgConfigService],
  exports: [PgConfigService],
})
export class PgModule {
}
