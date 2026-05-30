import { describe, expect, test, mock } from "bun:test";
import { render } from "@testing-library/react";
import React from "react";

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock(), back: mock() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

mock.module("next/image", () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement("img", { ...props, "data-testid": "next-image" }),
}));

const motionDiv = (props: Record<string, unknown>) => React.createElement("div", props);
const motionButton = (props: Record<string, unknown>) => React.createElement("button", props);

mock.module("framer-motion", () => ({
  motion: { div: motionDiv, button: motionButton, span: motionDiv },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock ClientIdProvider
mock.module("@/components/client-id-provider", () => ({
  ClientIdProvider: ({ children }: { children: React.ReactNode }) => children,
  useClientId: () => ({ clientId: "test-client-123", loading: false, displayName: "Test", setDisplayName: mock() }),
}));

mock.module("@/lib/api/request", () => ({
  request: mock().mockImplementation(() =>
    Promise.resolve(new Response(JSON.stringify({ id: 1, guestIds: ["chen", "leo"] }), { status: 201 }))
  ),
}));

const createIcon = (name: string) => () => React.createElement("svg", { "data-testid": `icon-${name}` });
mock.module("lucide-react", () => {
  const icons: Record<string, ReturnType<typeof createIcon>> = {};
  for (const n of ["AlertTriangle","ChevronRight","Plus","Check","Users"]) {
    icons[n] = createIcon(n.toLowerCase());
  }
  return icons;
});

import GuestSelectionPage from "@/app/page";

describe("GuestSelectionPage", () => {
  test("renders the page title", () => {
    const { container } = render(React.createElement(GuestSelectionPage));
    expect(container.innerHTML).toContain("组局邀约");
  });

  test("renders start button", () => {
    const { container } = render(React.createElement(GuestSelectionPage));
    expect(container.innerHTML).toContain("Start Party");
  });
});
