---
name: Rosé Minimalist
colors:
  surface: '#fff8f8'
  surface-dim: '#e0d8d9'
  surface-bright: '#fff8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf1f2'
  surface-container: '#f5eced'
  surface-container-high: '#efe6e7'
  surface-container-highest: '#e9e0e1'
  on-surface: '#1e1b1c'
  on-surface-variant: '#524345'
  inverse-surface: '#342f30'
  inverse-on-surface: '#f7eff0'
  outline: '#857375'
  outline-variant: '#d7c1c4'
  surface-tint: '#8d4a59'
  primary: '#8d4a59'
  on-primary: '#ffffff'
  primary-container: '#f8a4b4'
  on-primary-container: '#763745'
  inverse-primary: '#ffb1c0'
  secondary: '#a23a4f'
  on-secondary: '#ffffff'
  secondary-container: '#ff8296'
  on-secondary-container: '#761830'
  tertiary: '#685b5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#c7b7ba'
  on-tertiary-container: '#54484a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9df'
  primary-fixed-dim: '#ffb1c0'
  on-primary-fixed: '#3a0717'
  on-primary-fixed-variant: '#713341'
  secondary-fixed: '#ffd9dd'
  secondary-fixed-dim: '#ffb2bb'
  on-secondary-fixed: '#400012'
  on-secondary-fixed-variant: '#832238'
  tertiary-fixed: '#f0dee1'
  tertiary-fixed-dim: '#d3c2c5'
  on-tertiary-fixed: '#22191b'
  on-tertiary-fixed-variant: '#4f4446'
  background: '#fff8f8'
  on-background: '#1e1b1c'
  surface-variant: '#e9e0e1'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding-mobile: 20px
  container-padding-desktop: 40px
  gutter: 16px
  section-gap: 48px
---

## Brand & Style

This design system is built for a demographic that values aesthetic serenity and emotional connection. The brand personality is **gentle, nostalgic, and sophisticated**. It aims to transform the act of digital journaling into a tactile, soothing experience through the use of "Soft Minimalism"—combining the cleanliness of modern SaaS with the warmth of a lifestyle boutique.

The visual direction leans into high-quality whitespace to ensure that user-generated photography remains the focal point. We employ subtle depth through soft blurs and layered pastels, avoiding the coldness of traditional flat design. The goal is to evoke a sense of "calm joy" every time a user records a memory.

## Colors

The palette is anchored by **Rosé Pink**, a soft, desaturated primary tone that feels trendy yet timeless. 

- **Primary (#F8A4B4):** Used for key actions, active states, and brand moments.
- **Secondary (#A63D52):** A deeper berry tone reserved for high-contrast text or primary buttons to ensure accessibility and "pop" against light backgrounds.
- **Tertiary (#FFEDF0):** A "Mist Pink" used for large surface areas and background containers to soften the interface compared to pure white.
- **Neutral (#4F4A4B):** A warm charcoal for typography, providing better legibility and a softer look than pure black.

Subtle linear gradients (Top-Left to Bottom-Right) should be used on primary surfaces, transitioning from `#F8A4B4` to a slightly warmer `#FFC1CC`.

## Typography

We use **Plus Jakarta Sans** for its contemporary, geometric, and friendly proportions. It balances professional clarity with a youthful energy that perfectly suits a 20-30s audience.

- **Headlines:** Use Bold weights with tight letter-spacing to create a "contained" and modern editorial feel.
- **Body:** Use Regular weights with generous line heights to ensure the journal entries are easy to read and feel unhurried.
- **Labels:** Use Semi-Bold weights with increased letter-spacing and uppercase styling for functional elements like dates or categories to differentiate them from narrative content.

## Layout & Spacing

The layout follows a **fluid-to-fixed model**. On mobile, content uses a 4-column grid with generous 20px side margins. On desktop, content is centered within a maximum width of 1100px to maintain the "journal" intimacy, using a 12-column grid.

We utilize an **8px linear scale** for all padding and margins. Vertical rhythm is critical; we prioritize large gaps (section-gap) between distinct days in the journal to give each photo room to "breathe." Negative space is not just a vacuum—it is a design element that reinforces the minimal aesthetic.

## Elevation & Depth

To maintain a soft, trendy feel, this design system avoids harsh shadows.

- **Surface Layering:** We use "Tonal Layers" where the base background is `Tertiary` and foreground cards are pure `White`.
- **Shadows:** Use "Ambient Glows" rather than directional shadows. These are very large (30px-50px blur), low opacity (10%), and tinted with the primary pink color `rgba(248, 164, 180, 0.15)`.
- **Glassmorphism:** For navigation bars and floating buttons, use a backdrop blur of 20px with a 70% opaque white fill to create a premium, "frosted" effect.

## Shapes

The shape language is defined by **extreme softness**. Following the "Round Sixteen" philosophy, our standard container corner radius is 16px. 

- **Cards & Primary Containers:** 16px (`rounded-lg`).
- **Input Fields & Buttons:** 12px or fully pill-shaped (for CTA buttons).
- **Images:** Should always mirror the container's 16px radius to maintain visual harmony.
- **Small Elements (Chips/Badges):** Use a pill shape (50px+) to distinguish them from actionable buttons.

## Components

- **Buttons:** Primary buttons use the Secondary Berry color with white text for maximum legibility. Secondary buttons use a Primary Pink outline or a soft pink tint background. All buttons should have a subtle hover lift effect (moving -2px on the Y-axis).
- **Cards:** White backgrounds with the "Ambient Glow" shadow. These should be padding-heavy (at least 24px) to ensure the photo and text within feel like a curated gallery piece.
- **Input Fields:** Soft grey-pink borders (2px) that transition to a solid Primary Pink border when focused. Label text sits just above the field in `label-md` style.
- **Chips:** Used for "Mood" or "Location" tags. These should have no border, a `Tertiary` pink background, and `Secondary` berry text.
- **Photo Grid:** A masonry-style layout is preferred for the journal view, allowing portrait and landscape photos to sit naturally together with uniform 16px gutters.
- **Navigation:** A bottom-docked floating bar with a heavy backdrop blur and icons in the Secondary color.