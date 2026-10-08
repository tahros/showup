# Showing Up Club profile

Settings opens with the approved ShowUppp mark, a blue 2.5D avatar, the existing
display name, a cosmetic member number, join month, and distinct logged days.
Existing controls are grouped, not recreated: Profile, Appearance, Training,
Connections (when available), and Account & data. No workout writer changed.

## Identity and persistence

- `settings.clubAvatar`: one of the nine allowlisted icon keys, synced and backed
  up through the existing per-key settings clocks. Invalid keys safely fall back.
- Accounts derive their default icon and display number from the auth user ID.
  The 10-digit number is a stable cosmetic fingerprint, NOT a sequential member
  count, globally unique key, authentication credential, or entitlement.
- Signed-out profiles get `settings.clubGuest = {id, since}` once storage has
  loaded. A cryptographic random ID stays stable on later visits. The card says
  Guest no. and Club since. Demo rendering does not initialize persistent data.
- Account Member since uses auth `created_at` only. Missing/invalid dates display
  an em dash. Imported workout dates are never presented as a join date.
- Days trained uses the established `loggedDays()` definition: distinct dates
  with workout rows, including imports; no duplicate count for multiple sets or
  sessions on a date. Rest/empty dates do not count. It links to History.

## Artwork and motion

The approved three-icon preview is retained in `assets/club-icons-0.webp`.
The remaining two transparent three-cell atlases are `club-icons-1.webp` and
`club-icons-2.webp`. All are 1200x400; each 400px cell serves profile/picker sizes.
Generated using the built-in image tool, then resized/encoded as WebP. Originals
remain non-destructively in the generating chat's generated-images directory.

Prompt direction: preserve approved rounded 2.5D shapes and white oval eyes and
smile; base Pip midtone #374EDE, highlights #586BEE, shadows #293CB3; three equal
square cells, no text, no floor or cast shadow, true transparent background.
Two new strips: resistance band / weight plate / foam roller, and gym bag /
rolled mat / headphones. Six-object attempts with alpha haze were discarded.
The two new strips have a small CSS hue/saturation correction toward Pip.

Each selected icon has a 5.8-second motion-plus-rest cycle. The other eight
picker icons stay still. Offscreen/hidden-page motion pauses. OS reduced-motion
and Settings Mascot Still/Off disable icon animation without removing identity.
The ball hops, bell sways, bottle tips, band stretches, plate rocks, roller
rolls, bag compresses, mat rocks, and headphones pulse. No sound/haptics.

## Checks

- `node tools/test-club-profile.js .`: stable identity, sync, date provenance,
  invalid selection, nine-icon allowlist, unchanged profile and workout data.
- `PW_PORT=8806 node tools/check-club-profile.cjs`: real browser, 320/393/736px,
  light/dark, picker, profile save, history navigation, reduced motion, Still,
  no missing atlas requests, no overflow or browser errors.
- Existing logger check now opens the Training settings disclosure first.
