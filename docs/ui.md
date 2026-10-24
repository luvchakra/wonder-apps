# UI rules: screenshots, device frames, navigation, theme

Read this before changing a screenshot, device frame, the way back to `/`, or colours. The
short rules are in the Pages and components section of `CLAUDE.md`.

## Screenshots (`public/screenshots/<slug>/`)

- One phone capture per startup (`home-mobile`); the rest are desktop (desktop 1800w, mobile 780w).
- `DevicePair` shows devices side by side. Never overlap them or stack them with parallax, so no
  screenshot or page text is covered.
- Use `next/image` with `object-cover object-top` inside a fixed-aspect frame. Any capture size works, so don't hand-crop.
- WonderID's captures are public pages only (landing, sign-in). Never create an account on a
  product's production to capture signed-in screens.

## Phone frame

- `.device-phone` (`src/app/globals.css`) draws an iPhone: titanium rim, Dynamic Island, side
  buttons, status strip and home indicator, all sized in `cqw` so it scales with the frame.
- The capture sits below the status strip, so the island never covers a site header.
- `src/components/DeckSlides.tsx` has the same frame in inline styles, for the 1920x1080 slides.

## Way back to the main page

- `BackToMain` sits in the nav bar and above the footer. It is hidden on `/`. It returns to `/`
  at the scroll position the reader left.
- `ScrollMemory` (in the layout) stores the main page's `scrollY` and restores it after the
  Back button or the browser's back.
- External links open in a new tab.

## Theme and motion

- Dark bands use `.theme-dark`, light bands `.theme-light`.
- Colours are CSS variables. Don't hardcode colours in components, except each product's accent
  (`startups[n].accent`).
- Animations respect `prefers-reduced-motion`: `MotionConfig` does this, and the CSS keyframes
  are disabled in the media query in `globals.css`.
