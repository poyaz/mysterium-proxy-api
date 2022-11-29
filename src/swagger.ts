import {DocumentBuilder} from '@nestjs/swagger';
import {SecuritySchemeObject} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import {OpenAPIObject} from '@nestjs/swagger/dist/interfaces';

export function generateSwagger(): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setTitle('Mysterium proxy api')
    .setDescription('The proxy API description')
    .setVersion('1.0')
    .addTag('acl', 'This section for manage users access to proxies (**Admin access**)')
    .addTag('identity', 'This section for manage myst identity account (**Admin access**)')
    .addTag('provider', 'This section for manage providers VPN (**Admin access**)')
    .addTag('proxy', 'This section for manage proxies on provider (**Admin access**)')
    .addTag('users', 'This section for login and modify account (For all users) and manage all account (For admin)')
    .addTag('users - favorites list', 'This section for manage list of proxies for each user (For all users)')
    .addTag('users - access proxy', 'This section for show all proxy has been accessed for each user (For all users)')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'JWT token header',
      in: 'header',
    } as SecuritySchemeObject)
    .build();
}
