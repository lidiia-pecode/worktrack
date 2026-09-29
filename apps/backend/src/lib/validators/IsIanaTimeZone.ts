import { registerDecorator, ValidationOptions } from 'class-validator';

/** ruzzia's zones in IANA's zone.tab. WorkTrack does not offer them. */
const EXCLUDED_TIME_ZONES = new Set([
  'Europe/Kaliningrad',
  'Europe/Moscow',
  'Europe/Kirov',
  'Europe/Volgograd',
  'Europe/Astrakhan',
  'Europe/Saratov',
  'Europe/Ulyanovsk',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Barnaul',
  'Asia/Tomsk',
  'Asia/Novokuznetsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Chita',
  'Asia/Yakutsk',
  'Asia/Khandyga',
  'Asia/Vladivostok',
  'Asia/Ust-Nera',
  'Asia/Magadan',
  'Asia/Sakhalin',
  'Asia/Srednekolymsk',
  'Asia/Kamchatka',
  'Asia/Anadyr',
]);

export const isIanaTimeZone = (value: unknown): boolean => {
  if (typeof value !== 'string' || !/^[A-Za-z]/.test(value)) {
    return false;
  }

  try {
    const { timeZone } = new Intl.DateTimeFormat('en-US', {
      timeZone: value,
    }).resolvedOptions();

    return !EXCLUDED_TIME_ZONES.has(timeZone);
  } catch {
    return false;
  }
};

export function IsIanaTimeZone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsIanaTimeZone',
      target: object.constructor,
      options: validationOptions,
      propertyName,
      validator: {
        validate: isIanaTimeZone,
        defaultMessage: () =>
          'Timezone must be one of the IANA time zones WorkTrack offers (e.g. Europe/Kyiv, UTC)',
      },
    });
  };
}
