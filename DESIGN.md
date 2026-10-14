# Design Brief

## Direction

MIXLAB — a dark, mobile-first virtual DJ controller where two decks live side by side as a piece of tactile hardware: Deck A electric blue, Deck B signal orange, on a near-black chassis.

## Tone

Industrial/utilitarian — a real club mixer rendered as UI: matte black panels, machined control surfaces, and high-contrast uppercase labels, executed with conviction rather than decoration.

## Differentiation

The two decks are color-coded instruments, not tabs — every pad, fader, waveform and glow inherits its deck's accent, so you always know which side of the rig your hands are on.

## Color Palette

| Token           | OKLCH         | Role                                   |
| --------------- | ------------- | -------------------------------------- |
| background      | 0.13 0.006 265 | App chassis, near-black                |
| foreground      | 0.96 0.004 265 | Primary text                           |
| panel           | 0.185 0.01 265 | Hardware panel surface                 |
| control         | 0.26 0.012 265 | Raised pad / knob / button surface     |
| muted-foreground| 0.6 0.012 265  | Secondary labels, inactive states      |
| deck-a          | 0.66 0.19 245  | Deck A accent (electric blue)          |
| deck-b          | 0.7 0.19 52    | Deck B accent (signal orange)          |
| destructive     | 0.6 0.24 22    | REC / record red                       |
| success         | 0.72 0.17 150  | Sync locked / success                  |
| border          | 0.28 0.012 265 | Panel seams and control outlines       |

## Typography

- Display: Space Grotesk — deck headers, BPM/time readouts, section titles
- Body: DM Sans — track names, library rows, helper text
- Mono: Geist Mono — numeric counters (BPM, time, pitch %) for tabular alignment
- Scale: hero `text-2xl font-bold tracking-tight`, h2 `text-lg font-semibold tracking-tight`, label `label-hardware` (10px uppercase tracking-[0.14em]), body `text-sm`

## Elevation & Depth

Depth comes from layered near-black surfaces plus inset/raised shadows, never from bright fills: chassis → panel → raised control → pressed pad, with accent glow reserved for active states only.

## Structural Zones

| Zone            | Background            | Border            | Notes                                      |
| --------------- | --------------------- | ----------------- | ------------------------------------------ |
| Top bar         | `bg-card`             | `border-b`        | App name, library toggle, REC indicator    |
| Deck columns    | `surface-panel`       | `border`          | Deck A blue rail, Deck B orange rail       |
| Mixer center    | `bg-panel`            | `border-x`        | Neutral chassis between the two decks      |
| Pads / FX row   | `bg-control`          | `border`          | Raised surfaces, deck-tinted when active   |
| Library sheet   | `bg-popover`          | `border-t`        | Slide-up track list, search bar            |

## Spacing & Rhythm

Mobile-first tight rhythm: 8px base unit, 12px gaps between control clusters, 16px between zones; deck columns sit on a 2-column grid that becomes side-by-side with the mixer pinned between them.

## Component Patterns

- Buttons: 4px radius, flat `bg-control`, uppercase `label-hardware`; active state swaps to deck accent fill with `glow-deck-*`.
- Pads: square, 4px radius, `shadow-inset-control`; pressed uses `shadow-pad-press` + deck accent flash.
- Knobs: circular, gradient-filled, thin accent indicator line; track and value arc in `muted-foreground`.
- Faders: recessed dark track with a bright raised cap; crossfader spans the mixer footer.
- Badges: pill, `text-[10px] uppercase`, accent-dim background for inactive, full accent for active.

## Motion

- Entrance: `animate-fade-in` (0.25s) on zone mount, staggered by deck.
- Hover/press: `transition-snap` (0.12s) scale + shadow change for tactile feedback.
- Decorative: `pulse-rec` on the REC dot, `vu-bounce` on the master meter, `wave-scroll` on idle waveform.

## Constraints

- Dark-only theme; no light mode — the club is dark.
- Touch targets ≥ 44px; no accidental scroll during mixing (`overscroll-behavior: none`).
- Spanish-language UI copy; uppercase labels always.
- Accent glow used sparingly — active states only, never as ambient decoration.
- All colors via semantic tokens; no raw hex or arbitrary Tailwind colors.

## Signature Detail

Dual accent rails: each deck's edge, jog wheel ring, waveform and active controls glow in its own accent, making the two-deck split readable at a glance on a phone in one hand.
