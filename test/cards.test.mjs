import assert from "node:assert/strict";
import { test } from "node:test";
import { makeHass, st, withAlarm } from "./hass.mjs";
import { fakeNode, load } from "./load.mjs";

const sc = load();
const { cards } = sc;

// A card whose shadow root answers every selector (the overview builds its frame once, then fills it).
const make = (tag, config, hass = makeHass()) => {
  const card = new cards[tag]();
  card.attachShadow();
  // Every node answers its own selectors with nodes of the same kind.
  const node = () => {
    const n = fakeNode();
    n.style = { setProperty() {} };
    const kids = {};
    n.querySelector = (s) => (kids[s] ||= node());
    return n;
  };
  const nodes = {};
  card.shadowRoot.querySelector = (s) => (s === "ha-card" && !card.shadowRoot.innerHTML ? null : (nodes[s] ||= node()));
  card.setConfig({ type: `custom:${tag}`, ...config });
  card.hass = hass;
  return card;
};
const html = (card) => card.shadowRoot.innerHTML;

test("the three cards are registered, with their editors and a picker entry", () => {
  for (const tag of ["safety-card", "safety-mini-card", "safety-overview-card"]) {
    assert.ok(sc.customElements.get(tag), tag);
    assert.ok(sc.customElements.get(`${tag}-editor`), `${tag}-editor`);
  }
  assert.deepEqual([...sc.window.customCards.map((c) => c.type)].sort(), ["safety-card", "safety-mini-card", "safety-overview-card"]);
  assert.ok(sc.window.customCards.every((c) => c.documentationURL === "https://github.com/juju35/ha-safety-card"));
});

test("discovery: one detector per device, alarm sensors only, diagnostic and other entities left out", () => {
  const card = make("safety-card", {});
  const ids = [...card._items.map((i) => i.id)].sort();
  assert.deepEqual(ids, ["binary_sensor.bed_smoke", "binary_sensor.garage_co", "binary_sensor.hall_co", "binary_sensor.kitchen_smoke", "binary_sensor.living_smoke"]);
  const kitchen = card._items.find((i) => i.area === "kitchen");
  assert.equal(kitchen.state.startsWith("Smoke + Gas"), true, kitchen.state);
});

test("water leak: a moisture detector is an alarm kind, in alarm when wet", () => {
  const h = makeHass();
  h.areas.bathroom = { area_id: "bathroom", name: "Bathroom" };
  h.devices.d_bath = { area_id: "bathroom", name: "Bathroom leak" };
  h.entities["binary_sensor.bath_leak"] = { device_id: "d_bath" };
  h.states["binary_sensor.bath_leak"] = st("binary_sensor.bath_leak", "on", { device_class: "moisture", friendly_name: "Bathroom leak" }, new Date().toISOString());
  const dry = make("safety-card", {}, h);
  const d = dry._items.find((i) => i.id === "binary_sensor.bath_leak");
  assert.ok(d, "leak detector discovered");
  assert.equal(d.level, "alert");
  assert.equal(d.state, "Water leak · just now");
  assert.equal(d.icon, "mdi:water-alert");
  // Quiet, it shows its own kind and icon.
  h.states["binary_sensor.bath_leak"] = st("binary_sensor.bath_leak", "off", { device_class: "moisture", friendly_name: "Bathroom leak" });
  const ok = make("safety-card", {}, h)._items.find((i) => i.id === "binary_sensor.bath_leak");
  assert.equal(ok.state, "Leak · OK");
  assert.equal(ok.icon, "mdi:water-check");
});

test("maintenance: battery under the threshold, end of life, CO level, test and silence buttons", () => {
  const card = make("safety-card", {});
  const by = (area) => card._items.find((i) => i.area === area);
  assert.equal(by("kitchen").level, "warn");
  assert.equal(by("kitchen").state, "Smoke + Gas · Battery 18%");
  assert.equal(by("kitchen").test, "button.kitchen_self_test");
  assert.equal(by("kitchen").silence, "button.kitchen_silence");
  assert.equal(by("bedroom").state, "Smoke · Replace soon");
  assert.equal(by("hallway").state, "CO · 2 ppm");
  assert.equal(by("living").state, "Smoke · OK");
  // A lower threshold: 18 % is fine.
  const low = make("safety-card", { battery_threshold: 15 });
  assert.equal(low._items.find((i) => i.area === "kitchen").level, "ok");
});

test("status: all clear, then the count to check, then the alarm with its room", () => {
  const h = makeHass();
  h.states["sensor.kitchen_battery"] = st("sensor.kitchen_battery", "80", { device_class: "battery" });
  h.states["binary_sensor.bed_end_of_life"] = st("binary_sensor.bed_end_of_life", "off", { device_class: "problem" });
  assert.equal(make("safety-card", {}, h)._summary(make("safety-card", {}, h)._items).status, "All clear");
  const warn = make("safety-card", {});
  assert.equal(warn._summary(warn._items).status, "2 to check");
  const alarm = make("safety-card", {}, withAlarm());
  const s = alarm._summary(alarm._items);
  assert.equal(s.level, "alert");
  assert.equal(s.status, "Smoke detected · Kitchen");
  // In a room, the room is the card's title already.
  const room = make("safety-card", { area: "kitchen" }, withAlarm());
  assert.equal(room._summary(room._items).status, "Smoke detected");
});

test("alarm: first, with a banner, its silence button and no test button", () => {
  const card = make("safety-card", {}, withAlarm());
  assert.equal(card._items[0].area, "kitchen");
  assert.equal(card._items[0].state, "Smoke detected · 2 min");
  const out = html(card);
  assert.match(out, /class="banner" role="alert"/);
  assert.match(out, /act-silence/);
  assert.doesNotMatch(out, /class="act act-test/);
  assert.match(out, /lvl-alert/);
  // banner: false leaves only the tiles.
  assert.doesNotMatch(html(make("safety-card", { banner: false }, withAlarm())), /class="banner"/);
});

test("test button: shown when a detector has one, armed by a first tap, runs every test on the second", () => {
  const h = makeHass();
  const card = make("safety-card", {}, h);
  assert.match(html(card), /class="act act-test/);
  assert.doesNotMatch(html(make("safety-card", { test_button: false }, h)), /class="act act-test/);
  let handler;
  card.shadowRoot.querySelector = (sel) => (sel === ".act-test" ? { addEventListener: (_, fn) => (handler = fn) } : null);
  card._bindAfter(card.shadowRoot);
  handler();
  assert.equal(card._armed, true);
  assert.equal(h.calls.length, 0, "a first tap only arms");
  handler();
  assert.equal(JSON.stringify(h.calls), JSON.stringify([["button", "press", { entity_id: ["button.kitchen_self_test"] }]]));
  clearTimeout(card._armTimer);
});

test("names: the room for the whole home, the device in a room", () => {
  const home = make("safety-card", {});
  assert.equal(home._items.find((i) => i.area === "living").name, "Living room");
  const room = make("safety-card", { area: "living" });
  assert.equal(room._items.length, 1);
  assert.equal(room._items[0].name, "Smoke detector");
});

test("only_alerts and hide_when_clear", () => {
  const only = make("safety-card", { only_alerts: true });
  assert.equal(only._shown, 2);
  const h = makeHass();
  h.states["sensor.kitchen_battery"] = st("sensor.kitchen_battery", "80", { device_class: "battery" });
  h.states["binary_sensor.bed_end_of_life"] = st("binary_sensor.bed_end_of_life", "off", { device_class: "problem" });
  assert.equal(make("safety-card", { hide_when_clear: true }, h).style.display, "none");
});

test("an unavailable detector needs a look", () => {
  const h = makeHass();
  h.states["binary_sensor.garage_co"] = st("binary_sensor.garage_co", "unavailable", { device_class: "carbon_monoxide" });
  const g = make("safety-card", {}, h)._items.find((i) => i.area === "garage");
  assert.equal(g.level, "warn");
  assert.equal(g.state, "CO · Unavailable");
});

test("mini card: only what needs a look as chips, the alarm in red", () => {
  const mini = make("safety-mini-card", {}, withAlarm());
  const out = html(mini);
  assert.match(out, /class="r pill alert" data-id="binary_sensor.kitchen_smoke"/);
  assert.match(out, /class="r pill warn"/);
  assert.doesNotMatch(out, /binary_sensor.living_smoke/);
  assert.equal(mini._config.zoom, true);
});

test("overview: rooms needing a look first, all of them once zoomed", () => {
  const ov = make("safety-overview-card", {});
  assert.deepEqual([...ov._rooms.map((x) => x.id)], ["bedroom", "kitchen"]);
  assert.equal(ov._roomState(ov._rooms.find((x) => x.id === "kitchen")), "Battery 18%");
  ov._zoomed = true;
  ov._sig = null;
  ov._render();
  assert.equal(ov._rooms.length, 5);
  const alarm = make("safety-overview-card", {}, withAlarm());
  assert.equal(alarm._rooms[0].id, "kitchen");
  assert.equal(alarm._roomState(alarm._rooms[0]), "Smoke detected");
});

test("overview: exclude_areas and a room override", () => {
  const ov = make("safety-overview-card", { zoom: false, exclude_areas: ["garage"], rooms: [{ area: "hallway", name: "Entrance" }] });
  assert.ok(!ov._rooms.some((x) => x.id === "garage"));
  assert.equal(ov._rooms.find((x) => x.id === "hallway").name, "Entrance");
});

test("editors: defaults stay out of the YAML", () => {
  const ed = new (sc.customElements.get("safety-card-editor"))();
  ed.appendChild = () => {};
  ed.setConfig({ type: "custom:safety-card" });
  ed.hass = makeHass();
  const form = ed._form;
  assert.ok(form.schema.some((f) => f.name === "battery_threshold"));
  let out;
  ed.dispatchEvent = (ev) => (out = ev.detail.config);
  form.listeners["value-changed"]({ detail: { value: { type: "custom:safety-card", battery_threshold: 20, banner: true, title: "" } } });
  assert.deepEqual({ ...out }, { type: "custom:safety-card" });
});

test("translations: every language has every key of English, with the same placeholders", () => {
  const LANGS = ["en", "fr", "de", "es", "sr", "sr-Latn", "it", "nl", "pt", "pl", "ro", "da", "sv", "bg", "ru", "uk", "hu", "sk", "cs", "sl", "lv", "el"];
  const vars = (s) => s.match(/\{\w+\}/g)?.sort() ?? [];
  for (const [name, table] of [["shared", sc.RC_I18N], ["safety", sc.SC_I18N]]) {
    assert.deepEqual([...Object.keys(table)], LANGS, name);
    const ref = [...Object.keys(table.en)].sort();
    for (const lang of LANGS) {
      const keys = Object.keys(table[lang]).filter((k) => !["open_f", "closed_f"].includes(k) && !k.endsWith("_few"));
      assert.deepEqual([...keys].sort(), [...ref], `${name}.${lang}`);
      for (const k of ref) assert.deepEqual([...vars(table[lang][k])], [...vars(table.en[k])], `${name}.${lang}.${k}`);
    }
  }
  const fr = make("safety-card", { language: "fr" });
  assert.equal(fr._items.find((i) => i.area === "kitchen").state, "Fumée + Gaz · Pile 18 %");
});

test("editors: every field has a label, and every helper listed has its text", () => {
  const flat = (schema) => schema.flatMap((f) => (f.schema ? flat(f.schema) : [f]));
  for (const tag of ["safety-card", "safety-mini-card", "safety-overview-card"]) {
    const ed = new (sc.customElements.get(`${tag}-editor`))();
    ed.appendChild = () => {};
    ed.setConfig({ type: `custom:${tag}`, exclude: ["binary_sensor.garage_co"] });
    ed.hass = makeHass();
    for (const f of flat(ed._form.schema)) {
      const label = ed._form.computeLabel(f);
      assert.notEqual(label, `ed_${f.name}`, `${tag}: no label for ${f.name}`);
      const helper = ed._form.computeHelper(f);
      if (helper !== undefined) assert.notEqual(helper, `ed_${f.name}_helper`, `${tag}: no helper text for ${f.name}`);
    }
  }
});

test("whole home: a state change keeps the list of detectors, a new state still shows", () => {
  const h = makeHass();
  const card = make("safety-card", {}, h);
  const before = card._items.length;
  const first = card._items[0].id;
  // A new hass with new states but the same registry: the list is not rebuilt, the states are read again.
  const next = { ...h, states: { ...h.states, [first]: { ...h.states[first], state: "on" } } };
  card.hass = next;
  assert.equal(card._items.length, before);
  assert.equal(card._items.find((i) => i.id === first).level, "alert");
});

test("whole home and overview: a detector whose state arrives late still shows", () => {
  const h = makeHass();
  const late = h.states["binary_sensor.hall_co"];
  const early = { ...h, states: { ...h.states } };
  delete early.states["binary_sensor.hall_co"];
  for (const tag of ["safety-card", "safety-overview-card"]) {
    const card = make(tag, {}, early);
    const count = () => (tag === "safety-card" ? card._items.length : card._all.flatMap((x) => x.dets).length);
    const before = count();
    card.hass = { ...early, states: { ...early.states, "binary_sensor.hall_co": late } };
    assert.equal(count(), before + 1, tag);
  }
});

test("overview: a second active alarm of a combined detector redraws the header", () => {
  const h = makeHass();
  const card = make("safety-overview-card", {}, h);
  const on = (states, id) => ({ ...states, [id]: { ...states[id], state: "on" } });
  const gas = on(h.states, "binary_sensor.kitchen_gas");
  card.hass = { ...h, states: gas };
  card.hass = { ...h, states: on(gas, "binary_sensor.kitchen_smoke") };
  const fresh = make("safety-overview-card", {}, { ...h, states: on(gas, "binary_sensor.kitchen_smoke") });
  const head = (c) => c.shadowRoot.querySelector("ha-card").querySelector(".top").innerHTML.replace(/sc-(glow|fadeg|fade)-\d+/g, "sc-$1");
  assert.match(head(fresh), /Smoke detected/);
  assert.equal(head(card), head(fresh));
});

test("overview: excluding one alarm sensor of a combined detector excludes it, the picker lists every one", () => {
  const h = makeHass();
  const card = make("safety-overview-card", { exclude: ["binary_sensor.kitchen_smoke"] }, h);
  assert.ok(!card._all.some((x) => x.dets.some((d) => d.ids.includes("binary_sensor.kitchen_gas"))));
  const ed = new (sc.customElements.get("safety-overview-card-editor"))();
  ed.appendChild = () => {};
  ed.setConfig({ type: "custom:safety-overview-card" });
  ed.hass = h;
  const flat = (schema) => schema.flatMap((f) => (f.schema ? flat(f.schema) : [f]));
  const field = JSON.stringify(flat(ed._form.schema).filter((f) => f.name === "exclude"));
  assert.match(field, /kitchen_smoke/);
  assert.match(field, /kitchen_gas/);
});

test("reduced motion: the blinking alarm icons stop", () => {
  const css = [cards["safety-card"].styles, cards["safety-overview-card"].styles].join("");
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.tile\.alert \.ic/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.room\.lvl-alert \.ic/);
});

test("overview: a detector with no room still counts, in an Other tile", () => {
  const h = makeHass();
  h.entities["binary_sensor.attic_smoke"] = {};
  h.states["binary_sensor.attic_smoke"] = st("binary_sensor.attic_smoke", "on", { device_class: "smoke", friendly_name: "Attic smoke" });
  const ov = make("safety-overview-card", {}, h);
  const other = ov._all.find((x) => x.id === "_other");
  assert.ok(other, "an Other tile");
  assert.equal(other.name, "Other");
  assert.equal(other.level, "alert");
  assert.match(ov.shadowRoot.querySelector("ha-card").querySelector(".top").innerHTML, /Smoke detected/);
});

test("no detector: grey, a neutral shield, no zoom", () => {
  const h = makeHass();
  h.entities = {};
  h.states = {};
  const card = make("safety-card", {}, h);
  assert.equal(card._summary(card._items).level, "none");
  const ov = make("safety-overview-card", {}, h);
  assert.doesNotMatch(ov.shadowRoot.querySelector("ha-card").querySelector(".top").innerHTML, /class="zoom"/);
});

test("the alarm banner is announced once, not at each minute's redraw", () => {
  const card = make("safety-card", {}, withAlarm());
  assert.match(html(card), /class="banner" role="alert"/);
  card._sig = null;
  card._render();
  assert.match(html(card), /class="banner" role="group"/);
});

test("the action buttons keep the keyboard focus through a redraw (data-k)", () => {
  const card = make("safety-card", {}, withAlarm());
  assert.match(html(card), /act-silence" data-k="silence"|act-details" data-k="details"/);
});

test("night picture: the dark theme alone, a light theme stays day after sunset; illustration_theme wins", () => {
  const sky = (state, darkMode = false) => {
    const h = makeHass({ themes: { darkMode } });
    h.states = { ...h.states, "sun.sun": st("sun.sun", state) };
    return h;
  };
  for (const tag of ["safety-card", "safety-mini-card"]) {
    assert.equal(make(tag, {}, sky("above_horizon", true))._night(), true, `${tag}: dark theme by day`);
    assert.equal(make(tag, {}, sky("above_horizon"))._night(), false, `${tag}: light theme by day`);
    assert.equal(make(tag, {}, sky("below_horizon"))._night(), false, `${tag}: light theme after sunset`);
    assert.equal(make(tag, {}, sky("unavailable", true))._night(), true, `${tag}: unknown sun, dark theme`);
    assert.equal(make(tag, { illustration_theme: "day" }, sky("below_horizon", true))._night(), false, `${tag}: forced day`);
    assert.equal(make(tag, { illustration_theme: "night" }, sky("above_horizon"))._night(), true, `${tag}: forced night`);
  }
});

// Hidden cards drop their slot in a sections view: hui-card reads `hidden` on card-visibility-changed, and keeps the
// card in the DOM (connectedWhileHidden) so that it shows again on its own; never hidden in the editor preview.
const clearHass = () => {
  const h = makeHass();
  h.states["sensor.kitchen_battery"] = st("sensor.kitchen_battery", "80", { device_class: "battery" });
  h.states["binary_sensor.bed_end_of_life"] = st("binary_sensor.bed_end_of_life", "off", { device_class: "problem" });
  return h;
};
const watchVisibility = (card) => {
  const seen = [];
  card.dispatchEvent = (ev) => {
    if (ev.type === "card-visibility-changed") seen.push(ev.detail.value);
  };
  return seen;
};

test("hide_when_clear sets `hidden`, tells Lovelace and stays connected; an alarm shows the card again", () => {
  for (const tag of ["safety-card", "safety-mini-card"]) {
    const card = new cards[tag]();
    assert.equal(card.connectedWhileHidden, true, tag);
    const seen = watchVisibility(card);
    card.attachShadow();
    card.setConfig({ type: `custom:${tag}`, hide_when_clear: true });
    card.hass = clearHass();
    assert.equal(card.hidden, true, tag);
    assert.equal(card.style.display, "none", tag);
    assert.equal(card.connectedWhileHidden, true, tag);
    assert.equal(card.getCardSize(), 0, tag);
    const h = clearHass();
    h.states["binary_sensor.kitchen_smoke"] = st("binary_sensor.kitchen_smoke", "on", { device_class: "smoke" });
    card.hass = h;
    assert.equal(card.hidden, false, tag);
    assert.equal(card.style.display, "", tag);
    assert.deepEqual([...seen], [false, true], tag);
  }
});

test("hide_when_clear hides the overview while every detector is fine, and an alarm shows it again", () => {
  const card = make("safety-overview-card", { hide_when_clear: true }, clearHass());
  const seen = watchVisibility(card);
  assert.equal(card.hidden, true);
  assert.equal(card.style.display, "none");
  assert.equal(card.connectedWhileHidden, true);
  assert.equal(card.getCardSize(), 0);
  const h = clearHass();
  h.states["binary_sensor.kitchen_smoke"] = st("binary_sensor.kitchen_smoke", "on", { device_class: "smoke" });
  card.hass = h;
  assert.equal(card.hidden, false);
  assert.equal(card.style.display, "");
  assert.deepEqual([...seen], [true]);
  card.hass = clearHass();
  assert.equal(card.hidden, true);
  card.preview = true;
  assert.equal(card.hidden, false);
});

for (const flag of ["preview", "editMode"]) {
  test(`hide_when_clear never hides the card in ${flag}`, () => {
    const card = new cards["safety-card"]();
    const seen = watchVisibility(card);
    card.attachShadow();
    card.setConfig({ type: "custom:safety-card", hide_when_clear: true });
    card.hass = clearHass();
    assert.equal(card.hidden, true);
    card[flag] = true;
    assert.equal(card[flag], true);
    assert.equal(card.hidden, false);
    assert.ok(card.getCardSize() > 0);
    card[flag] = false;
    assert.equal(card.hidden, true);
    assert.deepEqual([...seen], [false, true, false]);
  });
}
