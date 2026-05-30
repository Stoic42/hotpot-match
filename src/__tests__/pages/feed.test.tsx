import { describe, expect, test, mock } from "bun:test";
import { render } from "@testing-library/react";
import React from "react";

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock(), back: mock() }),
  useSearchParams: () => new URLSearchParams("session=1"),
  usePathname: () => "/feed",
}));

const motionDiv = (props: Record<string, unknown>) => React.createElement("div", props);

mock.module("framer-motion", () => ({
  motion: { div: motionDiv, button: motionDiv, span: motionDiv },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

mock.module("@/components/client-id-provider", () => ({
  ClientIdProvider: ({ children }: { children: React.ReactNode }) => children,
  useClientId: () => ({ clientId: "test-client", loading: false, displayName: null, setDisplayName: mock() }),
}));

mock.module("@/lib/api/request", () => ({
  request: mock().mockImplementation(() => Promise.resolve(new Response(JSON.stringify([])))),
}));

const createIcon = (name: string) => () => React.createElement("svg", { "data-testid": `icon-${name}` });
mock.module("lucide-react", () => {
  const icons: Record<string, ReturnType<typeof createIcon>> = {};
  for (const n of ["ChevronLeft","MoreVertical","MessageCircle","Pause","Play","Coffee","Zap","AlertTriangle","Flame"]) {
    icons[n] = createIcon(n.toLowerCase());
  }
  return icons;
});

import MainFeedPage from "@/app/feed/page";

describe("MainFeedPage", () => {
  test("renders feed page header after auth", () => {
    const { container } = render(React.createElement(MainFeedPage));
    // After loading, should show the feed header (not the "Initializing" state)
    expect(container.innerHTML).not.toContain("Initializing");
    expect(container.innerHTML).toContain("火锅纪");
  });
});
