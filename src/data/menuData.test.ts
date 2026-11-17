import { describe, expect, it } from "vitest";

import { menuData } from "./menuData";
import type { MenuItem } from "../types/menu.types";

const allIds = (items: MenuItem[]): string[] =>
  items.flatMap((item) => [item.id, ...allIds(item.children ?? [])]);

describe("menuData", () => {
  // Ids key the rendered lists and level transitions, and Back uses them to
  // find the item to refocus, so they must be unique across the whole tree.
  it("has unique ids at every level", () => {
    const ids = allIds(menuData);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
  });
});
