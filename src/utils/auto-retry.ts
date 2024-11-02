export const autoRetryGet = <T>(
  tryGet: (onSuccess: (result: T) => void) => void | Promise<void>,
  interval: { mode: "fixed"; value: number } | { mode: "backoff"; base: number; max: number },
  maxRetryTimes: number,
  stopOnError: boolean = true,
): [Promise<T>, () => void /* canceller */] => {
  let isCancelled = false;
  let retryCount = 0;
  let currentInterval = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let rejectPromise: ((reason?: any) => void) | null = null;

  const promise = new Promise<T>((resolve, reject) => {
    rejectPromise = reject;

    const executeTryGet = () => {
      if (isCancelled) {
        reject(new Error("Operation cancelled"));
        return;
      }

      tryGet((result: T) => {
        if (!isCancelled) {
          resolve(result);
          canceller();
        }
      });

      retryCount++;

      if (retryCount >= maxRetryTimes) {
        if (stopOnError) {
          reject(new Error("Max retry attempts reached"));
          return;
        }
      }

      if (retryCount < maxRetryTimes) {
        // Determine the next interval based on the mode
        if (interval.mode === "fixed") {
          currentInterval = interval.value;
        } else {
          // Backoff mode
          currentInterval = Math.min(interval.base * 2 ** (retryCount - 1), interval.max);
        }

        // Schedule the next retry
        timeoutId = setTimeout(executeTryGet, currentInterval);
      } else if (!stopOnError) {
        // Continue retrying without rejecting
        if (interval.mode === "fixed") {
          currentInterval = interval.value;
        } else {
          currentInterval = Math.min(interval.base * 2 ** (retryCount - 1), interval.max);
        }
        timeoutId = setTimeout(executeTryGet, currentInterval);
      }
    };

    // Start the first attempt
    executeTryGet();
  });

  // The canceller function
  const canceller = () => {
    isCancelled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (rejectPromise) {
      rejectPromise(new Error("Operation cancelled"));
    }
  };

  return [promise, canceller];
};