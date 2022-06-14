import {Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus} from '@nestjs/common';
import {Observable} from 'rxjs';
import {Reflector} from '@nestjs/core';
import {ApiHeader} from '@nestjs/swagger';
import {UserRoleEnum} from '../../../core/enum/user-role.enum';

@Injectable()
export class FakeAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    context.switchToHttp().getResponse().setHeader('X-Auth-Guard', 'fake');

    const request = context.switchToHttp().getRequest();

    const userId = request.headers['x-fake-user-id'];
    const role = request.headers['x-fake-role'];

    if (userId && role) {
      request.user = {
        userId,
        role,
      };

      return true;
    }

    const disableCheckAuth = this.reflector.get<string[]>('disableCheckAuth', context.getHandler());
    if (disableCheckAuth) {
      return true;
    }

    throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
  }
}
