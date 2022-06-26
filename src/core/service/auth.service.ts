import {Inject, Injectable} from '@nestjs/common';
import {I_USER_SERVICE, IUsersServiceInterface} from '../interface/i-users-service.interface';
import {JwtService} from '@nestjs/jwt';
import {IAuthServiceInterface} from '../interface/i-auth-service.interface';
import {AsyncReturn} from '../utility';
import {FilterModel} from '../model/filter.model';
import {UsersModel} from '../model/users.model';
import {AuthenticateException} from '../exception/authenticate.exception';
import {ConfigService} from '@nestjs/config';

@Injectable()
export class AuthService implements IAuthServiceInterface {
  private readonly _secret: string;

  constructor(
    @Inject(I_USER_SERVICE.DEFAULT)
    private readonly _usersService: IUsersServiceInterface,
    private readonly _jwtService: JwtService,
    private readonly _configService: ConfigService) {
    this._secret = this._configService.get('JWT_SECRET_KEY');
  }

  async login(username: string, password: string): Promise<AsyncReturn<Error, string>> {
    const filter = new FilterModel<UsersModel>();
    filter.addCondition({$opr: 'eq', username: username});
    const [error, usersList] = await this._usersService.findAll(filter);
    if (error) {
      return [error];
    }
    if (usersList.length === 0) {
      return [new AuthenticateException()];
    }
    if (usersList[0].password !== password) {
      return [new AuthenticateException()];
    }

    const obj = {};
    obj['userId'] = usersList[0].id;
    obj['role'] = usersList[0].role;

    const token = this._jwtService.sign(obj, {secret: this._secret});

    return [null, token];
  }
}
