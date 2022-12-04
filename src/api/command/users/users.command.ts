import {Command, CommandRunner} from 'nest-commander';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {CreateUserInputDto} from '@src-api/http/controller/users/dto/create-user-input.dto';
import * as crypto from 'crypto';
import {plainToInstance} from 'class-transformer';
import {validate} from 'class-validator';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';

@Command({
  name: 'add:admin',
  description: 'Create user with admin role',
  arguments: '<username>',
  argsDescription: {
    username: 'The username of user',
  },
})
export class UsersCreateCommand implements CommandRunner {
  constructor(
    private readonly _userService: IUsersServiceInterface,
  ) {
  }

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const [username] = passedParams;
    const password = crypto.randomBytes(9).toString('base64url');

    const dataObj = <CreateUserInputDto>{
      username,
      password,
      confirmPassword: password,
      isEnable: true,
    };

    const dataInstance = plainToInstance(CreateUserInputDto, dataObj);
    const errorsList = await validate(dataInstance);
    if (errorsList.length > 0) {
      const propertiesError = [];

      for (const error of errorsList) {
        propertiesError.push({
          property: error.property,
          constraints: error.constraints,
        });
      }

      const commandError = new FillDataRepositoryException<any>(propertiesError.map((v) => v.property));
      commandError['messages'] = propertiesError.map((v) => Object.values(v.constraints)).flat();

      return Promise.reject(commandError);
    }

    const createUserModel = CreateUserInputDto.toModel(dataInstance);
    createUserModel.role = UserRoleEnum.ADMIN;

    const [createError, createData] = await this._userService.create(createUserModel);
    if (createError) {
      return Promise.reject(createError);
    }

    console.log(`The username "${username}" with role admin has been generated. (Password: ${createData.password})`);

    return Promise.resolve(undefined);
  }
}
