import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

// ─────────────────────────────────────────────────────────────
// Verita Design Token System
// Source of truth: CSS custom properties shared across all pages
// Token naming mirrors HTML :root variables for 1-to-1 traceability
// ─────────────────────────────────────────────────────────────

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

// ── Palette ──────────────────────────────────────────────────
// Maps CSS var → Chakra semantic token scale
const colors = {
  // Neutral backgrounds
  bg: {
    base:     "#FFFFFF",   // --bg-base      (page background)
    surface:  "#F9F9F9",   // --bg-surface   (card / panel background)
    elevated: "#F0F0F0",   // --bg-elevated  (input / hover fill)
  },

  // Text
  text: {
    primary:   "#0A0A0A",  // --text-primary
    secondary: "#6B6B6B",  // --text-secondary
    tertiary:  "#ABABAB",  // --text-tertiary
  },

  // Borders
  border: {
    subtle:  "#EBEBEB",    // --border-subtle   (dividers, card outlines)
    default: "#D4D4D4",    // --border-default  (input borders, disabled CTAs)
  },

  // Accent (monochrome primary action)
  accent: {
    DEFAULT: "#0A0A0A",    // --accent
    hover:   "#333333",    // --accent-hover
  },

  // Status
  success: {
    DEFAULT: "#16A34A",    // --success
    bg:      "#F0FDF4",    // --success-bg
  },
  warning: {
    DEFAULT: "#CA8A04",    // --warning
    bg:      "#FEFCE8",    // --warning-bg
  },
  danger: {
    DEFAULT: "#DC2626",    // --danger
    bg:      "#FEF2F2",    // --danger-bg
  },
};

// ── Semantic tokens ───────────────────────────────────────────
// Single-token aliases used by components — keep in sync with colors above
const semanticTokens = {
  colors: {
    "page-bg":       { default: colors.bg.base },
    "surface-bg":    { default: colors.bg.surface },
    "elevated-bg":   { default: colors.bg.elevated },
    "fg":            { default: colors.text.primary },
    "muted":         { default: colors.text.secondary },
    "faint":         { default: colors.text.tertiary },
    "border-subtle": { default: colors.border.subtle },
    "border-default":{ default: colors.border.default },
    "brand":         { default: colors.accent.DEFAULT },
    "brand-hover":   { default: colors.accent.hover },
  },
};

// ── Typography ────────────────────────────────────────────────
const fonts = {
  body:    `"Inter", system-ui, -apple-system, sans-serif`,    // --font-sans
  heading: `"Inter", system-ui, -apple-system, sans-serif`,    // display uses same family
  mono:    `"JetBrains Mono", ui-monospace, monospace`,        // --font-mono
  serif:   `"Newsreader", "Iowan Old Style", Georgia, serif`,  // --font-serif (editorial moments)
};

// Matched to 1.25 major-third scale observed in the HTML files
const fontSizes = {
  "2xs": "10px",
  xs:    "11.5px",
  sm:    "12px",
  md:    "13.5px",
  lg:    "15px",
  xl:    "17px",
  "2xl": "20px",
  "3xl": "24px",
  "4xl": "28px",
  "5xl": "36px",
};

const fontWeights = {
  normal:   400,
  medium:   500,
  semibold: 600,
  bold:     700,
};

const lineHeights = {
  none:    1,
  tight:   1.25,
  snug:    1.4,
  normal:  1.55,
  relaxed: 1.7,
};

const letterSpacings = {
  tighter: "-0.03em",
  tight:   "-0.02em",
  normal:  "0em",
  wide:    "0.04em",
  wider:   "0.08em",
};

// ── Spacing ───────────────────────────────────────────────────
// Base-4 scale matching the HTML layouts
const space = {
  px:   "1px",
  0.5:  "2px",
  1:    "4px",
  1.5:  "6px",
  2:    "8px",
  2.5:  "10px",
  3:    "12px",
  3.5:  "14px",
  4:    "16px",
  5:    "18px",
  6:    "22px",
  7:    "26px",
  8:    "28px",
  9:    "32px",
  10:   "40px",
  12:   "48px",
  14:   "56px",
  16:   "64px",
  20:   "80px",
};

// ── Radii ─────────────────────────────────────────────────────
// --radius-card: 10px  --radius-btn: 8px
const radii = {
  none:  "0",
  sm:    "4px",
  md:    "7px",
  lg:    "8px",     // --radius-btn
  xl:    "10px",    // --radius-card
  "2xl": "14px",    // modal
  full:  "9999px",
};

// ── Shadows ───────────────────────────────────────────────────
// Verita uses almost no shadows — only modals and dropdowns
const shadows = {
  none: "none",
  sm:   "0 1px 2px rgba(0,0,0,0.06)",
  md:   "0 2px 12px rgba(0,0,0,0.08)",
  lg:   "0 4px 40px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
  modal:"0 24px 60px -12px rgba(0,0,0,0.32), 0 4px 12px -4px rgba(0,0,0,0.12)",
};

// ── Sizes ─────────────────────────────────────────────────────
// Named layout constants matching --sidebar-w and --topbar-h
const sizes = {
  sidebar: "220px",   // --sidebar-w
  topbar:  "56px",    // --topbar-h
  "min-tap": "44px",  // minimum touch target
};

// ── Borders ───────────────────────────────────────────────────
const borders = {
  subtle:  `1px solid ${colors.border.subtle}`,
  default: `1px solid ${colors.border.default}`,
  accent:  `1px solid ${colors.accent.DEFAULT}`,
  danger:  `1px solid ${colors.danger.DEFAULT}`,
};

// ── Component overrides ───────────────────────────────────────
const components = {
  Button: {
    baseStyle: {
      fontWeight: "semibold",
      borderRadius: "lg",  // --radius-btn = 8px
      _focusVisible: {
        boxShadow: `0 0 0 3px rgba(10,10,10,0.12)`,
      },
    },
    variants: {
      solid: {
        bg:    "accent.DEFAULT",
        color: "white",
        _hover: { bg: "accent.hover" },
        _disabled: { bg: "border.default", cursor: "not-allowed", opacity: 1 },
      },
      ghost: {
        color: "text.secondary",
        _hover: { bg: "bg.elevated", color: "text.primary" },
      },
      outline: {
        border: "1px solid",
        borderColor: "border.default",
        color: "text.primary",
        _hover: { bg: "bg.elevated" },
      },
    },
    defaultProps: { variant: "solid" },
  },

  Input: {
    variants: {
      filled: {
        field: {
          bg:           "bg.elevated",
          border:       "1px solid",
          borderColor:  "border.subtle",
          borderRadius: "lg",
          height:       "44px",
          fontSize:     "md",
          _placeholder: { color: "text.tertiary" },
          _focus: { borderColor: "text.primary", boxShadow: "0 0 0 4px rgba(10,10,10,0.06)" },
          _invalid: { borderColor: "danger.DEFAULT" },
        },
      },
    },
    defaultProps: { variant: "filled" },
  },

  Textarea: {
    variants: {
      filled: {
        bg:           "bg.elevated",
        border:       "1px solid",
        borderColor:  "border.subtle",
        borderRadius: "lg",
        fontSize:     "md",
        _placeholder: { color: "text.tertiary" },
        _focus: { borderColor: "text.primary", boxShadow: "0 0 0 4px rgba(10,10,10,0.06)" },
      },
    },
    defaultProps: { variant: "filled" },
  },

  Card: {
    baseStyle: {
      container: {
        bg:           "bg.surface",
        border:       "1px solid",
        borderColor:  "border.subtle",
        borderRadius: "xl",   // --radius-card = 10px
        boxShadow:    "none",
      },
    },
  },

  Badge: {
    variants: {
      success: { bg: "success.bg",  color: "success.DEFAULT", fontWeight: "medium" },
      warning: { bg: "warning.bg",  color: "warning.DEFAULT", fontWeight: "medium" },
      danger:  { bg: "danger.bg",   color: "danger.DEFAULT",  fontWeight: "medium" },
      subtle:  { bg: "bg.elevated", color: "text.secondary",  fontWeight: "medium" },
    },
  },

  Divider: {
    baseStyle: {
      borderColor: "border.subtle",
    },
  },

  Heading: {
    baseStyle: {
      fontFamily:    "body",
      fontWeight:    "semibold",
      letterSpacing: "tight",
      color:         "text.primary",
    },
  },

  Text: {
    baseStyle: {
      color: "text.primary",
    },
  },

  // Modal follows the Auth.html pattern
  Modal: {
    baseStyle: {
      dialog: {
        borderRadius: "2xl",
        boxShadow:    "modal",
        bg:           "white",
      },
      overlay: {
        bg: "rgba(10,10,10,0.36)",
        backdropFilter: "blur(2px)",
      },
    },
  },
};

// ── Global styles ─────────────────────────────────────────────
const styles = {
  global: {
    "html, body": {
      bg:         "bg.base",
      color:      "text.primary",
      fontFamily: "body",
      WebkitFontSmoothing: "antialiased",
    },
    "*": { boxSizing: "border-box" },
    "::placeholder": { color: "text.tertiary" },
  },
};

// ── Assembled theme ───────────────────────────────────────────
const theme = extendTheme({
  config,
  colors,
  semanticTokens,
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  space,
  radii,
  shadows,
  sizes,
  borders,
  components,
  styles,
});

export default theme;
export { colors, fonts, radii, shadows };
