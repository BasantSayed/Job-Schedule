export function computeBackoffMs(attempt: number): number {
  const cappedAttempt = Math.max(1, Math.min(attempt, 10));
  return 1000 * 2 ** cappedAttempt;
}

export function shouldRetry(attempt: number, maxAttempts: number): boolean {
  return attempt < maxAttempts;
}
