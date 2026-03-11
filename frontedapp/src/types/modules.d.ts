// Type shim for date-fns@3.x which ships .d.mts types only
// TypeScript bundler resolution doesn't always pick up .d.mts via exports map

declare module 'date-fns' {
  // Re-declare the most commonly used functions
  export function format(date: Date | number, formatStr: string, options?: object): string;
  export function parseISO(argument: string, options?: object): Date;
  export function isValid(date: unknown): boolean;
  export function addDays(date: Date | number, amount: number): Date;
  export function subDays(date: Date | number, amount: number): Date;
  export function startOfDay(date: Date | number): Date;
  export function endOfDay(date: Date | number): Date;
  export function differenceInDays(dateLeft: Date | number, dateRight: Date | number): number;
  export function differenceInHours(dateLeft: Date | number, dateRight: Date | number): number;
  export function isBefore(dateLeft: Date | number, dateRight: Date | number): boolean;
  export function isAfter(dateLeft: Date | number, dateRight: Date | number): boolean;
  export function formatDistanceToNow(date: Date | number, options?: object): string;
  export function formatDistance(dateLeft: Date | number, dateRight: Date | number, options?: object): string;
}
