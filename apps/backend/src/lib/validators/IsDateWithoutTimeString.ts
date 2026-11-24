import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

const FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
// No record is older or planned further ahead, and date arithmetic past the
// year 9999 stops producing dates the database reads.
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

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
            year >= MIN_YEAR &&
            year <= MAX_YEAR &&
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
          );
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid date in format YYYY-MM-DD, from ${MIN_YEAR} to ${MAX_YEAR}`;
        },
      },
    });
  };
}
