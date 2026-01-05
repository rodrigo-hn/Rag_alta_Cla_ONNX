/**
 * Pipe para formatear fechas en formato chileno
 */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateFormat',
  standalone: true
})
export class DateFormatPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, format: 'short' | 'long' | 'full' = 'short'): string {
    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;

    if (isNaN(date.getTime())) return '';

    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Santiago'
    };

    switch (format) {
      case 'short':
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
        break;
      case 'long':
        options.day = 'numeric';
        options.month = 'long';
        options.year = 'numeric';
        break;
      case 'full':
        options.weekday = 'long';
        options.day = 'numeric';
        options.month = 'long';
        options.year = 'numeric';
        break;
    }

    return date.toLocaleDateString('es-CL', options);
  }
}
