import {UsersHttpController} from '@src-api/http/controller/users/users.http.controller';
import {IdentityHttpController} from '@src-api/http/controller/identity/identity.http.controller';
import {MystProviderHttpController} from '@src-api/http/controller/provider/myst/myst-provider-http.controller';
import {ProxyHttpController} from '@src-api/http/controller/proxy/proxy.http.controller';
import {MystProviderProxyHttpController} from '@src-api/http/controller/proxy/myst/myst-provider-proxy-http.controller';
import {UsersProxyHttpController} from '@src-api/http/controller/users-proxy/users-proxy-http.controller';
import {AclHttpController} from '@src-api/http/controller/acl/acl-http.controller';

export const controllersExport = [
  UsersHttpController,
  UsersProxyHttpController,
  IdentityHttpController,
  MystProviderHttpController,
  ProxyHttpController,
  MystProviderProxyHttpController,
  AclHttpController,
];
