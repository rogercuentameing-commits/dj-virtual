# Project Guidance

## User Preferences

- Replicate the reference DJ controller layout: two decks, central mixer, sample pads, FX and REC
- Deck A uses blue accents, Deck B uses orange accents
- Dark high-contrast theme with uppercase sans-serif labels
- Mobile-first, installable app experience
- Spanish-language user interface

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- Only CORS-enabled audio URLs (HTTP 206 with access-control-allow-origin) work with Web Audio decodeAudioData; Pixabay CDN hashes are specific, so verify each URL before committing it.
- A component can be fully implemented and exported yet never mounted; verify the shell actually renders it, since a clean build does not catch placeholder shells.
- Biome useSemanticElements rejects role='group'/'status' on divs; use <fieldset> and <output>.
- Motoko has no triple-quoted strings; author multi-line text with \n escapes or per-line concatenation.
- Enhanced Migration check-limit=1 allows only one pending migration file; fold init into the latest pending file.
- Nested Map<Principal, Map<Nat, T>> must be flattened with Iter.flatten over Map.values().map(...) and registered via OQL.Entity.new<T>.
- Time.now() returns Int; convert with .toNat() when the target field is Nat.
- Two mixins included into the same actor cannot share a private helper name.
- Vitest + jest-dom matchers need a type augmentation file inside the tsc include scope (e.g. src/__tests__/jest-dom.d.ts importing '@testing-library/jest-dom/vitest').
