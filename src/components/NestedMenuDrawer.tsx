import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";

import { useMenuNavigation } from "../hooks/useMenuNavigation";
import { useSheetDrag } from "../hooks/useSheetDrag";
import { useMediaQuery } from "../hooks/useMediaQuery";
import type {
  MenuItem as MenuItemType,
  NavigationDirection,
  NestedMenuDrawerProps,
} from "../types/menu.types";

import MenuItem from "./MenuItem";
import DrawerHeader from "./DrawerHeader";

// Perf: every slide animates the full `transform` string (not Motion's
// x / y / scale shorthands). Motion runs `transform` + `opacity` through
// the Web Animations API, i.e. on the compositor thread, so the motion
// stays at 60fps even if the main thread is busy rendering or focusing.
// (Motion's x/y/scale are driven from JS on the main thread.)
const levelVariants = {
  enter: (direction: NavigationDirection) => ({
    transform: `translateX(${direction === "forward" ? 40 : -40}%)`,
    opacity: 0,
  }),
  center: { transform: "translateX(0%)", opacity: 1 },
  exit: (direction: NavigationDirection) => ({
    transform: `translateX(${direction === "forward" ? -40 : 40}%)`,
    opacity: 0,
  }),
};

// Shared easing for level slide + height change so they move together.
const LEVEL_EASE = [0.32, 0.72, 0, 1] as const;
const LEVEL_DURATION = 0.32;

// Mobile: bottom sheet slides up from off-screen.
// Tablet/desktop: centered dialog rises and fades in.
const sheetMotion = {
  mobile: {
    hidden: { transform: "translateY(110%) scale(1)", opacity: 1 },
    shown: { transform: "translateY(0%) scale(1)", opacity: 1 },
  },
  desktop: {
    hidden: { transform: "translateY(24px) scale(0.97)", opacity: 0 },
    shown: { transform: "translateY(0px) scale(1)", opacity: 1 },
  },
};

// Where focus should land after the next level render.
type FocusTarget = { kind: "first" } | { kind: "item"; id: string };

const isEnabled = (el: HTMLElement) =>
  el.getAttribute("aria-disabled") !== "true";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function NestedMenuDrawer({
  menuItems,
  title = "Main Menu",
  open: isOpen,
  onOpenChange,
  onSelect,
  id,
}: NestedMenuDrawerProps) {
  const [announcement, setAnnouncement] = useState("");
  // Measured height of the current level's list; drives the animated
  // height of the scroll area so the dialog resizes smoothly per level.
  const [listHeight, setListHeight] = useState<number | null>(null);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const sheet = isDesktop ? sheetMotion.desktop : sheetMotion.mobile;
  // MotionConfig's reducedMotion only covers x/y/scale shorthands, not the
  // raw `transform` strings used below, so handle it explicitly.
  const reduceMotion = useReducedMotion() ?? false;
  const pendingFocus = useRef<FocusTarget>({ kind: "first" });

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const generatedId = useId();
  const dialogId = id ?? generatedId;
  const headingId = useId();

  const {
    currentLevel,
    history,
    direction,
    canGoBack,
    navigate,
    goBack,
    reset,
  } = useMenuNavigation(menuItems, title);

  const currentTitle = currentLevel.title;
  const parentTitle = canGoBack
    ? history[history.length - 2].title
    : undefined;
  const levelHasIcons = currentLevel.items.some((item) => item.icon);

  // Every open starts fresh at the root level. Adjusting state during render
  // (instead of in an effect) means the first open frame already shows the
  // root, even if the drawer was last closed from inside a submenu.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      reset();
      setAnnouncement("");
      setListHeight(null); // start at natural height, don't animate from last session
    }
  }

  // While open: lock scroll, hide the rest of the page from assistive tech
  // and keyboard (inert), and on close return focus to whatever had it
  // before opening (usually the consumer's trigger button).
  useEffect(() => {
    if (!isOpen) return;

    const returnFocusTo =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overlay = overlayRef.current;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const madeInert: HTMLElement[] = [];
    for (const el of Array.from(document.body.children)) {
      if (el === overlay || !(el instanceof HTMLElement) || el.inert) continue;
      el.inert = true;
      madeInert.push(el);
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      madeInert.forEach((el) => (el.inert = false));
      if (returnFocusTo?.isConnected) returnFocusTo.focus({ preventScroll: true });
    };
  }, [isOpen]);

  // Menu item buttons of the level currently shown (ignores a list that is
  // still animating out).
  const getItems = () =>
    Array.from(
      scrollRef.current?.querySelectorAll<HTMLButtonElement>(
        `[data-level="${CSS.escape(currentLevel.id)}"] [data-menu-item]`
      ) ?? []
    );

  // Focus management on open and on every level change:
  //  - open / into a submenu → first enabled item
  //  - Back                  → the item that opened the submenu
  //  - no items              → the level heading (fallback)
  //
  // Perf: focus() forces a synchronous style + layout (and, without
  // preventScroll, tries to scroll the still off-screen sheet into view).
  // Deferring it one frame lets the first animation frame paint first.
  useEffect(() => {
    if (!isOpen) return;

    const frame = requestAnimationFrame(() => {
      const target = pendingFocus.current;
      pendingFocus.current = { kind: "first" };

      const items = getItems();
      const next =
        (target.kind === "item" &&
          items.find((el) => el.dataset.itemId === target.id)) ||
        items.find(isEnabled) ||
        items[0];

      (next ?? headingRef.current)?.focus({ preventScroll: true });
      // Returning to a parent item that may be scrolled out of view.
      if (target.kind === "item" && next) {
        next.scrollIntoView({ block: "nearest" });
      }
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevel.id, isOpen]);

  // Track the current level's natural height (also reacts to text wrapping,
  // font scaling, and viewport width changes). ResizeObserver fires once on
  // observe, before paint, so there's no initial jump.
  useEffect(() => {
    if (!isOpen) return;
    const list = scrollRef.current?.querySelector<HTMLElement>(
      `[data-level="${CSS.escape(currentLevel.id)}"]`
    );
    if (!list) return;
    const observer = new ResizeObserver(() =>
      setListHeight(list.offsetHeight)
    );
    observer.observe(list);
    return () => observer.disconnect();
  }, [isOpen, currentLevel.id]);

  const handleNavigate = (item: MenuItemType) => {
    pendingFocus.current = { kind: "first" };
    setAnnouncement(`${item.label} submenu`);
    navigate(item);
  };

  const handleBack = () => {
    // Return focus to the item that opened this submenu.
    pendingFocus.current = { kind: "item", id: currentLevel.id };
    setAnnouncement(parentTitle ?? title);
    goBack();
  };

  const { y: sheetY, onClickCapture: swallowDragClick } = useSheetDrag({
    sheetRef: dialogRef,
    scrollRef,
    enabled: isOpen,
    onClose: () => handleClose(),
  });

  // Before the first open frame paints: clear any drag offset left from a
  // drag-to-close, and aim initial focus at the first item.
  useLayoutEffect(() => {
    if (!isOpen) return;
    pendingFocus.current = { kind: "first" };
    sheetY.set(0);
  }, [isOpen, sheetY]);

  const handleClose = () => onOpenChange(false);

  const handleMenuClick = (item: MenuItemType) => {
    if (item.disabled) return;

    if (item.children?.length) {
      handleNavigate(item);
      return;
    }

    item.onSelect?.();
    onSelect?.(item);
    handleClose();
  };

  // Stable identity so memoized <MenuItem>s don't re-render when the drawer
  // re-renders (height measurement, announcements, etc.).
  const menuClickRef = useRef(handleMenuClick);
  useLayoutEffect(() => {
    menuClickRef.current = handleMenuClick;
  });
  const onItemClick = useCallback(
    (item: MenuItemType) => menuClickRef.current(item),
    []
  );

  // Hide the scrollbar while the height animates, without a React re-render.
  const setScrollLocked = (locked: boolean) => {
    if (scrollRef.current) {
      scrollRef.current.style.overflowY = locked ? "hidden" : "";
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleClose();
      return;
    }

    // Arrow / Home / End move between items of the current level.
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      const items = getItems();
      if (!items.length) return;
      event.preventDefault();

      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const last = items.length - 1;
      const next =
        event.key === "Home" ? 0
        : event.key === "End" ? last
        : index === -1 ? (event.key === "ArrowDown" ? 0 : last)
        : event.key === "ArrowDown" ? (index === last ? 0 : index + 1)
        : index === 0 ? last : index - 1;

      items[next].focus();
      return;
    }

    // ArrowLeft / Backspace go up one level (mirrors the Back button).
    const typing = (event.target as HTMLElement).matches(
      "input, textarea, select, [contenteditable]"
    );
    if (
      canGoBack &&
      !typing &&
      (event.key === "ArrowLeft" || event.key === "Backspace")
    ) {
      event.preventDefault();
      handleBack();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    // Focus is on the (non-tabbable) heading or has escaped the dialog:
    // send it to the first/last control.
    if (
      active === headingRef.current ||
      !dialogRef.current?.contains(active)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    // Respect the OS "reduce motion" setting for every animation below.
    <MotionConfig reducedMotion="user">
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={overlayRef}
              className="
                fixed inset-0 z-50 flex items-end justify-center
                bg-slate-950/45
                sm:bg-slate-950/40 sm:backdrop-blur-sm
                px-[max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))]
                pt-[max(0.75rem,env(safe-area-inset-top))]
                pb-[max(0.75rem,env(safe-area-inset-bottom))]
                sm:items-center sm:p-6
              "
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={handleClose}
            >
              {/* Outer: open/close animation (compositor-driven transform). */}
              <motion.div
                initial={sheet.hidden}
                animate={sheet.shown}
                exit={sheet.hidden}
                transition={{
                  transform: reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 380, damping: 38, mass: 0.9 },
                  opacity: { duration: 0.2 },
                }}
                style={{ willChange: "transform" }}
                className="
                  flex max-h-full w-full max-w-[420px] flex-col
                  sm:max-h-[min(720px,85dvh)]
                "
              >
              {/* Inner: the dialog itself; follows the finger while dragging. */}
              <motion.div
                ref={dialogRef}
                id={dialogId}
                role="dialog"
                aria-modal="true"
                aria-labelledby={headingId}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={handleKeyDown}
                onClickCapture={swallowDragClick}
                style={{ y: sheetY }}
                className="
                  flex min-h-0 w-full flex-col
                  overflow-hidden rounded-[28px]
                  select-none bg-white p-2
                  shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)]
                  ring-1 ring-slate-900/5
                "
              >
                <DrawerHeader
                  title={currentTitle}
                  parentTitle={parentTitle}
                  canGoBack={canGoBack}
                  onBack={handleBack}
                  onClose={handleClose}
                  headingId={headingId}
                  headingRef={headingRef}
                />

                <motion.nav
                  ref={scrollRef}
                  aria-labelledby={headingId}
                  // Height follows the current level's content; flex-shrink +
                  // min-h-0 let it compress and scroll when taller than the
                  // space available.
                  initial={false}
                  animate={{ height: listHeight ?? "auto" }}
                  transition={{ duration: LEVEL_DURATION, ease: LEVEL_EASE }}
                  onAnimationStart={() => setScrollLocked(true)}
                  onAnimationComplete={() => setScrollLocked(false)}
                  className={`
                    relative min-h-0 shrink overflow-x-hidden overscroll-contain
                    [scrollbar-width:thin] [scrollbar-color:var(--color-slate-300)_transparent]
                    overflow-y-auto
                  `}
                >
                  <AnimatePresence
                    mode="popLayout"
                    initial={false}
                    custom={direction}
                  >
                    <motion.ul
                      key={currentLevel.id}
                      // Tailwind removes list bullets, which makes Safari /
                      // VoiceOver drop list semantics unless role is explicit.
                      role="list"
                      data-level={currentLevel.id}
                      custom={direction}
                      variants={levelVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        transform: reduceMotion
                          ? { duration: 0 }
                          : { duration: LEVEL_DURATION, ease: LEVEL_EASE },
                        opacity: { duration: 0.2 },
                      }}
                      style={{ willChange: "transform, opacity" }}
                      className="w-full space-y-0.5"
                    >
                      {currentLevel.items.map((item) => (
                        <MenuItem
                          key={item.id}
                          item={item}
                          onClick={onItemClick}
                          showIconSlot={levelHasIcons}
                        />
                      ))}
                    </motion.ul>
                  </AnimatePresence>
                </motion.nav>

                {/* Announces the level name when focus moves to its first
                    item / back to the parent item. */}
                <p className="sr-only" aria-live="polite" aria-atomic="true">
                  {announcement}
                </p>
              </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </MotionConfig>
  );
}
