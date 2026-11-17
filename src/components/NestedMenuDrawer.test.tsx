import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import NestedMenuDrawer from "./NestedMenuDrawer";
import type { MenuItem } from "../types/menu.types";

const menu: MenuItem[] = [
  { id: "home", label: "Home", active: true },
  {
    id: "products",
    label: "Products",
    children: [
      {
        id: "software",
        label: "Software",
        children: [
          { id: "web", label: "Web" },
          { id: "mobile", label: "Mobile" },
        ],
      },
      { id: "cloud", label: "Cloud" },
    ],
  },
  { id: "investors", label: "Investors", disabled: true },
  { id: "contact", label: "Contact" },
];

// A minimal consumer: owns the open state and renders its own trigger.
function Harness({
  onOpenChange,
  onSelect,
}: {
  onOpenChange: (open: boolean) => void;
  onSelect: (item: MenuItem) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen(true)}>
        Open Menu
      </button>
      <NestedMenuDrawer
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          setOpen(next);
        }}
        menuItems={menu}
        title="Main Menu"
        onSelect={onSelect}
      />
    </>
  );
}

function setup() {
  const onSelect = vi.fn();
  const onOpenChange = vi.fn();
  const user = userEvent.setup();
  render(<Harness onOpenChange={onOpenChange} onSelect={onSelect} />);
  const trigger = screen.getByRole("button", { name: "Open Menu" });
  return { user, trigger, onSelect, onOpenChange };
}

async function openDrawer() {
  const ctx = setup();
  await ctx.user.click(ctx.trigger);
  const dialog = screen.getByRole("dialog", { name: "Main Menu" });
  // Focus moves in the next animation frame.
  await waitFor(() => expect(item("Home")).toHaveFocus());
  return { ...ctx, dialog };
}

const item = (name: string) => screen.getByRole("button", { name });
const backButton = () => screen.getByRole("button", { name: /^Back/ });
const closeButton = () => screen.getByRole("button", { name: "Close menu" });

describe("NestedMenuDrawer: navigation", () => {
  it("opens from the trigger with Enter and Space", async () => {
    const { user, trigger } = setup();

    trigger.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    trigger.focus();
    await user.keyboard(" ");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("drills into nested submenus and back out", async () => {
    const { user, dialog } = await openDrawer();
    expect(screen.queryByRole("button", { name: /^Back/ })).toBeNull();

    await user.click(item("Products"));
    expect(dialog).toHaveAccessibleName("Products");
    expect(backButton()).toHaveAccessibleName("Back to Main Menu");
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(2);

    await user.click(item("Software"));
    expect(dialog).toHaveAccessibleName("Software");
    expect(backButton()).toHaveAccessibleName("Back to Products");

    await user.click(backButton());
    expect(dialog).toHaveAccessibleName("Products");

    await user.click(backButton());
    expect(dialog).toHaveAccessibleName("Main Menu");
    expect(screen.queryByRole("button", { name: /^Back/ })).toBeNull();
  });

  it("selecting a leaf item calls onSelect and closes", async () => {
    const { user, onSelect, onOpenChange } = await openDrawer();

    await user.click(item("Contact"));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "contact" })
    );
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("disabled items are announced but do nothing", async () => {
    const { user, onSelect } = await openDrawer();
    const investors = item("Investors");

    expect(investors).toHaveAttribute("aria-disabled", "true");
    await user.click(investors);

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("marks the active item as the current page", async () => {
    await openDrawer();
    expect(item("Home")).toHaveAttribute("aria-current", "page");
    expect(item("Contact")).not.toHaveAttribute("aria-current");
  });

  it("reopens at the root after closing inside a submenu", async () => {
    const { user, trigger } = await openDrawer();
    await user.click(item("Products"));
    await waitFor(() => expect(item("Software")).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(trigger);

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Main Menu");
  });
});

describe("NestedMenuDrawer: focus management", () => {
  it("focuses the first enabled item when opened", async () => {
    const { dialog } = await openDrawer();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("focuses the first item of a submenu, then the parent item on Back", async () => {
    const { user } = await openDrawer();

    await user.click(item("Products"));
    await waitFor(() => expect(item("Software")).toHaveFocus());

    await user.click(backButton());
    await waitFor(() => expect(item("Products")).toHaveFocus());
  });

  it("ArrowLeft and Backspace go back and restore focus to the parent item", async () => {
    const { user } = await openDrawer();
    await user.click(item("Products"));
    await user.click(item("Software"));
    await waitFor(() => expect(item("Web")).toHaveFocus());

    await user.keyboard("{ArrowLeft}");
    await waitFor(() => expect(item("Software")).toHaveFocus());

    await user.keyboard("{Backspace}");
    await waitFor(() => expect(item("Products")).toHaveFocus());
  });

  it("arrow keys, Home and End move between items and wrap", async () => {
    const { user } = await openDrawer();

    await user.keyboard("{ArrowDown}");
    expect(item("Products")).toHaveFocus();

    await user.keyboard("{End}");
    expect(item("Contact")).toHaveFocus();

    await user.keyboard("{ArrowDown}"); // wraps to the top
    expect(item("Home")).toHaveFocus();

    await user.keyboard("{ArrowUp}"); // wraps to the bottom
    expect(item("Contact")).toHaveFocus();

    await user.keyboard("{Home}");
    expect(item("Home")).toHaveFocus();
  });

  it("traps Tab and Shift+Tab inside the dialog", async () => {
    const { user, dialog } = await openDrawer();

    await user.keyboard("{End}");
    await user.tab(); // last item wraps to the first control: Close
    expect(closeButton()).toHaveFocus();

    await user.tab({ shift: true });
    expect(item("Contact")).toHaveFocus();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("Escape closes and returns focus to the trigger", async () => {
    const { user, trigger, onOpenChange } = await openDrawer();
    await user.click(item("Products"));
    await waitFor(() => expect(item("Software")).toHaveFocus());

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("hides the page behind the dialog from assistive tech while open", async () => {
    const { user, trigger } = await openDrawer();
    const page = trigger.parentElement!; // RTL's container, a <body> child

    expect(page.inert).toBe(true);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(page.inert).toBe(false);
  });
});

describe("NestedMenuDrawer: close button", () => {
  it("is visible at the root and in submenus", async () => {
    const { user } = await openDrawer();
    expect(closeButton()).toBeVisible();

    await user.click(item("Products"));
    expect(closeButton()).toBeVisible();
    expect(backButton()).toBeVisible();
  });

  it("closes from a submenu, calls onOpenChange and restores focus", async () => {
    const { user, trigger, onOpenChange, onSelect } = await openDrawer();
    await user.click(item("Products"));

    await user.click(closeButton());

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSelect).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("is reachable by keyboard and activates with Enter", async () => {
    const { user, onOpenChange } = await openDrawer();

    await user.tab({ shift: true }); // from the first item back to Close
    expect(closeButton()).toHaveFocus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("NestedMenuDrawer: controlled open state", () => {
  const props = { menuItems: menu, title: "Main Menu" };

  it("renders nothing while closed and the dialog when open", () => {
    const { rerender } = render(
      <NestedMenuDrawer {...props} open={false} onOpenChange={() => {}} />
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<NestedMenuDrawer {...props} open onOpenChange={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("only requests closing; the parent decides", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn(); // parent ignores the request
    render(<NestedMenuDrawer {...props} open onOpenChange={onOpenChange} />);
    await waitFor(() => expect(item("Home")).toHaveFocus());

    await user.keyboard("{Escape}");
    await user.click(closeButton());

    expect(onOpenChange).toHaveBeenNthCalledWith(1, false);
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("resets to the root when the parent closes it from a submenu and reopens", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <NestedMenuDrawer {...props} open onOpenChange={() => {}} />
    );
    await user.click(item("Products"));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Products");

    rerender(<NestedMenuDrawer {...props} open={false} onOpenChange={() => {}} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    rerender(<NestedMenuDrawer {...props} open onOpenChange={() => {}} />);

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Main Menu");
    await waitFor(() => expect(item("Home")).toHaveFocus());
  });

  it("uses the id prop for the dialog, for aria-controls", () => {
    render(
      <NestedMenuDrawer {...props} id="site-menu" open onOpenChange={() => {}} />
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("id", "site-menu");
  });
});
