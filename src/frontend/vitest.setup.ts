/**
 * Vitest setup for the DJ cabin frontend suite.
 *
 * Registers jest-dom matchers and configures the `data-ocid` attribute as the
 * test-id selector, since the generated components expose deterministic
 * `data-ocid` markers rather than semantic test ids.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

configure({ testIdAttribute: "data-ocid" });

// jsdom does not implement canvas rendering. The Waveform component draws to a
// 2D context, so stub `getContext` with a no-op surface rather than pulling in
// the native `canvas` package. The tests assert DOM structure, not pixels.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () =>
      ({
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        getPropertyValue: vi.fn(() => ""),
        fillStyle: "",
        globalAlpha: 1,
      }) as unknown as CanvasRenderingContext2D,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

afterEach(() => {
  cleanup();
});
