// Evaluates src/shared.js and the cards in a sandbox with minimal DOM stand-ins, the way scripts/build.mjs
// concatenates them, and returns the names the tests need. No dependency, no browser.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = new URL("../src/", import.meta.url);
const read = (name) => readFileSync(new URL(`${name}.js`, root), "utf8");

// Shadow root / element stand-in: enough for the cards' render and event wiring.
export const fakeNode = () => ({
  innerHTML: "",
  hidden: false,
  style: {},
  children: [],
  className: "",
  classList: { add() {}, remove() {}, toggle() {} },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
  // The last listener of each type, for the tests to call (the editors' value-changed).
  addEventListener(type, fn) {
    this.listeners ||= {};
    this.listeners[type] = fn;
  },
  appendChild(el) {
    this.children.push(el);
  },
});

export const load = () => {
  const registry = new Map();
  class HTMLElement {
    constructor() {
      this.style = {};
      this.isConnected = true;
    }
    attachShadow() {
      this.shadowRoot = fakeNode();
      return this.shadowRoot;
    }
    dispatchEvent() {}
  }
  const sandbox = {
    HTMLElement,
    CustomEvent: class {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    console: { info() {} },
    customElements: { get: (t) => registry.get(t), define: (t, c) => registry.set(t, c) },
    document: {
      createElement: (t) => (registry.has(t) ? new (registry.get(t))() : fakeNode()),
      addEventListener() {},
      removeEventListener() {},
    },
    history: { pushState() {} },
    // Looked up at each call, so a test's mock timers (t.mock.timers) apply.
    setTimeout: (...a) => globalThis.setTimeout(...a),
    clearTimeout: (id) => globalThis.clearTimeout(id),
  };
  // window-level listeners (Escape on the confirmation popup), fired by hand with window.fire(type, ev).
  const winListeners = {};
  sandbox.addEventListener = (type, fn) => (winListeners[type] ||= new Set()).add(fn);
  sandbox.removeEventListener = (type, fn) => winListeners[type]?.delete(fn);
  sandbox.fire = (type, ev) => {
    for (const fn of winListeners[type] || []) fn(ev);
  };
  // Interval timers (the safety card's minute clock) are kept, not run: fired by hand with window.tick().
  const intervals = new Map();
  let nextInterval = 0;
  sandbox.setInterval = (fn) => {
    intervals.set(++nextInterval, fn);
    return nextInterval;
  };
  sandbox.clearInterval = (id) => intervals.delete(id);
  sandbox.tick = () => {
    for (const fn of intervals.values()) fn();
  };
  sandbox.intervals = intervals;
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  const cards = ["safety-card", "safety-overview-card"];
  // One script per source file, named after it, so that coverage is reported per file; the cards' blocks see
  // shared.js's top-level names (scripts of one context share their global lexical scope), as in the bundle.
  // A card's block starts on the file's own first line, so that coverage lines match the source.
  vm.runInContext(read("shared"), ctx, { filename: fileURLToPath(new URL("shared.js", root)) });
  for (const c of cards) vm.runInContext(`{${read(c)}}\n`, ctx, { filename: fileURLToPath(new URL(`${c}.js`, root)) });
  return vm.runInContext(
    `({ RcCard, RC_I18N, SC_I18N, rcLang, scRead, scDetectors, scAlarmKind, customElements, window,
       cards: Object.fromEntries(${JSON.stringify([...cards, "safety-mini-card"])}.map((t) => [t, customElements.get(t)])) })`,
    ctx,
  );
};
