import { ArrowLeft, X } from "lucide-react";
import type { RefObject } from "react";

interface Props {
  title: string;
  /** Title of the level the Back button returns to. */
  parentTitle?: string;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
  headingId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

// Shared look for the header's round icon/text buttons.
const headerButton = `
  group flex items-center justify-center rounded-full
  text-slate-700
  transition-[background-color,color,transform] duration-150 ease-out
  [-webkit-tap-highlight-color:transparent]
  hover:text-slate-900 active:scale-[0.95]
  outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500
`;

export default function DrawerHeader({
  title,
  parentTitle,
  canGoBack,
  onBack,
  onClose,
  headingId,
  headingRef,
}: Props) {
  return (
    <div
      className={`
        mb-1.5 flex items-center gap-2 px-0.5 pb-1.5
        ${canGoBack ? "border-b border-slate-100" : ""}
      `}
    >
      {/* Visually hidden but always present: it names the dialog
          (aria-labelledby) and is the focus fallback for empty levels. */}
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className="sr-only">
        {title}
      </h2>

      {canGoBack && (
        <button
          type="button"
          onClick={onBack}
          // Visible text "Back" is kept at the start of the name (WCAG 2.5.3).
          aria-label={parentTitle ? `Back to ${parentTitle}` : "Back"}
          className={`${headerButton} h-11 gap-1.5 pl-2.5 pr-4 text-[15px] font-semibold tracking-[-0.01em] sm:h-10 hover:bg-slate-100 active:bg-slate-200/70`}
        >
          <ArrowLeft
            size={18}
            strokeWidth={2}
            aria-hidden="true"
            className="transition-transform duration-150 group-hover:-translate-x-0.5 group-active:-translate-x-1"
          />
          Back
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        // 44px touch target on mobile (WCAG 2.5.5), 40px on larger screens.
        className={`${headerButton} ml-auto size-11 shrink-0 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 sm:size-10`}
      >
        <X size={20} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
