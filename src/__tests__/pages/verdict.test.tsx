import { describe, expect, test, mock } from "bun:test";
import { render } from "@testing-library/react";
import React from "react";

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock(), back: mock() }),
  useSearchParams: () => new URLSearchParams("session=1&cooked=3"),
  usePathname: () => "/verdict",
}));

const motionDiv = (props: Record<string, unknown>) => React.createElement("div", props);
mock.module("framer-motion", () => ({
  motion: { div: motionDiv, button: motionDiv, span: motionDiv, circle: motionDiv, svg: motionDiv },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

mock.module("@/components/client-id-provider", () => ({
  ClientIdProvider: ({ children }: { children: React.ReactNode }) => children,
  useClientId: () => ({ clientId: "test", loading: false, displayName: null, setDisplayName: mock() }),
}));

mock.module("@/lib/api/request", () => ({
  request: mock().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ guestIds: ["chen", "leo"] })))),
}));

const createIcon = (name: string) => () => React.createElement("svg", { "data-testid": `icon-${name}` });
mock.module("lucide-react", () => ({
  Share2: createIcon("share"), RotateCcw: createIcon("rotate"), Star: createIcon("star"),
  Check: createIcon("check"), AlertTriangle: createIcon("alert"),
}));

import VerdictPage from "@/app/verdict/page";

describe("VerdictPage", () => {
  test("renders loading state on mount", () => {
    const { container } = render(React.createElement(VerdictPage));
    expect(container.innerHTML).toContain("Printing verdict");
  });
});
