export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
export const lerp = (a: number, b: number, alpha: number) => a + alpha * (b - a);
export const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));