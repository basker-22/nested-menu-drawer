import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";

// Animations finish instantly, so exit animations unmount right away and
// tests don't depend on timing.
MotionGlobalConfig.skipAnimations = true;

// Browser APIs the drawer uses that jsdom doesn't provide.
window.matchMedia ??= (query: string) =>
  ({
    matches: false, // mobile layout
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

globalThis.CSS ??= {} as typeof CSS;
CSS.escape ??= (value: string) => value.replace(/["\\]/g, "\\$&");

Element.prototype.scrollIntoView ??= function () {};

afterEach(() => {
  cleanup();
});
