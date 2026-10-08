import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * PrimeNG Aura preset in the quotation template's palette (same pattern as superadmin's
 * ManttioPreset). `primary` is the slate family (#48565A sits at 600); `surface` is a cool
 * neutral leaning toward the template's mist/ice. Literal values: there is no runtime
 * branding in quotman.
 */
const scale = (hue: number, saturation: number, lightness: Record<number, number>) =>
  Object.fromEntries(Object.entries(lightness).map(([step, l]) => [step, `hsl(${hue} ${saturation}% ${l}%)`]));

const primary = scale(194, 11, {
  50: 96, 100: 92, 200: 84, 300: 72, 400: 56, 500: 42, 600: 32, 700: 26, 800: 20, 900: 13, 950: 8,
});

const surface = {
  0: '#ffffff',
  ...scale(190, 8, { 50: 97, 100: 94, 200: 88, 300: 80, 400: 66, 500: 52, 600: 41, 700: 31, 800: 21, 900: 12, 950: 7 }),
};

export const QuotmanPreset = definePreset(Aura, {
  semantic: {
    primary,
    colorScheme: {
      light: {
        surface,
        primary: {
          color: '{primary.600}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.800}',
        },
      },
      dark: {
        surface,
        primary: {
          color: '{primary.200}',
          contrastColor: '{surface.950}',
          hoverColor: '{primary.100}',
          activeColor: '{primary.50}',
        },
      },
    },
  },
});
