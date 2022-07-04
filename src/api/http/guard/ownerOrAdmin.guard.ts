import {Injectable, CanActivate, ExecutionContext} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';

@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {
  }

  canActivate(context: ExecutionContext): boolean {
    const disableCheckAuth = this.reflector.get<string[]>('disableCheckAuth', context.getHandler());
    if (disableCheckAuth) {
      return true;
    }

    const roles = this.reflector.get<UserRoleEnum[]>('roles', context.getHandler());
    if (!roles) {
      return true;
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
