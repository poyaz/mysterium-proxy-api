import {IDateTime} from '../../core/interface/i-date-time.interface';
import * as moment from 'moment-timezone';

export class DateTime implements IDateTime {
  constructor(private readonly _locales = 'en', private readonly _zone = 'US/Eastern') {
  }

  get locales() {
    return this._locales;
  }

  get zone() {
    return this._zone;
  }

  gregorianCurrentDateWithTimezone(): Date {
    return new Date();
  }

  gregorianCurrentDateWithTimezoneString(format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    return this._gregorianWithTimezone(new Date()).format(format);
  }

  gregorianDateWithTimezone(date: string, inputFormat: string = 'YYYY-MM-DD HH:mm:ss'): Date {
    const dateObj = moment(date, inputFormat);

    return this._gregorianWithTimezone(dateObj).toDate();
  }

  gregorianWithTimezoneString(date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    return this._gregorianWithTimezone(date).format(format);
  }

  private _gregorianWithTimezone(date) {
    if (typeof date.getTimezoneOffset === 'function' && date.getTimezoneOffset() === 0) {
      return moment(date);
    }
    if (
      Object.hasOwnProperty.call(date, '_isAMomentObject') &&
      date['_d'].getTimezoneOffset() === 0
    ) {
      return moment(date);
    }

    return moment(date).tz(this._zone);
  }
}
