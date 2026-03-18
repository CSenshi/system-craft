export interface WaitOptions {
  /** Max time to wait in ms */
  timeoutMs?: number;
  /** Interval between retries in ms */
  intervalMs?: number;
  /** Label for error messages */
  label?: string;
}

/**
 * Polls a health check function until it returns true or the timeout is reached.
 */
export async function waitForService(
  healthCheck: () => Promise<boolean>,
  options: WaitOptions = {},
): Promise<void> {
  const { timeoutMs = 30_000, intervalMs = 500, label = 'service' } = options;

  const deadline = Date.now() + timeoutMs;

  // Use do-while to guarantee at least one health check attempt,
  // even when timeoutMs is 0 or very small.
  do {
    try {
      if (await healthCheck()) {
        return;
      }
    } catch {
      // Health check threw — keep retrying
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    // Cap sleep to the remaining time so we don't overshoot the deadline
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(intervalMs, remaining)),
    );
  } while (Date.now() < deadline);

  throw new Error(`${label} did not become healthy within ${timeoutMs}ms`);
}

/**
 * Waits for an HTTP service to respond on the given host and port.
 * Note: this uses HTTP fetch, so it only works for HTTP services (not raw TCP like Redis/Postgres).
 */
export async function waitForHttpService(
  host: string,
  port: number,
  options: WaitOptions = {},
): Promise<void> {
  return waitForService(
    async () => {
      try {
        const response = await fetch(`http://${host}:${port}`);
        return response.ok || response.status < 500;
      } catch {
        return false;
      }
    },
    { ...options, label: options.label ?? `${host}:${port}` },
  );
}

/**
 * Waits for the Toxiproxy API to be ready.
 */
export async function waitForToxiproxy(
  apiUrl = 'http://localhost:8474',
  options: WaitOptions = {},
): Promise<void> {
  return waitForService(
    async () => {
      try {
        const response = await fetch(`${apiUrl}/version`);
        return response.ok;
      } catch {
        return false;
      }
    },
    { ...options, label: options.label ?? 'Toxiproxy' },
  );
}
