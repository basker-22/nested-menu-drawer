# Nested Menu Drawer

An accessible, animated, multi-level menu built with React, TypeScript, Tailwind CSS and Motion.

- **Mobile** (< 640px): a bottom sheet that slides up and can be dragged down to close.
- **Tablet / desktop** (≥ 640px): a centered dialog that rises and fades in.
- Unlimited nesting with a **Back** button, directional slide transitions and a height that animates to fit each level.
- Keyboard, screen-reader and reduced-motion support out of the box.

---

## Contents

- [Getting started](#getting-started)
- [Usage](#usage)
- [Props](#props)
- [Menu data](#menu-data)
- [Interaction](#interaction)
- [Accessibility](#accessibility)
- [Customization](#customization)
- [Project structure](#project-structure)
- [Known limitations](#known-limitations)

---

## Getting started

**Requirements:** Node.js 20.19+ or 22.12+ (required by Vite 8).

```bash
npm install
npm run dev       # start the dev server (http://localhost:5173)
```

| Script            | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start Vite with hot reload                    |
| `npm run build`   | Type-check (`tsc -b`) and build into `dist/`  |
| `npm run preview` | Serve the production build locally            |
| `npm run lint`    | Run ESLint                                    |
| `npm test`        | Run the test suite once (Vitest + jsdom)      |
| `npm run test:watch` | Run tests in watch mode                    |

Tests sit next to the code they cover (`*.test.ts(x)`):

| File | Covers |
| ---- | ------ |
| `src/components/NestedMenuDrawer.test.tsx` | Navigation, focus management, keyboard, the close button, controlled `open` / `onOpenChange` |
| `src/hooks/useMenuNavigation.test.ts` | Level history: navigate, go back, reset, disabled and leaf items, direction |
| `src/data/menuData.test.ts` | Menu ids are unique across the demo tree |

They use React Testing Library and drive the drawer through roles and accessible names. `src/test/setup.ts` turns off Motion animations and stubs the browser APIs jsdom doesn't have (`matchMedia`, `ResizeObserver`, `CSS.escape`, `scrollIntoView`).

**Tech stack:** React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · Motion (`motion/react`) · lucide-react icons.

---

## Usage

```tsx
import { useState } from "react";
import NestedMenuDrawer from "./components";
import type { MenuItem } from "./types/menu.types";
import { Home, Settings, User } from "lucide-react";

const menu: MenuItem[] = [
  { id: "home", label: "Home", icon: Home, active: true },
  {
    id: "settings",
    label: "Settings",
    description: "Account and app preferences",
    icon: Settings,
    children: [
      { id: "profile", label: "Profile", icon: User },
      { id: "billing", label: "Billing", disabled: true },
    ],
  },
];

export default function App() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? "site-menu" : undefined}
      >
        Menu
      </button>

      <NestedMenuDrawer
        id="site-menu"
        open={open}
        onOpenChange={setOpen}
        menuItems={menu}
        title="Main Menu"
        onSelect={(item) => console.log("Selected", item.id)}
      />
    </>
  );
}
```

The drawer is **controlled**: you own the `open` state and the button that opens it. The drawer calls `onOpenChange(false)` when the user closes it. It renders nothing in place; the dialog is portalled into `document.body`, so you can mount `<NestedMenuDrawer>` anywhere in your tree.

Give your trigger `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls` (pointing at the drawer's `id`), as above. When the drawer closes, focus returns to whatever was focused when it opened, which is normally your trigger.

---

## Props

`NestedMenuDrawerProps` (`src/types/menu.types.ts`):

| Prop        | Type                       | Default       | Description                                                                                                   |
| ----------- | -------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| `open`      | `boolean`                  | **required**  | Whether the drawer is open. |
| `onOpenChange` | `(open: boolean) => void` | **required** | Called with `false` when the user closes the drawer (close button, Escape, backdrop tap, drag-to-close or selecting a leaf item). Set your state from it; if you ignore it, the drawer stays open. |
| `menuItems` | `MenuItem[]`               | **required**  | Top-level items. Nest further levels with `children`.                                                         |
| `title`     | `string`                   | `"Main Menu"` | Accessible name of the root level. It isn't shown on screen, but screen readers announce it and the Back button uses it ("Back to Main Menu"). |
| `onSelect`  | `(item: MenuItem) => void` | —             | Called when a **leaf** item (no `children`) is chosen. The drawer then closes.                                |
| `id`        | `string`                   | auto-generated | `id` of the dialog element, so your trigger can reference it with `aria-controls`. |

---

## Menu data

```ts
interface MenuItem {
  id: string;            // unique across the whole tree
  label: string;         // visible text; also the item's accessible name
  description?: string;  // secondary line; read by screen readers as a description
  icon?: LucideIcon;     // any lucide-react icon (or a component with the same props)
  children?: MenuItem[]; // makes this item open a submenu
  disabled?: boolean;    // shown dimmed, focusable, cannot be activated
  active?: boolean;      // current page: highlighted + aria-current="page"
  onSelect?: () => void; // per-item callback, runs before the drawer's onSelect
}
```

**How items behave:**

- **Has `children`** → opens a submenu. A chevron is shown and screen readers hear "Opens submenu". `onSelect` is *not* called.
- **Leaf item** → `item.onSelect()` runs, then the drawer's `onSelect(item)` runs, then the drawer closes.
- **`disabled`** → focusable, so screen-reader users can discover it, but clicks and Enter do nothing.
- **Icons** → if no item in a level has an icon, the icon column is removed. If only some items have icons, the others keep an empty slot so text stays aligned.
- **Ids** → the submenu title comes from the parent item's `label`, and the parent's `id` identifies the level. Keep ids unique across the whole tree: they key the level transitions, and Back uses them to refocus the parent item. `src/data/menuData.test.ts` checks this for the demo data.

Demo data lives in `src/data/menuData.ts`. It marks **Home** as `active` and **Investor Relations** as `disabled` so you can see those states. Remove those flags when you add real data.

---

## Interaction

### Pointer and touch

| Action                                   | Result                                    |
| ---------------------------------------- | ----------------------------------------- |
| Tap / click an item with children        | Opens its submenu (slides in from right)  |
| Tap / click a leaf item                  | Selects it and closes the drawer          |
| Tap **Back**                             | Returns to the parent level               |
| Tap the ✕ close button (top right)      | Closes the drawer                         |
| Tap the dimmed backdrop                  | Closes the drawer                         |
| Drag the drawer down from anywhere       | Follows your finger. Release past 100px (or flick) to close; otherwise it springs back. |

If a long list is scrolled down, dragging scrolls the list first. Once the list reaches the top, the same gesture starts pulling the drawer down.

### Keyboard

| Key                    | Action                                              |
| ---------------------- | --------------------------------------------------- |
| `Enter` / `Space`      | Open a submenu or select an item (opening the drawer is up to your trigger) |
| `↓` / `↑`              | Next / previous item (wraps around)                 |
| `Home` / `End`         | First / last item                                   |
| `←` / `Backspace`      | Go back one level (ignored while typing in a field) |
| `Tab` / `Shift+Tab`    | Move between Back, Close and items; focus stays inside the dialog |
| `Escape`               | Close the drawer                                    |

### Where focus goes

| When                            | Focus moves to                              |
| ------------------------------- | ------------------------------------------- |
| Drawer opens                    | First enabled item                          |
| Submenu opens                   | First enabled item of the submenu           |
| Going back                      | The item that opened that submenu           |
| Level has no items              | The level's (visually hidden) heading       |
| Drawer closes (any way)         | The element focused before it opened (your trigger) |

---

## Accessibility

- `role="dialog"` + `aria-modal="true"`. The dialog is named by a visually hidden heading that updates for each level.
- The rest of the page is made **`inert`** while the drawer is open, so it can't be reached by keyboard or screen reader.
- Your trigger should expose `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls` (see [Usage](#usage)); the demo trigger in `App.tsx` does.
- Items are a real list (`<nav>` › `<ul role="list">` › `<li>` › `<button>`). The name is the label; the description and "Opens submenu" hint are read via `aria-describedby`.
- Disabled items use `aria-disabled` instead of `disabled`, so they stay discoverable.
- The current page uses `aria-current="page"`.
- Back is announced as "Back to *Parent*", which still starts with the visible word "Back" (WCAG 2.5.3).
- A polite live region announces level changes ("Settings submenu", "Main Menu").
- All animations respect the OS **Reduce motion** setting (`MotionConfig reducedMotion="user"`).
- Focus rings show for keyboard users only (`:focus-visible`).

**Colour contrast note:** white text on the brand blue `#0083F7` measures ~3.8:1, below the WCAG AA 4.5:1 minimum for the 15px trigger label. See [Brand colour](#brand-colour) for options.

---

## Customization

All styling is Tailwind utility classes inside the components; there is no separate theme file. The table below shows where to change what.

### Brand colour

`#0083F7` is used in two places:

| Where                                   | File                     | Classes                                                     |
| --------------------------------------- | ------------------------ | ----------------------------------------------------------- |
| Demo "Open Menu" trigger (default / hover / pressed / focus ring) | `App.tsx` | `bg-[#0083F7]`, `hover:bg-[#0074DB]`, `active:bg-[#0065BF]`, `focus-visible:ring-[#0083F7]` |
| Active item icon tile                   | `MenuItem.tsx`           | `bg-[#0083F7]`, `shadow-[#0083F7]/30`                       |

To use a single token instead, define it once in `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand: #0083f7;
  --color-brand-hover: #0074db;
  --color-brand-pressed: #0065bf;
}
```

…then replace `bg-[#0083F7]` with `bg-brand`, `hover:bg-[#0074DB]` with `hover:bg-brand-hover`, and so on.

For AA-compliant text on the trigger, either use `#0074DB` as the default background (≈ 4.6:1), or make the label bold and ≥ 19px.

### Item states (`src/components/MenuItem.tsx`)

| State            | Classes to edit                                                                 |
| ---------------- | ------------------------------------------------------------------------------- |
| Hover            | `hover:bg-slate-100/80`, plus the icon tile's `group-hover:*` classes           |
| Pressed          | `active:bg-slate-200/70 active:scale-[0.985]`                                   |
| Active (current) | `bg-blue-50 hover:bg-blue-100/70`, label `text-blue-700`, icon tile `bg-[#0083F7]` |
| Disabled         | `opacity-45 cursor-not-allowed`                                                 |
| Focus            | `focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500`     |

### Size and shape (`src/components/NestedMenuDrawer.tsx`)

| What                         | Class / value                                     |
| ---------------------------- | ------------------------------------------------- |
| Drawer width                 | `max-w-[420px]`                                   |
| Max height on tablet/desktop | `sm:max-h-[min(720px,85dvh)]`                     |
| Corner radius                | `rounded-[28px]`                                  |
| Gap to screen edge           | Overlay `px-/pt-/pb-[max(0.75rem, env(safe-area-inset-*))]` (mobile), `sm:p-6` (desktop) |
| Backdrop                     | `bg-slate-950/45` on mobile; `sm:bg-slate-950/40 sm:backdrop-blur-sm` on tablet/desktop (blur is skipped on phones for performance) |
| Mobile / desktop breakpoint  | `useMediaQuery("(min-width: 640px)")` **and** the `sm:` classes. Keep both in sync. |

### Animation

| What                               | Where                                        |
| ---------------------------------- | -------------------------------------------- |
| Open / close spring                | `NestedMenuDrawer.tsx`: outer wrapper `transition.transform` (`stiffness: 380, damping: 38`) |
| Open / close motion per breakpoint | `NestedMenuDrawer.tsx`: `sheetMotion.mobile` / `sheetMotion.desktop` |
| Level slide distance               | `NestedMenuDrawer.tsx`: `levelVariants` (`±40%`) |
| Level slide + height timing        | `NestedMenuDrawer.tsx`: `LEVEL_DURATION`, `LEVEL_EASE` |
| Backdrop fade                      | `NestedMenuDrawer.tsx`: overlay `transition` (`0.25s`) |

Lower `damping` gives a bouncier sheet; higher `stiffness` makes it faster.

> **Keep slides on `transform` / `opacity`.** Animations are written as full `transform` strings (e.g. `translateY(110%)`), not Motion's `x` / `y` / `scale` shorthands. Motion runs `transform` and `opacity` on the compositor through the Web Animations API, so they stay smooth even when the main thread is busy. The shorthands run in JavaScript on the main thread. Because `MotionConfig reducedMotion` only covers the shorthands, each `transform` transition switches to `{ duration: 0 }` when `useReducedMotion()` is true. Keep that check if you add new transitions.

---

## Performance

The drawer is built to stay at 60fps on mid-range phones:

| Technique | Where |
| --- | --- |
| Open/close and level slides use `transform` + `opacity`, run on the compositor (WAAPI) | `sheetMotion`, `levelVariants` |
| The open/close animation (outer wrapper) and the drag offset (inner dialog) are on separate elements, so dragging never fights the enter/exit animation | `NestedMenuDrawer.tsx` |
| Drag-to-close writes a Motion value directly, with no React re-render per touch move | `useSheetDrag.ts` |
| Focus is moved one frame after open / level change with `preventScroll`, so the forced layout doesn't block the first animation frame | focus effect in `NestedMenuDrawer.tsx` |
| `MenuItem` is memoized and receives a stable `onClick`, so rows don't re-render on drawer state changes | `MenuItem.tsx`, `onItemClick` |
| The scrollbar is hidden during height animations by setting the style directly, not through React state | `setScrollLocked` |
| The full-screen `backdrop-filter` blur is only used at ≥ 640px | overlay classes |

**Benchmark** (production build, Chrome, 390×844 @3x, CPU throttled 4×, median of 3 runs). Every step stays within the 16.7ms frame budget (p95), except one frame on open:

| Step | Dropped frames | p95 frame |
| --- | --- | --- |
| Open | 1 (React mounting the dialog, before the slide starts) | 16.7ms |
| Open submenu / deeper / back / close | 0 | 16.7ms |

The one remaining heavier frame is the initial React mount of the dialog. It happens before the compositor animation starts, so the slide itself isn't affected. The level **height** change animates `height` (layout), which is cheap for a menu-sized list. Rows with very long lists (hundreds of items) would benefit from virtualization.

### Drag-to-close (`src/hooks/useSheetDrag.ts`)

| Constant         | Default | Meaning                                       |
| ---------------- | ------- | --------------------------------------------- |
| `CLOSE_OFFSET`   | `100`   | Pixels dragged down before release closes     |
| `CLOSE_VELOCITY` | `500`   | Flick speed (px/s) that closes regardless of distance |
| `TAP_SLOP`       | `4`     | Movement allowed before a tap counts as a drag |

### Trigger button

The drawer has no built-in trigger. The styled "Open Menu" button in `App.tsx` is a demo you can copy or replace with any button, link or icon that calls `setOpen(true)`.

### Text

| Text                       | Where                                         |
| -------------------------- | --------------------------------------------- |
| "Open Menu" (demo trigger) | `App.tsx`                                     |
| "Back" / "Back to …"       | `DrawerHeader.tsx`                            |
| "Close menu" (close button) | `DrawerHeader.tsx`                            |
| "Opens submenu" (SR only)  | `MenuItem.tsx`                                |
| "… submenu" announcement   | `NestedMenuDrawer.tsx`, `handleNavigate`      |

---

## Project structure

```
src/
├── App.tsx                     # Demo: trigger button + open state
├── main.tsx                    # React entry
├── index.css                   # Tailwind import + base body styles
├── components/
│   ├── index.ts                # Re-exports NestedMenuDrawer as default
│   ├── NestedMenuDrawer.tsx    # Dialog (controlled via open/onOpenChange), focus/keyboard, animations, responsive layout
│   ├── NestedMenuDrawer.test.tsx # Tests: navigation, focus, keyboard, close button, controlled state
│   ├── DrawerHeader.tsx        # Back + close buttons, visually hidden level heading
│   └── MenuItem.tsx            # One row: icon tile, label, description, chevron, states
├── hooks/
│   ├── useMenuNavigation.ts    # Level history stack (navigate / goBack / reset)
│   ├── useMenuNavigation.test.ts # Tests: history, back, reset, direction
│   ├── useSheetDrag.ts         # Drag-down-to-close gesture (touch + mouse)
│   └── useMediaQuery.ts        # Media-query subscription (mobile vs desktop)
├── data/
│   ├── menuData.ts             # Demo menu tree
│   └── menuData.test.ts        # Tests: menu ids are unique
├── test/
│   └── setup.ts                # Vitest setup: Motion off, jsdom stubs
└── types/
    └── menu.types.ts           # MenuItem, MenuLevel, NestedMenuDrawerProps
```

---

## Known limitations

- **Light theme only.** There are no dark-mode styles yet.
- **Navigation resets on close.** Reopening always starts at the root level.
