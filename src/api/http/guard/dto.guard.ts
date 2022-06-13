import {Injectable, CanActivate, ExecutionContext} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {PATH_METADATA} from '@nestjs/common/constants';
import {UserRoleEnum} from '../../../core/enum/user-role.enum';

@Injectable()
export class DtoGuard implements CanActivate {
  constructor(private reflector: Reflector) {
  }

  canActivate(context: ExecutionContext): boolean {
    console.log('RolesGuard');
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // if (!roles.indexOf(request.user.role)) {
    //   return false;
    // }
    // if (request.user.role === UserRoleEnum.ADMIN) {
    //   return true;
    // }
    // if (request.user.role === UserRoleEnum.USER && request.params['userId'] === request.user.userId) {
    //   return true;
    // }

    // return false;
    return true;
  }
}
