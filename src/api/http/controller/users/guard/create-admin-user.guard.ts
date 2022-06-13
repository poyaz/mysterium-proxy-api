import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common';
import {Observable} from 'rxjs';
import {Reflector} from '@nestjs/core';
import {UserRoleEnum} from '../../../../../core/enum/user-role.enum';

@Injectable()
export class CreateAdminUserGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    if (Object.hasOwnProperty.call(request.body, 'isEnable')) {
      if (!request.user) {
        return false;
      }

      if (request.user && request.user.role !== UserRoleEnum.ADMIN) {
        return false;
      }
    }

    return true;
  }
}
