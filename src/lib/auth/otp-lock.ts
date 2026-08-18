const tails = new Map<string, Promise<void>>();

/**
 * Serialize OTP send/verify for one phone (or panel key) inside this process.
 * Closes the peek-then-send race where parallel requests all pass rate-limit.
 */
export async function withOtpLock<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = tails.get(key) ?? Promise.resolve();
  let release!: () => void;
  const done = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = prev.then(
    () => done,
    () => done,
  );
  tails.set(key, chained);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (tails.get(key) === chained) {
      tails.delete(key);
    }
  }
}
