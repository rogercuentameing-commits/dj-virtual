/**
 * Type augmentation for the jest-dom matchers used by the frontend suite.
 *
 * `vitest.setup.ts` registers the matchers at runtime, but it lives outside the
 * `include: ["src"]` program, so `tsc --noEmit` never loads its types. This
 * declaration file sits inside `src` and pulls in the same augmentation so the
 * matchers (`toBeInTheDocument`, `toHaveTextContent`, ...) are typed for every
 * test file in the project.
 */

import "@testing-library/jest-dom/vitest";
