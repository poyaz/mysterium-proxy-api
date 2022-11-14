import {UsersHttpController} from '@src-api/http/controller/users/users.http.controller';
import {IdentityHttpController} from '@src-api/http/controller/identity/identity.http.controller';
import {MystProviderHttpController} from '@src-api/http/controller/provider/myst/myst-provider-http.controller';
import {ProxyHttpController} from '@src-api/http/controller/proxy/proxy.http.controller';
import {MystProviderProxyHttpController} from '@src-api/http/controller/proxy/myst/myst-provider-proxy-http.controller';

export const controllersExport = [
  UsersHttpController,
  IdentityHttpController,
  MystProviderHttpController,
  ProxyHttpController,
  MystProviderProxyHttpController,
];
