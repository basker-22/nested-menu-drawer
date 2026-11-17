import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useMenuNavigation } from "./useMenuNavigation";
import type { MenuItem } from "../types/menu.types";

const menu: MenuItem[] = [
  { id: "home", label: "Home" },
  {
    id: "products",
    label: "Products",
    children: [
      {
        id: "software",
        label: "Software",
        children: [{ id: "web", label: "Web" }],
      },
    ],
  },
  {
    id: "investors",
    label: "Investors",
    disabled: true,
    children: [{ id: "reports", label: "Reports" }],
  },
];

const setup = () => renderHook(() => useMenuNavigation(menu, "Main Menu"));

describe("useMenuNavigation", () => {
  it("starts at the root level", () => {
    const { result } = setup();

    expect(result.current.currentLevel.id).toBe("root");
    expect(result.current.currentLevel.title).toBe("Main Menu");
    expect(result.current.currentLevel.items).toBe(menu);
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.history).toHaveLength(1);
  });

  it("navigates into nested submenus and records direction", () => {
    const { result } = setup();

    act(() => result.current.navigate(menu[1]));
    expect(result.current.currentLevel).toMatchObject({
      id: "products",
      title: "Products",
    });
    expect(result.current.direction).toBe("forward");
    expect(result.current.canGoBack).toBe(true);

    act(() => result.current.navigate(result.current.currentLevel.items[0]));
    expect(result.current.currentLevel.id).toBe("software");
    expect(result.current.history.map((level) => level.id)).toEqual([
      "root",
      "products",
      "software",
    ]);
  });

  it("ignores leaf and disabled items", () => {
    const { result } = setup();

    act(() => result.current.navigate(menu[0])); // leaf
    act(() => result.current.navigate(menu[2])); // disabled with children

    expect(result.current.currentLevel.id).toBe("root");
    expect(result.current.history).toHaveLength(1);
  });

  it("goes back one level at a time and stops at the root", () => {
    const { result } = setup();
    act(() => result.current.navigate(menu[1]));
    act(() => result.current.navigate(result.current.currentLevel.items[0]));

    act(() => result.current.goBack());
    expect(result.current.currentLevel.id).toBe("products");
    expect(result.current.direction).toBe("backward");

    act(() => result.current.goBack());
    act(() => result.current.goBack()); // already at root: no-op
    expect(result.current.currentLevel.id).toBe("root");
    expect(result.current.canGoBack).toBe(false);
  });

  it("reset returns to the root from any depth", () => {
    const { result } = setup();
    act(() => result.current.navigate(menu[1]));
    act(() => result.current.navigate(result.current.currentLevel.items[0]));

    act(() => result.current.reset());

    expect(result.current.currentLevel.id).toBe("root");
    expect(result.current.history).toHaveLength(1);
    expect(result.current.direction).toBe("forward");
  });
});
