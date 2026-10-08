import { LucideBuilding2, LucideFileText, LucidePackage, LucidePalette, LucideUsers, type LucideIcon } from '@lucide/angular';

export interface NavItem {
  label: string;
  route: string;
  icon: LucideIcon;
}

/** Sidebar entries, in order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Cotizaciones', route: '/quotations', icon: LucideFileText },
  { label: 'Clientes', route: '/clients', icon: LucideUsers },
  { label: 'Servicios', route: '/services', icon: LucidePackage },
  { label: 'Perfil del emisor', route: '/profile', icon: LucideBuilding2 },
  { label: 'Marca', route: '/branding', icon: LucidePalette },
];
