// A dynamic import can transiently fail — a CDN edge hiccup, a flaky mobile
// connection, momentary packet loss — even when the file being requested is
// completely valid and served correctly moments later (confirmed live: the
// exact chunk a user's browser reported "Failed to fetch dynamically
// imported module" for served fine, correct content-type and byte-for-byte
// size, on every direct check). Retrying a few times with backoff absorbs
// that at the point of failure instead of surfacing an error screen on the
// first hiccup.
export function lazyRetry<T>(factory: () => Promise<T>, retries = 3, delayMs = 600): Promise<T> {
  return factory().catch((error) => {
    if (retries <= 0) throw error;
    return new Promise<void>((resolve) => setTimeout(resolve, delayMs)).then(() =>
      lazyRetry(factory, retries - 1, delayMs * 2)
    );
  });
}
