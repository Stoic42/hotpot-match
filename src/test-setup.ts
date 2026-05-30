// Set test env vars before any module imports
process.env.DEEPSEEK_API_KEY = "sk-test-key-for-unit-tests";

import { afterEach, beforeAll } from "bun:test";
import "@testing-library/jest-dom";

// Set up DOM environment using happy-dom for @testing-library/react
import { Window } from "happy-dom";

let happyWindow: InstanceType<typeof Window>;
let happyDocument: Document;

beforeAll(() => {
  happyWindow = new Window();
  happyDocument = happyWindow.document;

  Object.assign(globalThis, {
    window: happyWindow,
    document: happyDocument,
    HTMLElement: happyWindow.HTMLElement,
    HTMLDivElement: happyWindow.HTMLDivElement,
    HTMLSpanElement: happyWindow.HTMLSpanElement,
    HTMLButtonElement: happyWindow.HTMLButtonElement,
    HTMLInputElement: happyWindow.HTMLInputElement,
    HTMLImageElement: happyWindow.HTMLImageElement,
    SVGElement: happyWindow.SVGElement,
    Element: happyWindow.Element,
    Node: happyWindow.Node,
    Event: happyWindow.Event,
    CustomEvent: happyWindow.CustomEvent,
    MouseEvent: happyWindow.MouseEvent,
    getComputedStyle: happyWindow.getComputedStyle.bind(happyWindow),
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number,
    cancelAnimationFrame: clearTimeout as unknown as (handle: number) => void,
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    IntersectionObserver: class {
      observe() {} unobserve() {} disconnect() {}
      root = null; rootMargin = ""; thresholds = [];
      takeRecords = () => [];
    },
    matchMedia: () => ({
      matches: false, media: "", onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  if (happyDocument) happyDocument.body.innerHTML = "";
});
