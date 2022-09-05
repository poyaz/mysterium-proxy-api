import {UsersHttpController} from '@src-api/http/controller/users/users.http.controller';
import {ProxyHttpController} from '@src-api/http/controller/proxy/proxy.http.controller';
import {IdentityController} from '@src-api/http/controller/identity/identity.controller';

export const controllersExport = [
  UsersHttpController,
  ProxyHttpController,
  IdentityController,
];
