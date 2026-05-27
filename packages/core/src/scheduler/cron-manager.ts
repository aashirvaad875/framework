// packages/core/src/scheduler/cron-manager.ts

import { parseExpression } from 'cron-parser';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { CronExpression } from './types.js';

export class CronManager {
  static validateExpression(expression: string): boolean {
    try {
      parseExpression(expression);
      return true;
    } catch {
      return false;
    }
  }

  static parseExpression(expression: string): CronExpression {
    try {
      const parsed = parseExpression(expression);
      return {
        expression,
      };
    } catch (error) {
      throw new Error(`Invalid cron expression: ${expression}. ${(error as Error).message}`);
    }
  }

  static getNextRunTime(
    expression: string,
    timezone?: string,
    fromTime: Date = new Date(),
  ): Date {
    try {
      const interval = parseExpression(expression, {
        currentDate: timezone ? toZonedTime(fromTime, timezone) : fromTime,
      });

      const nextDate = interval.next().toDate();

      if (timezone) {
        return toZonedTime(nextDate, timezone);
      }

      return nextDate;
    } catch (error) {
      throw new Error(`Failed to calculate next run time for "${expression}": ${(error as Error).message}`);
    }
  }

  static isTimeToRun(
    expression: string,
    timezone: string | undefined,
    currentTime: Date,
    lastRunTime?: Date,
  ): boolean {
    try {
      const nextRunTime = this.getNextRunTime(expression, timezone, lastRunTime || new Date(0));

      if (!lastRunTime) {
        // First run: only trigger if next run is now or past
        return currentTime >= nextRunTime;
      }

      // Subsequent runs: trigger if we've crossed the next run time
      return currentTime >= nextRunTime && (lastRunTime < nextRunTime || lastRunTime.getTime() === nextRunTime.getTime());
    } catch {
      return false;
    }
  }

  static getScheduleDescription(expression: string): string {
    try {
      const parts = expression.split(' ');

      if (parts.length !== 5) {
        return 'Invalid cron expression';
      }

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

      // Simple descriptions for common patterns
      if (expression === '0 * * * *') return 'Every hour';
      if (expression === '0 0 * * *') return 'Every day at midnight';
      if (hour !== '*' && minute !== '*') {
        return `At ${hour}:${minute.padStart(2, '0')} daily`;
      }
      if (dayOfWeek !== '*') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayNum = parseInt(dayOfWeek);
        if (!isNaN(dayNum) && dayNum < 7) {
          return `Every ${days[dayNum]}`;
        }
      }

      return expression;
    } catch {
      return expression;
    }
  }

  static getNextOccurrences(
    expression: string,
    count: number = 5,
    timezone?: string,
  ): Date[] {
    try {
      const interval = parseExpression(expression, {
        currentDate: timezone ? toZonedTime(new Date(), timezone) : new Date(),
      });

      const occurrences: Date[] = [];
      for (let i = 0; i < count; i++) {
        occurrences.push(interval.next().toDate());
      }

      return occurrences;
    } catch (error) {
      throw new Error(`Failed to get next occurrences: ${(error as Error).message}`);
    }
  }
}
