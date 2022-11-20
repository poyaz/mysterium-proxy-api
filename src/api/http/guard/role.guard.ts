import {Injectable, CanActivate, ExecutionContext} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {UnknownException} from '@src-core/exception/unknown.exception';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {
  }

  canActivate(context: ExecutionContext): boolean {
    const disableCheckAuth = this.reflector.get<string[]>('disableCheckAuth', context.getHandler());
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
    if (request.user.role === UserRoleEnum.ADMIN) {
      return true;
    }
    if (request.user.role === UserRoleEnum.USER && request.params['userId'] === request.user.userId) {
      return true;
    }

    return false;
  }
}
