import {Module} from '@nestjs/common';
import {SwaggerCommandController} from './api/command/controller/swagger/swagger.command.controller';

@Module({
  providers: [SwaggerCommandController],
})
export class CommandModule {
}
