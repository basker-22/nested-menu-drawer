import { memo, useId } from "react";
import { ChevronRight } from "lucide-react";
import type { MenuItem as MenuItemType } from "../types/menu.types";

interface Props {
  item: MenuItemType;
  onClick: (item: MenuItemType) => void;
  /**
   * Reserve the icon column. True when any item in the level has an icon,
   * so rows stay aligned; false for icon-less levels so text uses the space.
   */
  showIconSlot?: boolean;
}

const cx = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(" ");

// Memoized: rows only re-render when their item / slot / handler changes.
export default memo(MenuItem);

function MenuItem({
  item,
  onClick,
  showIconSlot = Boolean(item.icon),
}: Props) {
  const Icon = item.icon;
  const hasChildren = Boolean(item.children?.length);
  const disabled = Boolean(item.disabled);
  const active = Boolean(item.active) && !disabled;
  const interactive = !disabled;

  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-desc`;
  const submenuHintId = `${id}-submenu`;

  // Name = label only; description + "submenu" hint are read as description.
  const describedBy =
    [
      item.description ? descriptionId : null,
      hasChildren ? submenuHintId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <li>
      <button
        type="button"
        data-menu-item=""
        data-item-id={item.id}
        // aria-disabled (not `disabled`) keeps the item focusable so screen
        // reader users can discover it and hear that it's unavailable.
        aria-disabled={disabled || undefined}
        aria-current={active ? "page" : undefined}
        onClick={() => onClick(item)}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        className={cx(
          "group flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left",
          "transition-[background-color,transform] duration-150 ease-out",
          "[-webkit-tap-highlight-color:transparent]",
          "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500",
          disabled && "cursor-not-allowed opacity-45",
          interactive && "cursor-pointer active:scale-[0.985]",
          interactive &&
            (active
              ? "bg-blue-50 hover:bg-blue-100/70 active:bg-blue-100"
              : "hover:bg-slate-100/80 active:bg-slate-200/70")
        )}
      >
        {/* Icon tile (an empty, invisible slot keeps alignment in mixed levels) */}
        {showIconSlot && !Icon && (
          <span aria-hidden="true" className="size-10 shrink-0" />
        )}
        {Icon && (
        <span
          aria-hidden="true"
          className={cx(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            "transition-[background-color,color,box-shadow] duration-150",
            active
              ? "bg-[#0083F7] text-white shadow-sm shadow-[#0083F7]/30"
              : "bg-slate-100 text-slate-600",
            interactive &&
              !active &&
              "group-hover:bg-white group-hover:text-slate-900 group-hover:shadow-sm group-hover:ring-1 group-hover:ring-slate-200"
          )}
        >
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
        )}

        <span className="min-w-0 flex-1">
          <span
            id={labelId}
            className={cx(
              // Wraps instead of truncating, so long labels / large text sizes stay readable.
              "block text-[15px] leading-5 font-medium tracking-[-0.01em] [overflow-wrap:anywhere]",
              active ? "text-blue-700" : "text-slate-900"
            )}
          >
            {item.label}
          </span>

          {item.description && (
            <span
              id={descriptionId}
              className={cx(
                "mt-0.5 block text-[13px] leading-[18px]",
                active
                  ? "text-blue-700/75"
                  : "text-slate-500 transition-colors duration-150 group-hover:text-slate-600"
              )}
            >
              {item.description}
            </span>
          )}

          {hasChildren && (
            <span id={submenuHintId} className="sr-only">
              Opens submenu
            </span>
          )}
        </span>

        {hasChildren && (
          <ChevronRight
            size={18}
            strokeWidth={2}
            aria-hidden="true"
            className={cx(
              "shrink-0 text-slate-400 transition-[color,transform] duration-150",
              interactive &&
                "group-hover:translate-x-0.5 group-hover:text-slate-700 group-active:translate-x-1"
            )}
          />
        )}
      </button>
    </li>
  );
}
