// State updates in Chromium (skipped without Chromium): Home Assistant sends a new hass on every state change of the
// instance, and a card rewritten at each one made the dashboard jump. Here every card gets 10 updates of an entity it
// does not show — no DOM mutation at all — then 10 updates of its own detectors (battery, CO level): the shadow DOM is
// patched in place (no element added or removed, the banner's picture and every tile are the same nodes), the card
// keeps its height on every frame, and a tile still opens its details once (its listener is not added again).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { makeHass, st } from "./hass.mjs";
import { sources } from "./source.mjs";

let harness;
try {
  harness = await import("../scripts/screenshots/harness.mjs");
} catch {}
const browser = await harness?.launch().catch(() => null);

// Home Assistant's <ha-card> is a Lit element: it renders its slot a few microtasks after it is attached, so that a
// card rewritten from scratch measured its header (the status pill) in an empty card and put the pill on a line of its
// own — the card grew or shrank at the update. A plain stand-in hides that; this one renders late, like Lit.
const STAND_INS = `customElements.define("ha-card", class extends HTMLElement { connectedCallback() { if (this.shadowRoot) return;
  const r = this.attachShadow({ mode: "open" });
  Promise.resolve().then(() => Promise.resolve()).then(() => { r.innerHTML = "<style>:host{display:block;overflow:hidden;background:#fff;border-radius:12px}</style><slot></slot>"; }); } });
customElements.define("ha-icon", class extends HTMLElement { connectedCallback() { this.style.cssText = "display:inline-block;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)"; } });`;
const open = async (width) => {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
  await page.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0;font-family:Arial,sans-serif;font-size:14px"><div id="root" style="width:${width}px"></div></body>`);
  await page.addScriptTag({ content: STAND_INS });
  await page.addScriptTag({ content: js });
  return page;
};

const src = (name) => (sources[`${name}.js`] ?? readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8"));
const js = ["{", src("shared"), ...["safety-card", "safety-overview-card"].map((c) => `{\n${src(c)}}\n`), "}"].join("\n");

const LONG = "Kitchen and dining room smoke";
const CASES = [
  { tag: "safety-mini-card", config: { area: "kitchen", illustration: false, title: LONG }, width: 300 },
  { tag: "safety-card", config: { area: "kitchen", title: LONG }, width: 300 },
  { tag: "safety-card", config: { area: "kitchen" } },
  { tag: "safety-mini-card", config: { area: "kitchen" } },
  { tag: "safety-mini-card", config: { area: "kitchen", illustration: false } },
  { tag: "safety-mini-card", config: { area: "kitchen" }, zoom: true },
  { tag: "safety-overview-card", config: {} },
];

const hass = makeHass();
delete hass.callService; // a function cannot reach the page
delete hass.calls;
hass.states["sensor.other"] = st("sensor.other", "0");
const battery = (n) => st("sensor.kitchen_battery", String(n), { device_class: "battery", unit_of_measurement: "%" });
const level = (n) => st("sensor.hall_co_level", String(n), { device_class: "carbon_monoxide", unit_of_measurement: "ppm" });
const unrelated = Array.from({ length: 10 }, (_, i) => ({ "sensor.other": st("sensor.other", String(i + 1)) }));
const relevant = Array.from({ length: 10 }, (_, i) => (i % 2 ? { "sensor.hall_co_level": level(3 + i) } : { "sensor.kitchen_battery": battery(19 - i) }));

test("state updates patch the cards in place: nothing for others' entities, no node replaced, a steady height", { skip: !browser && "no Chromium" }, async () => {
  const failures = [];
  try {
    for (const c of CASES) {
      const page = await open(c.width ?? 400);
      const out = await page.evaluate(
        async ({ c, hass, unrelated, relevant }) => {
          const frame = () => new Promise((r) => requestAnimationFrame(r));
          const res = [];
          let states = hass.states;
          let infos = 0;
          const el = document.createElement(c.tag);
          el.setConfig({ type: `custom:${c.tag}`, ...c.config });
          el.addEventListener("hass-more-info", () => infos++);
          const push = (patch) => {
            states = { ...states, ...patch };
            el.hass = { ...hass, states, themes: { darkMode: false }, callService: async () => {} };
          };
          push({});
          document.getElementById("root").replaceChildren(el);
          if (c.zoom) el.shadowRoot.querySelector(".zoom").dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 1 }));
          for (let i = 0; i < 4; i++) await frame();
          const r = el.shadowRoot;
          const nodes = [...r.querySelectorAll("*")];
          const height = el.getBoundingClientRect().height;
          const muts = [];
          new MutationObserver((l) => muts.push(...l)).observe(r, { subtree: true, childList: true, attributes: true, characterData: true });
          for (const p of unrelated) {
            push(p);
            await frame();
          }
          await new Promise((res) => setTimeout(res));
          if (muts.length) res.push(`${muts.length} mutations on updates of another entity`);
          const heights = new Set();
          for (const p of relevant) {
            push(p);
            for (let f = 0; f < 3; f++) {
              heights.add(Math.round(el.getBoundingClientRect().height * 10) / 10);
              await frame();
            }
          }
          await new Promise((res) => setTimeout(res));
          const changed = muts.filter((m) => m.type === "childList" && [...m.addedNodes, ...m.removedNodes].some((n) => n.nodeType === 1));
          if (changed.length) res.push(`${changed.length} element insertions/removals on updates of its own detectors`);
          const gone = nodes.filter((n) => !n.isConnected).map((n) => n.localName);
          if (gone.length) res.push(`nodes replaced: ${[...new Set(gone)].join(", ")}`);
          if (heights.size !== 1 || !heights.has(Math.round(height * 10) / 10)) res.push(`height moved: ${height} → ${[...heights].join(", ")}`);
          const tile = r.querySelector(".tile, .r");
          if (tile) {
            tile.click();
            if (infos !== 1) res.push(`one click opened the details ${infos} times`);
          }
          return res;
        },
        { c, hass, unrelated, relevant },
      );
      failures.push(...out.map((f) => `${c.tag}${c.zoom ? " zoomed" : ""} ${JSON.stringify(c.config)}: ${f}`));
      await page.close();
    }
  } finally {
    await browser?.close();
  }
  assert.deepEqual(failures, []);
});
