---
name: Institutional Excellence
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#44464e'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#75777f'
  outline-variant: '#c5c6cf'
  surface-tint: '#4c5e86'
  primary: '#00081e'
  on-primary: '#ffffff'
  primary-container: '#0a1f44'
  on-primary-container: '#7687b2'
  inverse-primary: '#b4c6f4'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#00081d'
  on-tertiary: '#ffffff'
  tertiary-container: '#001f4a'
  on-tertiary-container: '#6b88c1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b4c6f4'
  on-primary-fixed: '#041a3f'
  on-primary-fixed-variant: '#34466d'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#acc7ff'
  on-tertiary-fixed: '#001a41'
  on-tertiary-fixed-variant: '#28467b'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display:
    fontFamily: IBM Plex Sans Thai
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
  h1:
    fontFamily: IBM Plex Sans Thai
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  h2:
    fontFamily: IBM Plex Sans Thai
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  h3:
    fontFamily: IBM Plex Sans Thai
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: IBM Plex Sans Thai
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: IBM Plex Sans Thai
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: IBM Plex Sans Thai
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 64px
  container-max: 1200px
  gutter: 24px
---

## Brand & Style

The design system is engineered to evoke a sense of **Institutional Excellence**. It targets high-net-worth individuals and corporate entities in Thailand, prioritizing clarity, security, and prestige. The brand personality is that of a "Wise Sentinel"—protective, knowledgeable, and technologically ahead of the curve.

The visual style is a refined **Corporate Modern** aesthetic. It utilizes a "Low-Density" layout strategy, where generous whitespace is not merely empty space but a luxury asset that allows complex financial data to breathe. The interface remains rooted in professional tradition through its deep navy palette, while the premium gold accents and soft elevation provide a contemporary, "Private Banking" digital experience.

## Colors

This design system utilizes a palette that balances weight and prestige.

*   **Primary (Deep Navy Blue):** Used for primary navigation, headings, and high-priority interactions. It represents stability and the depths of financial expertise.
*   **Secondary (Premium Gold):** Reserved for "Value Moments"—call-to-action buttons, success indicators, and growth-related data visualizations. It should be used sparingly to maintain its "premium" status.
*   **Background (Light Gray):** The canvas is #F8F9FA, providing a softer, more sophisticated look than pure white, reducing eye strain during long-form report reading.
*   **Semantic Colors:** Success states utilize a muted emerald, while warnings utilize a burnt sienna, both adjusted to sit harmoniously alongside the gold and navy.

## Typography

The design system exclusively employs **IBM Plex Sans Thai**. This typeface bridges the gap between traditional Thai script and modern sans-serif engineering, ensuring perfect legibility for both financial figures and complex Thai text.

Headings should utilize the **SemiBold (600)** weight to project authority. For body text, the **Regular (400)** weight is used with an increased line height (1.6) to improve readability in dense financial disclosures. Letter spacing is kept tight for headings but slightly loosened for smaller labels to maintain clarity on high-resolution screens.

## Layout & Spacing

The design system follows a **Fixed-Fluid Hybrid Grid**. Content is housed within a 1200px centered container for desktop, utilizing a 12-column grid. 

The spacing rhythm is based on an **8px base unit**. 
- **Margins:** External page margins should never drop below 24px (lg).
- **Section Padding:** Vertically, sections are separated by 64px (xxl) to emphasize the "elite" feel of the interface.
- **Component Padding:** Elements like cards and input fields use 16px (md) to 24px (lg) internal padding to ensure a breathable, high-end look.

## Elevation & Depth

To achieve a "Technologically Advanced" look, the design system avoids heavy, dark shadows in favor of **Luminous Elevation**. 

1.  **Level 0 (Flat):** Background surfaces and decorative dividers.
2.  **Level 1 (Soft):** Primary cards and containers. Uses a multi-layered shadow: `0 4px 6px -1px rgba(10, 31, 68, 0.05), 0 2px 4px -1px rgba(10, 31, 68, 0.03)`. The shadow color is tinted with the Primary Navy to keep it integrated.
3.  **Level 2 (Hover/Active):** Interactive elements that are raised. The shadow becomes more diffused: `0 10px 15px -3px rgba(10, 31, 68, 0.08)`.

Subtle 1px borders in a light gray (#E9ECEF) are used alongside shadows to define edges clearly without adding visual noise.

## Shapes

The design system uses a **Rounded** shape language to soften the serious nature of financial data, making the platform feel approachable yet precise.

- **Standard Elements:** Buttons, input fields, and small cards use a **8px (0.5rem)** radius.
- **Large Containers:** Dashboard widgets and main content sections use a **16px (1rem)** radius.
- **Full Rounding:** Progress bars and tags (chips) use pill-shaped rounding for maximum contrast against the structured grid.

## Components

### Buttons
- **Primary:** Deep Navy background with White text. 8px border radius.
- **Secondary:** Premium Gold background with Deep Navy text for high-conversion actions.
- **Tertiary:** Transparent background with Navy border and text.

### Input Fields
- White background with a 1px #E9ECEF border. On focus, the border transitions to Deep Navy with a soft 2px navy-tinted glow.

### Cards
- Always use the Level 1 shadow. Cards include a 4px top-accent border in Premium Gold for "featured" advisory content or "recommended" portfolios.

### Data Visualization
- Charts should use the Primary Navy for base data and Premium Gold for "Current Value" or "Target" metrics. Background grid lines in charts must be ultra-faint (#F1F3F5).

### Trust Indicators
- Use small, gold-tinted icons (24px) for security badges and certification logos, always accompanied by `label-sm` typography.