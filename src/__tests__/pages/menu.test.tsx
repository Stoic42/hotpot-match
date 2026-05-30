import { describe, expect, test, mock } from "bun:test";
import { render } from "@testing-library/react";
import React from "react";

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock(), back: mock() }),
  useSearchParams: () => new URLSearchParams("session=1"),
  usePathname: () => "/menu",
}));

const motionDiv = (props: Record<string, unknown>) => React.createElement("div", props);
const motionButton = (props: Record<string, unknown>) => React.createElement("button", props);

mock.module("framer-motion", () => ({
  motion: { div: motionDiv, button: motionButton },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

const createIcon = (name: string) => () => React.createElement("svg", { "data-testid": `icon-${name}` });
mock.module("lucide-react", () => ({
  X: createIcon("x"), Star: createIcon("star"), Check: createIcon("check"),
  AlertTriangle: createIcon("alert"),
}));

import MenuPrepPage from "@/app/menu/page";

describe("MenuPrepPage", () => {
  test("renders the pantry title", () => {
    const { container } = render(React.createElement(MenuPrepPage));
    expect(container.innerHTML).toContain("备菜区");
  });
});
