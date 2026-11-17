
import { useReducer } from "react";
import type {
  MenuItem,
  MenuLevel,
  NavigationState,
} from "../types/menu.types";

type NavigationAction =
  | { type: "NAVIGATE"; item: MenuItem }
  | { type: "GO_BACK" }
  | { type: "RESET"; items: MenuItem[]; rootTitle: string };

interface InitialStateArgs {
  items: MenuItem[];
  rootTitle: string;
}

function createInitialState({
  items,
  rootTitle,
}: InitialStateArgs): NavigationState {
  return {
    history: [
      {
        id: "root",
        title: rootTitle,
        items,
      },
    ],
    direction: "forward",
  };
}

function navigationReducer(
  state: NavigationState,
  action: NavigationAction
): NavigationState {
  switch (action.type) {
    case "NAVIGATE": {
      const { item } = action;

      if (!item.children?.length || item.disabled) {
        return state;
      }

      const nextLevel: MenuLevel = {
        id: item.id,
        title: item.label,
        items: item.children,
      };

      return {
        history: [...state.history, nextLevel],
        direction: "forward",
      };
    }

    case "GO_BACK": {
      if (state.history.length <= 1) {
        return state;
      }

      return {
        history: state.history.slice(0, -1),
        direction: "backward",
      };
    }

    case "RESET":
      return createInitialState(action);

    default:
      return state;
  }
}

/**
 * Level history for a nested menu.
 *
 * @param menuItems Items of the root level.
 * @param rootTitle Title of the root level. If it changes while the menu is
 *   open, the root level picks up the new title straight away.
 */
export function useMenuNavigation(menuItems: MenuItem[], rootTitle: string) {
  const [state, dispatch] = useReducer(
    navigationReducer,
    { items: menuItems, rootTitle },
    createInitialState
  );

  const [root, ...rest] = state.history;
  const history =
    root.title === rootTitle
      ? state.history
      : [{ ...root, title: rootTitle }, ...rest];
  const currentLevel = history[history.length - 1];

  const navigate = (item: MenuItem) => {
    dispatch({ type: "NAVIGATE", item });
  };

  const goBack = () => {
    dispatch({ type: "GO_BACK" });
  };

  const reset = () => {
    dispatch({ type: "RESET", items: menuItems, rootTitle });
  };

  return {
    currentLevel,
    direction: state.direction,
    canGoBack: history.length > 1,
    history,
    navigate,
    goBack,
    reset,
  };
}
