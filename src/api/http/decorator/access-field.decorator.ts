import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {UserRoleEnum} from '../../../core/enum/user-role.enum';

export function AccessField(roles: Array<UserRoleEnum>, validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: roles,
      validator: AccessConstraint,
    });
  };
}

@ValidatorConstraint({name: 'AccessField'})
class AccessConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    console.log(args);
    // const [relatedPropertyName] = args.constraints;
    // const relatedValue = (args.object as any)[relatedPropertyName];
    //
    // return value === relatedValue;
    return true;
  }
}
