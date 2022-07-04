import {PickType} from '@nestjs/swagger';
import {CreateUserInputDto} from './create-user-input.dto';
import {instanceToPlain} from 'class-transformer';

export class LoginInputDto extends PickType(CreateUserInputDto, ['username', 'password'] as const) {
  static toObject(dto: LoginInputDto): { username: string, password: string } {
    const data = instanceToPlain(dto);

    return {username: data.username, password: data.password};
  }
}
