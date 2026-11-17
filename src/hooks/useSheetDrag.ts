import { useEffect, useRef, type RefObject } from "react";
import { animate, useMotionValue } from "motion/react";

// Drag-to-close thresholds
const CLOSE_OFFSET = 100; // px dragged down
const CLOSE_VELOCITY = 500; // px/s flick speed
const TAP_SLOP = 4; // px of movement before a tap counts as a drag

interface Options {
  sheetRef: RefObject<HTMLElement | null>;
  scrollRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  onClose: () => void;
}

/**
 * Drag a bottom sheet down from anywhere to close it.
 *
 * - Dragging down anywhere on the sheet moves it.
 * - Inside a scrollable list, the list scrolls normally; once it is back at
 *   the top, a further downward drag moves the sheet instead.
 * - Release past CLOSE_OFFSET (or a fast flick) closes; otherwise springs back.
 */
export function useSheetDrag({
  sheetRef,
  scrollRef,
  enabled,
  onClose,
}: Options) {
  const y = useMotionValue(0);
  const didDrag = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!enabled || !sheet) return;

    let tracking = false;
    let dragging = false;
    let startY = 0;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;

    const listIsScrolled = (target: EventTarget | null) => {
      const list = scrollRef.current;
      return (
        !!list && list.contains(target as Node) && list.scrollTop > 0
      );
    };

    const begin = (clientY: number) => {
      tracking = true;
      dragging = false;
      didDrag.current = false;
      startY = lastY = clientY;
      lastT = performance.now();
      velocity = 0;
    };

    // Returns true when the sheet is being dragged (caller should
    // preventDefault so the browser doesn't scroll).
    const move = (clientY: number, target: EventTarget | null) => {
      if (!tracking) return false;

      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) velocity = ((clientY - lastY) / dt) * 1000;
      lastY = clientY;
      lastT = now;

      if (!dragging) {
        const dy = clientY - startY;
        if (dy === 0) return false;
        // Moving up, or list still has content above: let it scroll.
        if (dy < 0 || listIsScrolled(target)) {
          // Keep tracking so that a list scrolled back to top can
          // hand over to the sheet within the same gesture.
          startY = clientY;
          return false;
        }
        dragging = true;
        startY = clientY;
      }

      const offset = clientY - startY;
      if (Math.abs(offset) > TAP_SLOP) didDrag.current = true;
      // Follow the finger downward; resist strongly upward.
      y.set(offset > 0 ? offset : offset * 0.15);
      return true;
    };

    const end = () => {
      if (!tracking) return;
      tracking = false;
      if (!dragging) return;
      dragging = false;

      // Ignore stale velocity if the finger paused before release.
      if (performance.now() - lastT > 100) velocity = 0;

      if (y.get() > CLOSE_OFFSET || velocity > CLOSE_VELOCITY) {
        onCloseRef.current();
      } else {
        animate(y, 0, { type: "spring", stiffness: 400, damping: 38 });
      }
    };

    // --- Touch ---
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) begin(e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (move(e.touches[0].clientY, e.target) && e.cancelable) {
        e.preventDefault();
      }
    };

    // --- Mouse ---
    const onPointerMove = (e: PointerEvent) => {
      if (move(e.clientY, e.target)) e.preventDefault();
    };
    const onPointerUp = () => {
      end();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      begin(e.clientY);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    };

    sheet.addEventListener("touchstart", onTouchStart, { passive: true });
    sheet.addEventListener("touchmove", onTouchMove, { passive: false });
    sheet.addEventListener("touchend", end);
    sheet.addEventListener("touchcancel", end);
    sheet.addEventListener("pointerdown", onPointerDown);

    return () => {
      sheet.removeEventListener("touchstart", onTouchStart);
      sheet.removeEventListener("touchmove", onTouchMove);
      sheet.removeEventListener("touchend", end);
      sheet.removeEventListener("touchcancel", end);
      sheet.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [enabled, sheetRef, scrollRef, y]);

  // Swallow the click that follows a drag so items don't activate.
  const onClickCapture = (event: React.MouseEvent) => {
    if (didDrag.current) {
      event.preventDefault();
      event.stopPropagation();
      didDrag.current = false;
    }
  };

  return { y, onClickCapture };
}
