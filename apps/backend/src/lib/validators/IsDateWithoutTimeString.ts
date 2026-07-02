import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

const FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function IsDateWithoutTimeString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsDateWithoutTimeString',
      target: object.constructor,
      options: validationOptions,
      propertyName,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !FORMAT_REGEX.test(value)) {
            return false;
          }

          const [year, month, day] = value.split('-').map(Number);
          const date = new Date(year, month - 1, day);

          return (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
          );
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid date in format YYYY-MM-DD`;
        },
      },
    });
  };
}
