/**
 * App shell render tests.
 *
 * Mounts the full cabin (top bar, both decks, mixer, pads) with the audio
 * engine and the platform auth/actor hooks mocked, and asserts the acceptance
 * criterion that the app loads without a blank screen and shows the complete
 * cabin with Deck A and Deck B. This is component/integration coverage, not a
 * deployed browser run.
 */

import App from "@/App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const engineMock = vi.hoisted(() => ({
  ensureContext: vi.fn(async () => {}),
  loadBuffer: vi.fn(async () => null),
  setDeckBuffer: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  getPosition: vi.fn(() => 0),
  setRate: vi.fn(),
  setScratch: vi.fn(),
  setChannelGain: vi.fn(),
  setInputGain: vi.fn(),
  setEq: vi.fn(),
  setFilter: vi.fn(),
  setCrossfader: vi.fn(),
  setMasterVolume: vi.fn(),
  setFx: vi.fn(),
  playSample: vi.fn(),
  getLevel: vi.fn(() => 0),
  getStream: vi.fn(() => null),
  dispose: vi.fn(),
}));

vi.mock("@/audio/engine", () => ({ audioEngine: engineMock }));

// The platform hooks would otherwise reach for Internet Identity and the
// canister. The cabin shell only needs them to resolve to a stable shape.
vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: null, isFetching: false }),
  useInternetIdentity: () => ({
    isAuthenticated: false,
    login: vi.fn(),
    clear: vi.fn(),
    loginStatus: "idle",
    isInitializing: false,
    isLoginIdle: true,
    isLoggingIn: false,
    isLoginSuccess: false,
    isLoginError: false,
    isSessionExpired: false,
  }),
  InternetIdentityProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/** Render the cabin inside the query provider the library panel requires. */
function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe("App", () => {
  it("renders the full cabin without a blank screen", () => {
    renderApp();

    // Top bar chrome.
    expect(
      screen.getByRole("heading", { name: /cabina doble/i }),
    ).toBeInTheDocument();

    // Both decks are present with their accents.
    expect(screen.getByLabelText("Deck A")).toBeInTheDocument();
    expect(screen.getByLabelText("Deck B")).toBeInTheDocument();

    // Mixer and pads.
    expect(screen.getByLabelText("Mezclador")).toBeInTheDocument();
    expect(screen.getByLabelText("Pads de performance")).toBeInTheDocument();
  });

  it("shows the LOAD A SONG and LOAD B SONG controls", () => {
    renderApp();

    expect(screen.getByText("LOAD A SONG")).toBeInTheDocument();
    expect(screen.getByText("LOAD B SONG")).toBeInTheDocument();
  });

  it("shows the transport and mode controls for each deck", () => {
    renderApp();

    const deckA = screen.getByLabelText("Deck A");
    expect(within(deckA).getByText("PLAY")).toBeInTheDocument();
    expect(within(deckA).getByText("SYNC")).toBeInTheDocument();
    expect(within(deckA).getByText("SLIP")).toBeInTheDocument();
    expect(within(deckA).getByText("QNTZ")).toBeInTheDocument();

    const deckB = screen.getByLabelText("Deck B");
    expect(within(deckB).getByText("PLAY")).toBeInTheDocument();
    expect(within(deckB).getByText("SYNC")).toBeInTheDocument();
  });

  it("shows the crossfader and the master VU meter", () => {
    renderApp();

    expect(screen.getByText("CROSSFADER")).toBeInTheDocument();
    expect(
      screen.getAllByRole("meter", { name: /nivel master/i }).length,
    ).toBeGreaterThan(0);
  });
});
