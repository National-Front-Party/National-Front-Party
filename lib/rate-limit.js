// In-memory only: this is not reliable across multiple instances or serverless workers.
// Redis/Upstash can replace the storage later without changing this interface.
export function createRateLimiter({ limit, windowMs, now = Date.now }) {
  const windows = new Map();

  return function check(key) {
    const currentTime = now();

    for (const [storedKey, window] of windows) {
      if (currentTime >= window.resetAt) {
        windows.delete(storedKey);
      }
    }

    let window = windows.get(key);
    if (!window) {
      window = { count: 0, resetAt: currentTime + windowMs };
      windows.set(key, window);
    }

    if (window.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((window.resetAt - currentTime) / 1000),
        ),
      };
    }

    window.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  };
}
