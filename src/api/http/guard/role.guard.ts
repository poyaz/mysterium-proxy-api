import {Injectable, CanActivate, ExecutionContext} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {UnknownException} from '@src-core/exception/unknown.exception';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly _MODIFICATION_METHOD = ['POST', 'PUT', 'PATCH', 'DELETE'];

  constructor(private reflector: Reflector) {
  }

  canActivate(context: ExecutionContext): boolean {
    const disableCheckAuth = this.reflector.get<boolean>('disableCheckAuth', context.getHandler());
    if (disableCheckAuth) {
      return true;
    }

    const classRoles = this.reflector.get<UserRoleEnum[]>('roles', context.getClass());
    const handlerRoles = this.reflector.get<UserRoleEnum[]>('roles', context.getHandler());
    const roles = classRoles || handlerRoles;
    if (!roles) {
      throw new UnknownException();
    }

    const request = context.switchToHttp().getRequest();
    if (roles.indexOf(request.user.role) === -1) {
      return false;
    }

    const enableOwnAccessClass = this.reflector.get<boolean>('ownAccess', context.getClass());
    const enableOwnAccessHandler = this.reflector.get<boolean>('ownAccess', context.getHandler());
    const enableOwnAccess = enableOwnAccessClass || enableOwnAccessHandler;
    if (enableOwnAccess) {
      return request.params['userId'] === request.user.userId;
    }

    const enableOwnModificationClass = this.reflector.get<boolean>('ownModification', context.getClass());
    const enableOwnModificationHandler = this.reflector.get<boolean>('ownModification', context.getHandler());
    const enableOwnModification = enableOwnModificationClass || enableOwnModificationHandler;
    if (enableOwnModification && this._MODIFICATION_METHOD.indexOf(request.method) !== -1) {
      return request.params['userId'] === request.user.userId;
    }

    if (request.user.role === UserRoleEnum.ADMIN) {
      return true;
    }

    return request.params['userId'] === request.user.userId;
  }
}
