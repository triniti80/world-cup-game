---
name: Elite Tournament Pulse
colors:
  surface: '#081425'
  surface-dim: '#081425'
  surface-bright: '#2f3a4c'
  surface-container-lowest: '#040e1f'
  surface-container-low: '#111c2d'
  surface-container: '#152031'
  surface-container-high: '#1f2a3c'
  surface-container-highest: '#2a3548'
  on-surface: '#d8e3fb'
  on-surface-variant: '#c6c6cd'
  inverse-surface: '#d8e3fb'
  inverse-on-surface: '#263143'
  outline: '#909097'
  outline-variant: '#45464d'
  surface-tint: '#bec6e0'
  primary: '#bec6e0'
  on-primary: '#283044'
  primary-container: '#0f172a'
  on-primary-container: '#798098'
  inverse-primary: '#565e74'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#91db2a'
  on-tertiary: '#1f3700'
  tertiary-container: '#0d1b00'
  on-tertiary-container: '#598f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#acf847'
  tertiary-fixed-dim: '#91db2a'
  on-tertiary-fixed: '#102000'
  on-tertiary-fixed-variant: '#304f00'
  background: '#081425'
  on-background: '#d8e3fb'
  surface-variant: '#2a3548'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  stats-number:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter-xs: 8px
  gutter-md: 16px
  margin-sm: 16px
  margin-lg: 32px
  max-width: 1280px
---

## Brand & Style
This design system captures the electric atmosphere of global football at its highest stakes. The visual language is high-energy, dark-themed, and unapologetically competitive, designed to make users feel like they are entering a high-tech "war room" for sports data and prediction. 

The aesthetic blends **Modern Corporate** precision with **Glassmorphism** and **High-Contrast** accents. It prioritizes data density and rapid decision-making, using glowing highlights and deep background layers to create a sense of three-dimensional depth. The emotional response is one of urgency, prestige, and peak performance, catering to a mobile-first audience that demands both aesthetic polish and functional speed.

## Colors
The palette is built on a foundation of deep, nocturnal tones to provide maximum contrast for critical game data.
- **Backgrounds:** Deep Navy (#0F172A) serves as the base canvas, with Slate (#1E293B) used for elevated surfaces like cards and navigation bars.
- **Accents:** Vibrant Gold (#F59E0B) is reserved for "Winner" states, trophies, and premium achievements. Lime (#84CC16) is the primary action color, used for successful predictions and affirmative UI buttons.
- **Alerts:** Punchy Red (#EF4444) signals expiring deadlines, live match status, and high-priority system alerts.
- **Gradients:** Use subtle linear gradients from Slate to Navy to define card depth, occasionally using a 10% opacity Gold or Lime glow for active states.

## Typography
The typographic hierarchy uses a dual-font approach to balance personality with readability. 
- **Montserrat** handles all high-impact areas: headlines, scoreboards, and navigation. Its bold, geometric structure evokes the power and legacy of sports branding.
- **Inter** provides the functional backbone for body text, data tables, and prediction inputs. Its high x-height ensures legibility on small screens during fast-paced live updates.
- **Key Rules:** Use all-caps for labels and secondary navigation to reinforce the "dashboard" aesthetic. Numbers in scoreboards should always use the `stats-number` style for maximum visual weight.

## Layout & Spacing
The layout follows a **Fluid Grid** model optimized for high-density information.
- **Mobile (Default):** 4-column layout with 16px side margins and 16px gutters. Every pixel is utilized; use 8px spacing for internal card elements.
- **Desktop:** 12-column layout with a maximum content width of 1280px. Gutters expand to 24px to allow for breathable data visualization.
- **Philosophy:** Components should feel tightly packed but organized. Use a strictly 4px baseline grid to ensure vertical rhythm across match lists and leaderboards.

## Elevation & Depth
Depth in this design system is achieved through **Glassmorphism** and **Tonal Layering** rather than traditional soft shadows.
- **Layer 0 (Background):** Deep Navy (#0F172A) flat.
- **Layer 1 (Cards):** Slate (#1E293B) with a subtle 1px inner border at 10% white opacity to define edges.
- **Layer 2 (Overlays/Modals):** A semi-transparent blur (backdrop-filter: blur(12px)) using 80% opacity Slate.
- **Accents:** Use "Glow Borders"—thin 1px strokes of Gold or Lime with a 4px outer neon blur—to highlight the "Match of the Day" or a user's currently selected prediction.

## Shapes
The shape language is modern and architectural. 
- **Corners:** A standard 0.5rem (8px) radius is used for all primary cards and buttons. This provides a balance between professional rigor and a contemporary digital feel.
- **Large Elements:** Sections like the "Hero Scoreboard" or full-screen modals use 1.5rem (24px) top-corner rounding to create a "container" feel on mobile devices.
- **Small Elements:** Tags and score badges utilize a pill-shape (100px radius) to differentiate them from interactive card elements.

## Components
- **Buttons:** Primary buttons use a solid Lime (#84CC16) fill with black text for maximum contrast. Secondary buttons are outlined with a 1px Gold stroke. All buttons should have a subtle 2px vertical "press" animation.
- **Match Cards:** Use a glassmorphic background. Team flags are circular, and the central "VS" or "Time" area uses the `stats-number` type. Active live matches receive a Red (#EF4444) "LIVE" badge with a pulsing animation.
- **Prediction Inputs:** Large, tactile fields with clear - / + steppers for score entry. When a prediction is saved, the card border should transition to a solid Lime glow.
- **Leaderboard Rows:** Alternating tonal backgrounds (Navy and Slate). The user’s own rank is highlighted with a Gold border and increased elevation.
- **Progress Bars:** Thin, high-contrast bars. Completed sections use Lime; upcoming segments use a 20% opacity white.
- **Countdown Timers:** Monospaced numerical styling using Montserrat to prevent layout shift as seconds tick down. Always displayed in the accent Red when under 1 hour.