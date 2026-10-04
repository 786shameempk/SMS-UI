import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// findBy*/waitFor give up after 1 s by default. Lazy-loaded chunks and the full suite running in parallel (with
// the docker stack busy) can take longer than that, which made heavy page tests flaky. A passing check still
// returns as soon as it holds; only a genuine failure waits the full 5 s.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// jsdom gaps that Radix UI, framer-motion and recharts reach for.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver ??= IntersectionObserverStub as unknown as typeof IntersectionObserver;

Element.prototype.scrollIntoView ??= vi.fn();
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= vi.fn();
// jsdom has no canvas backend; returning null (as a browser can) keeps it from logging "Not implemented".
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement["getContext"];
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
