import {CommandRunner, Command, Option} from 'nest-commander';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {NestFactory} from '@nestjs/core';
import {resolve} from 'path';
import {writeFileSync} from 'fs';
import * as yaml from 'yaml';
import {SecuritySchemeObject} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import {VersioningType} from '@nestjs/common';
import {CommandModule} from '../../../command.module';

const DEFAULT_STORE_PATH = resolve('storage', 'tmp');

@Command({name: 'swagger', description: 'A swagger command'})
export class SwaggerCommand implements CommandRunner {
  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const app = await NestFactory.create(CommandModule);
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
    });

    const swaggerConf = new DocumentBuilder()
      .setTitle('Mysterium proxy api')
      .setDescription('The proxy API description')
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'JWT token header',
        in: 'header',
      } as SecuritySchemeObject)
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConf);

    const type = options?.output !== undefined && options?.output !== '' ? options.type : 'json';

    let data;
    let outputFile;
    if (type === 'yaml' || type === 'yml') {
      data = yaml.stringify(document, {});
      outputFile = options?.output !== undefined && options?.output !== ''
        ? options.output
        : resolve(process.cwd(), DEFAULT_STORE_PATH, 'swagger.yaml');
    } else {
      data = JSON.stringify(document);
      outputFile = options?.output !== undefined && options?.output !== ''
        ? options.output
        : resolve(process.cwd(), DEFAULT_STORE_PATH, 'swagger.json');
    }

    writeFileSync(outputFile, data, {encoding: 'utf8'});
  }

  @Option({
    flags: '-o, --output [output]',
    description: 'Store swagger output file (Default path: <root-project>/storage/tmp/swagger.json)',
  })
  parseFile(val: string): string {
    return val;
  }

  @Option({
    flags: '-t, --type [type]',
    description: 'Type of swagger file (Default: json)',
  })
  parseType(val: string): string {
    return val.toLowerCase();
  }
}
