import { useState } from "react";
import { Menu } from "lucide-react";

import NestedMenuDrawer from "./components/NestedMenuDrawer";
import { menuData } from "./data/menuData";
import type { MenuItem } from "./types/menu.types";

const DRAWER_ID = "main-menu-drawer";

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuSelect = (item: MenuItem) => {
    console.log("Selected menu:", item.label, item.id);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4">
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? DRAWER_ID : undefined}
        className="
          inline-flex h-11 items-center gap-2 rounded-full
          bg-[#0083F7] pl-4 pr-5
          text-[15px] font-medium tracking-[-0.01em] text-white
          shadow-lg shadow-[#0083F7]/25
          transition-[background-color,box-shadow,transform] duration-200 ease-out
          [-webkit-tap-highlight-color:transparent]
          hover:-translate-y-px hover:bg-[#0074DB] hover:shadow-xl hover:shadow-[#0083F7]/30
          active:translate-y-0 active:scale-[0.97] active:bg-[#0065BF] active:shadow-md
          outline-none focus-visible:ring-2
          focus-visible:ring-[#0083F7] focus-visible:ring-offset-2
          disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400
          disabled:shadow-none disabled:hover:translate-y-0
        "
      >
        <Menu size={18} strokeWidth={2} aria-hidden="true" />
        Open Menu
      </button>

      <NestedMenuDrawer
        id={DRAWER_ID}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        menuItems={menuData}
        title="Main Menu"
        onSelect={handleMenuSelect}
      />
    </main>
  );
}

export default App;
