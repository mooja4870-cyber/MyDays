---
name: Fresh & Vibrant Publishing
colors:
  surface: '#f2fbf7'
  surface-dim: '#d3dcd8'
  surface-bright: '#f2fbf7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ecf6f1'
  surface-container: '#e7f0ec'
  surface-container-high: '#e1eae6'
  surface-container-highest: '#dbe5e0'
  on-surface: '#151d1b'
  on-surface-variant: '#3a4a46'
  inverse-surface: '#2a3230'
  inverse-on-surface: '#eaf3ef'
  outline: '#6a7b76'
  outline-variant: '#b9cac4'
  surface-tint: '#006b5b'
  primary: '#006b5b'
  on-primary: '#ffffff'
  primary-container: '#00f5d4'
  on-primary-container: '#006c5c'
  inverse-primary: '#00dfc1'
  secondary: '#685a67'
  on-secondary: '#ffffff'
  secondary-container: '#eddaea'
  on-secondary-container: '#6d5e6b'
  tertiary: '#b32057'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffced7'
  on-tertiary-container: '#b42158'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#26fedc'
  primary-fixed-dim: '#00dfc1'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#005144'
  secondary-fixed: '#f0dded'
  secondary-fixed-dim: '#d4c1d0'
  on-secondary-fixed: '#231823'
  on-secondary-fixed-variant: '#50434f'
  tertiary-fixed: '#ffd9e0'
  tertiary-fixed-dim: '#ffb1c2'
  on-tertiary-fixed: '#3f0018'
  on-tertiary-fixed-variant: '#8f0040'
  background: '#f2fbf7'
  on-background: '#151d1b'
  surface-variant: '#dbe5e0'
typography:
  headline-xl:
    fontFamily: Outfit
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 120px
---

## Brand & Style

The design system is engineered for a digital-native audience that values self-expression and visual storytelling. The brand personality is **energetic, optimistic, and effortlessly modern**, bridging the gap between a high-utility tool and a creative playground. It targets a demographic that finds beauty in the "everyday" and needs a frictionless way to share it.

The visual style is a sophisticated blend of **Minimalism** and **Playful Modernism**. It utilizes expansive white space to let user-generated photography breathe, while punctuating the experience with high-chroma mint and soft pink accents. The interface feels "airy" yet intentional, avoiding clutter in favor of a focused, card-based hierarchy that prioritizes content visibility and ease of navigation.

## Colors

The palette leverages a high-contrast relationship between vibrant "Mint" and "Deep Coral" to drive action, balanced by a "Soft Pink" that acts as a calming secondary surface color. 

- **Primary (Vibrant Mint):** Reserved for primary actions, success states, and key brand touchpoints. It provides the "fresh" energy of the system.
- **Secondary (Soft Pink):** Used for large surface areas, secondary containers, and subtle backgrounds. It softens the interface and adds a youthful warmth.
- **Accent (Deep Coral):** Utilized for high-visibility alerts, interactive highlights, and secondary call-to-actions.
- **Neutral / Background:** A clean, slightly cool light grey (#F8F9FA) is used for the main canvas to prevent eye fatigue, while deep ink (#1A1A1A) ensures all typography meets high accessibility and readability standards.

## Typography

This design system utilizes **Outfit** for its geometric clarity and modern terminal cuts, which harmonize with the rounded UI elements. 

To ensure maximum readability, the system employs a generous type scale with heavy weights for headlines. This creates a clear vertical rhythm, allowing users to scan blog drafts and settings effortlessly. Tracking (letter spacing) is slightly tightened on larger headlines to maintain a cohesive, "editorial" look, while body text remains open and airy for comfortable long-form reading.

## Layout & Spacing

The design system follows a **Spacious Card-based UI** built on an 8px grid system. 

- **Grid Model:** A 12-column fluid grid for desktop and a 4-column fluid grid for mobile.
- **Card Philosophy:** Content is encapsulated in elevated white cards with a standard padding of `md` (24px). This creates a clear separation between the "canvas" and the "content."
- **Visual Breathability:** The system mandates a minimum `lg` (40px) vertical gap between major sections to prevent the UI from feeling cramped.
- **Reflow:** On mobile devices, cards expand to fill the screen width minus the `margin-mobile` (20px), while gutters tighten to `gutter` (16px) to maximize screen real estate for photo previews.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layering**. 

Unlike harsh, traditional drop shadows, this design system uses extra-diffused shadows with a very low opacity (8-12%). Shadows are slightly tinted with the primary Mint or secondary Pink when an element is active, creating a "glow" effect that reinforces the playful aesthetic.

- **Level 0 (Background):** The neutral light grey canvas.
- **Level 1 (Cards):** Pure white surfaces with a soft, 16px blur radius shadow.
- **Level 2 (Interactive):** Elements like buttons or active cards use a slightly deeper shadow (24px blur) and a subtle 1px border in a lighter shade of the primary color to "pop" from the background.

## Shapes

The shape language is consistently **Rounded**, reflecting the approachable and friendly nature of the brand.

- **Standard Elements:** Buttons, input fields, and small cards utilize a `0.5rem` (8px) radius.
- **Large Containers:** Content cards and modal overlays use `rounded-lg` (1rem / 16px) to create a soft, modern frame for photographs.
- **Interactive Pills:** Tags, chips, and status indicators use a full pill-shape (circular ends) to distinguish them from structural elements and suggest "tappability."

## Components

### Buttons
Primary buttons use a solid **Vibrant Mint** background with high-contrast dark text. They feature a subtle hover state where the shadow depth increases. Secondary buttons utilize the **Soft Pink** with **Deep Coral** text for a distinct but less aggressive hierarchy.

### Cards
Cards are the primary content vehicle. They must always have a pure white background. For photo blog entries, the image should have a top-only border radius that matches the card, ensuring a seamless "integrated" look.

### Input Fields
Fields use a subtle #FFFFFF background with a 1px border in a very light grey. Upon focus, the border transitions to **Vibrant Mint** with a soft outer glow. Labels are always positioned above the field in `label-bold` for clarity.

### Chips & Tags
Used for category tagging (e.g., "Travel," "Food"). These are pill-shaped with a **Soft Pink** background and **Deep Coral** text.

### Progress Indicators
For "publishing" states, a thick, rounded progress bar in **Vibrant Mint** should be used, set against a **Soft Pink** track to maintain the brand's core color story.