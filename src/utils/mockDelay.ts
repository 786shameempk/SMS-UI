/** Simulates network latency for the local mock data layer so loading states are exercised realistically. */
export function mockDelay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}
