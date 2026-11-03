/** Wait for asynchronous preparation while keeping cancellation immediate. */
export async function abortable(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted)
    throw new DOMException("Operation cancelled.", "AbortError");
  let abort;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        abort = () =>
          reject(new DOMException("Operation cancelled.", "AbortError"));
        signal.addEventListener("abort", abort, { once: true });
      }),
    ]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
