import {UsersHttpController} from '@src-api/http/controller/users/users.http.controller';
import {IdentityHttpController} from '@src-api/http/controller/identity/identity.http.controller';
import {MystProviderHttpController} from '@src-api/http/controller/provider/myst/myst-provider-http.controller';

export const controllersExport = [
  UsersHttpController,
  IdentityHttpController,
  MystProviderHttpController,
];
