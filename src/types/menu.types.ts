
import type { LucideIcon } from "lucide-react";

export interface MenuItem {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  children?: MenuItem[];
  disabled?: boolean;
  /** Marks the current page / selected item (rendered with aria-current). */
  active?: boolean;
  onSelect?: () => void;
}

// Represents one level of menu navigation
export interface MenuLevel {
  id: string;
  title: string;
  items: MenuItem[];
}

// Animation direction
export type NavigationDirection = "forward" | "backward";

// Navigation history state
export interface NavigationState {
  history: MenuLevel[];
  direction: NavigationDirection;
}

// Drawer component props
export interface NestedMenuDrawerProps {
  /** Whether the drawer is open (controlled). */
  open: boolean;
  /**
   * Called when the drawer asks to change `open`: with `false` when the user
   * closes it (close button, Escape, backdrop, drag-down, or selecting a leaf
   * item). Opening is up to you, e.g. from your own trigger button.
   */
  onOpenChange: (open: boolean) => void;
  menuItems: MenuItem[];
  /** Accessible name of the root level (also used in "Back to …"). */
  title?: string;
  /** Called when a leaf item is chosen, just before the drawer closes. */
  onSelect?: (item: MenuItem) => void;
  /** id of the dialog element, for your trigger's `aria-controls`. */
  id?: string;
}
