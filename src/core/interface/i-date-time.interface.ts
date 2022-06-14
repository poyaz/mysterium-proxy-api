export enum I_DATE_TIME {
  DEFAULT = 'DATE_TIME_DEFAULT',
}

export interface IDateTime {
  gregorianDateWithTimezone(date: string, inputFormat?: string): Date;

  gregorianWithTimezoneString(date: Date, format?: string): string;

  gregorianCurrentDateWithTimezone(): Date;

  gregorianCurrentDateWithTimezoneString(format?: string): string;
}
