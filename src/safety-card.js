/**
 * safety-card / safety-mini-card: the smoke, carbon monoxide, gas and water leak detectors of a room, or of the whole home. Alarms come
 * first, with a banner; then what needs a look (battery, end of life, fault, unavailable); then the quiet ones.
 * https://github.com/juju35/ha-safety-card
 */

// ── Card ─────────────────────────────────────────────────────────────────────
class SafetyCard extends RcCard {
  static tag = "safety-card";
  static i18n = SC_I18N;
  static includeDomains = ["binary_sensor"];
  static includeMatch = (hass, id) => !!scAlarmKind(hass, id);
  static defaults = {
    columns: 2,
    only_alerts: false,
    hide_when_clear: false,
    banner: true,
    test_button: true,
    blink: true,
    battery_threshold: 20,
    illustration: true,
    illustration_theme: "auto",
    exclude: [],
  };

  // Without an area, the whole home.
  static getStubConfig() {
    return {};
  }

  _candidate(id) {
    return !!scAlarmKind(this._hass, id);
  }

  // The configured `entities`, or the detectors of the area; without an area, every detector of the home (minus
  // `exclude`, plus `include`).
  _entries() {
    const h = this._hass;
    const c = this._config;
    if (c.entities?.length || c.area) return super._entries();
    // The registry scan is kept until the config or the registry changes; whether an entity is a detector reads its
    // state, checked at each render so that a detector whose state arrives late still shows.
    const ids = rcMemo((this._memo ||= {}), "home", [c, h.entities], () => {
      const exclude = new Set(c.exclude || []);
      return Object.keys(h.entities || {}).filter((id) => id.startsWith("binary_sensor.") && !exclude.has(id) && !h.entities[id].hidden && !h.entities[id].entity_category);
    }).filter((id) => this._candidate(id));
    const include = (c.include || []).map((e) => (typeof e === "string" ? { entity: e } : e)).filter((e) => h.states[e.entity]);
    const seen = new Set(ids);
    return [...ids.map((entity) => ({ entity })), ...include.filter((e) => !seen.has(e.entity))];
  }

  // The "since" of an alarm moves with the clock: redrawn every minute while the card is shown (the signature skips the
  // redraw when no label changed; never during a press).
  connectedCallback() {
    super.connectedCallback?.();
    clearInterval(this._clock);
    this._clock = setInterval(() => {
      if (!this._pressing) this._render();
    }, 60000);
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    clearInterval(this._clock);
    this._clock = null;
    clearTimeout(this._armTimer);
    this._armed = false;
  }

  // A detector's name: in a room, the device's (without the room's name); for the whole home, the room's, with the
  // device's when the room has several detectors.
  _name(d, areaName, perArea) {
    const device = rcCleanName(scDeviceName(this._hass, d), areaName, /^\s+/, /\s+$/);
    if (this._config.area || !areaName) return device || this._kinds(d);
    return perArea[d.area] > 1 && device ? `${areaName} · ${device}` : areaName;
  }

  _kinds(d) {
    return [...new Set(d.alarms.map((a) => a.kind))].map((k) => this._t(`k_${k}`)).join(" + ");
  }

  _stateText(d, r) {
    if (r.active.length) return `${this._t(rcTopAlert(r.active.map((a) => a.kind)))} · ${scAgo(this, r.since)}`;
    if (r.level === "warn") {
      const key = scWarnKey(r);
      const text = key === "battery" ? (r.battery != null ? this._t("battery_pct", { n: Math.round(r.battery) }) : this._t("battery_low")) : this._t(key);
      return `${this._kinds(d)} · ${text}`;
    }
    return `${this._kinds(d)} · ${r.ppm != null ? `${Math.round(r.ppm)} ppm` : this._t("ok")}`;
  }

  _collect() {
    const h = this._hass;
    const c = this._config;
    const entries = this._entries();
    const names = new Map(entries.filter((e) => e.name).map((e) => [e.entity, e]));
    const dets = scDetectors(this, entries.map((e) => e.entity));
    const perArea = {};
    for (const d of dets) perArea[d.area] = (perArea[d.area] || 0) + 1;
    const rank = { alert: 2, warn: 1, ok: 0 };
    return dets
      .map((d) => {
        const r = scRead(h, d, Number(c.battery_threshold) || 20);
        const areaName = h.areas?.[d.area]?.name;
        const own = names.get(d.alarms[0].id);
        const top = rcTopAlert(r.active.map((a) => a.kind));
        const icon = r.active.length
          ? RC_ALERT_KINDS[top].on
          : r.level === "warn"
            ? SC_WARN_ICONS[scWarnKey(r)]
            : SC_KIND_ICONS[d.alarms[0].kind];
        return {
          ...r,
          id: (r.active[0] || d.alarms[0]).id,
          kinds: [...new Set(d.alarms.map((a) => a.kind))],
          top,
          on: r.level !== "ok",
          unavailable: false,
          area: d.area,
          areaName: areaName || "",
          name: own?.name ?? this._name(d, areaName, perArea),
          icon: own?.icon ?? icon,
          state: this._stateText(d, r),
        };
      })
      .sort((a, b) => rank[b.level] - rank[a.level] || a.name.localeCompare(b.name));
  }

  // State of the detectors, shared by the full and the mini card: an alarm names the status (and its room on a home-wide
  // card), then the count of detectors needing a look, then all clear.
  _summary(items) {
    const alarms = items.filter((i) => i.level === "alert");
    const warn = items.filter((i) => i.level === "warn").length;
    const top = rcTopAlert(alarms.flatMap((i) => i.active.map((a) => a.kind)));
    const alarm = this._t(top);
    let status;
    if (alarms.length) status = this._config.area || !alarms[0].areaName ? alarm : this._t("alarm_in", { alarm, room: alarms[0].areaName });
    else if (warn) status = this._tn("check", warn);
    else status = this._t(items.length ? "all_clear" : "no_detectors");
    return {
      alarms,
      top,
      // No detector: grey and a neutral shield, not a reassuring green check.
      level: alarms.length ? "alert" : warn ? "warn" : items.length ? "ok" : "none",
      icon: alarms.length ? RC_ALERT_KINDS[top].on : warn ? "mdi:shield-alert-outline" : items.length ? "mdi:shield-check-outline" : "mdi:shield-outline",
      status,
    };
  }

  // The summary and the detectors to draw, or null when nothing changed since `parts` were last drawn or the card hides.
  _visible(items, parts) {
    const c = this._config;
    const sum = this._summary(items);
    if (!this._changed(parts)) return null;
    if (this._hide(c.hide_when_clear && sum.level === "ok")) return null;
    const shown = c.only_alerts ? items.filter((i) => i.level !== "ok") : items;
    this._shown = shown.length;
    return { ...sum, shown };
  }

  _parts(items) {
    return items.map((i) => [i.id, i.level, i.name, i.icon, i.state]);
  }

  _draw(items) {
    const c = this._config;
    const v = this._visible(items, [this._armed, this._parts(items), this._night()]);
    if (!v) return;
    if (!v.alarms.length) this._announced = null;
    const tiles = v.shown.map((i) => this._tile(i, { cls: ` ${i.level}`, state: rcEsc(i.state) })).join("");
    const title = c.title || this._areaName() || this._t("title");
    const head = this._illustrated() ? this._hero(v, items, title) : this._head({ icon: v.icon, title, status: v.status });
    this._paint(v.level, head + (c.banner !== false ? this._banner(v.alarms) : ""), tiles, `${c.blink === false ? " no-blink" : ""}${this._illustrated() ? " ill" : ""}`);
  }

  // The illustrated header is on unless `illustration: false` (the classic header then).
  _illustrated() {
    return this._config.illustration !== false;
  }

  // Night picture or not, part of the redraw signature (the theme can change while the card is shown); null without a picture.
  _night() {
    return this._illustrated() ? scIsNight(this._hass, this._config) : null;
  }

  // The banner: the hallway for the state of the home, the icon (coloured by the status) with the title and the status
  // on the wall at its left. Its `.head` is the navigation target, like the classic header.
  _hero(v, items, title) {
    const c = this._config;
    const nav = c.navigation_path;
    this._uid ??= ++scUidNext;
    const scene = scSceneState(v, items);
    const warn = items.find((i) => i.level === "warn")?.kinds[0];
    // The status pill after the title: the alarm alone, the count to check or all clear; the subtitle names the
    // detectors (their room on a home-wide card) sounding or needing a look.
    const pill = v.alarms.length ? this._t(v.top) : v.status;
    const named = v.alarms.length ? v.alarms : items.filter((i) => i.level === "warn");
    const sub = [...new Set(named.map((i) => i.name))].join(", ");
    return `
      <div class="hero sc-${scene}${this._night() ? " night" : ""}">
        ${scSceneSvg(scene, this._uid, scKindsOf(items), warn)}
        <div class="ground" aria-hidden="true"></div>
        <div class="head htext${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}>
          <div class="badge" title="${rcEsc(v.status)}"><ha-icon icon="${rcEsc(v.icon)}"></ha-icon></div>
          <div class="titles">
            <div class="trow"><div class="title">${rcEsc(title)}</div><span class="hpill" title="${rcEsc(v.status)}" aria-label="${rcEsc(v.status)}"><span class="dot"></span><span class="pt">${rcEsc(pill)}</span></span></div>
            ${sub ? `<div class="sub" title="${rcEsc(sub)}">${rcEsc(sub)}</div>` : ""}
          </div>
        </div>
      </div>`;
  }

  // The alarm, large, under the header: what and where, since when, the other detectors sounding, and its actions.
  _banner(alarms) {
    if (!alarms.length) return "";
    const first = alarms[0];
    // In a room, the room is the title already: the detectors' names say where.
    const place = (i) => (this._config.area ? i.name : i.areaName || i.name);
    const where = [place(first), scAgo(this, first.since)];
    const others = alarms.slice(1).map(place);
    if (others.length) where.push(this._t("also", { list: [...new Set(others)].join(", ") }));
    const silence = alarms.some((i) => i.silence)
      ? `<button class="act act-silence" data-k="silence"><ha-icon icon="mdi:volume-off"></ha-icon><span>${rcEsc(this._t("silence"))}</span></button>`
      : "";
    // Announced when the alarm starts or changes, not again at each redraw (the "since" moves every minute).
    const key = JSON.stringify(alarms.map((i) => [i.id, i.top]));
    const announce = key !== this._announced;
    this._announced = key;
    return `
      <div class="banner"${announce ? ' role="alert"' : ' role="group"'} aria-label="${rcEsc(this._t(first.top))}">
        <span class="big"><ha-icon icon="${rcEsc(first.icon)}"></ha-icon></span>
        <span class="bt"><span class="bh">${rcEsc(this._t(first.top))}</span><span class="bs">${rcEsc(where.join(" · "))}</span></span>
        <span class="bact">${silence}<button class="act act-details" data-k="details"><ha-icon icon="mdi:information-outline"></ha-icon><span>${rcEsc(this._t("details"))}</span></button></span>
      </div>`;
  }

  // The "Test all" button, when the detectors have a test button and no alarm is on: a first tap arms it for 5 s, a
  // second one runs every test (they are loud).
  _afterGrid() {
    const items = this._items || [];
    if (this._config.test_button === false || !items.some((i) => i.test) || items.some((i) => i.level === "alert")) return "";
    const label = this._t(this._armed ? "test_confirm" : "test_all");
    return `<div class="foot"><button class="act act-test${this._armed ? " armed" : ""}" data-k="test"><ha-icon icon="mdi:wrench-outline"></ha-icon><span>${rcEsc(label)}</span></button></div>`;
  }

  // The buttons are kept across renders (wired once): they read the detectors at the click.
  _bindAfter(root) {
    const items = () => this._items || [];
    const press = (ids) => ids.length && rcCall(this._hass, "button", "press", { entity_id: ids });
    const silence = root.querySelector(".act-silence");
    if (rcOnce(silence, "silence"))
      silence.addEventListener("click", () =>
        press(
          items()
            .filter((i) => i.level === "alert" && i.silence)
            .map((i) => i.silence),
        ),
      );
    const details = root.querySelector(".act-details");
    if (rcOnce(details, "details"))
      details.addEventListener("click", () => {
        const first = items().find((i) => i.level === "alert");
        if (first) rcMoreInfo(this, first.id);
      });
    const test = root.querySelector(".act-test");
    if (!rcOnce(test, "test")) return;
    test.addEventListener("click", () => {
      clearTimeout(this._armTimer);
      if (this._armed)
        press(
          items()
            .filter((i) => i.test)
            .map((i) => i.test),
        );
      this._armed = !this._armed;
      if (this._armed) {
        this._armTimer = setTimeout(() => {
          this._armed = false;
          this._render();
        }, 5000);
      }
      this._render();
    });
  }

  // A tap opens the details: a detector cannot be toggled.
  _bindTile(el) {
    el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
  }

  static styles = `
    ha-card.lvl-ok    { --c: var(--rc-ok); }
    ha-card.lvl-warn  { --c: var(--rc-warn); }
    ha-card.lvl-alert { --c: var(--rc-alert); }
    ha-card.lvl-none  { --c: var(--rc-idle); }
    .tile { --t: var(--rc-ok); }
    .tile.warn  { --t: var(--rc-warn); }
    .tile.alert { --t: var(--rc-alert); }
    .tile:not(.off) .state { color: color-mix(in srgb, var(--t) 50%, var(--primary-text-color, #212121)); }
    .tile.alert .ic { animation: rc-blink 1.5s ease-in-out infinite; }
    .banner { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 10px; padding: 10px 12px; border-radius: 12px;
              color: color-mix(in srgb, var(--rc-alert) 50%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--rc-alert) 12%, var(--secondary-background-color, transparent));
              border: 1px solid color-mix(in srgb, var(--rc-alert) 30%, transparent); }
    .big { flex: none; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center;
           background: color-mix(in srgb, var(--rc-alert) 20%, transparent); animation: rc-blink 1.5s ease-in-out infinite; }
    .big ha-icon { --mdc-icon-size: 26px; }
    .bt { flex: 1 1 160px; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .bh { font-size: 18px; font-weight: 700; line-height: 1.2; }
    .bs { font-size: 12px; color: var(--primary-text-color); opacity: .85; overflow-wrap: break-word; }
    .bact, .foot { display: flex; flex-wrap: wrap; gap: 6px; }
    .foot { margin-top: 8px; }
    .act { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; min-height: 40px;
           padding: 0 12px; border-radius: 999px; font-size: 13px; font-weight: 500; color: var(--primary-text-color);
           border: 1px solid var(--divider-color, rgba(127,127,127,.3)); background: color-mix(in srgb, var(--card-background-color, #fff) 60%, transparent); }
    .act ha-icon { --mdc-icon-size: 18px; color: var(--c); }
    .act:hover { background: color-mix(in srgb, var(--c) 12%, transparent); }
    .act:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .act-silence { color: color-mix(in srgb, var(--rc-alert) 50%, var(--primary-text-color, #212121)); border-color: color-mix(in srgb, var(--rc-alert) 45%, transparent); }
    .act-test.armed { color: color-mix(in srgb, var(--rc-warn) 50%, var(--primary-text-color, #212121)); border-color: color-mix(in srgb, var(--rc-warn) 55%, transparent); }
    .act-test.armed ha-icon { color: var(--rc-warn); }
    .no-blink .tile.alert .ic, .no-blink .big, .no-blink.lvl-alert .badge { animation: none; }
    @media (prefers-reduced-motion: reduce) { .tile.alert .ic, .big { animation: none; } }
    ${SC_SCENE_STYLE}
  `;
}

// ── Editor ───────────────────────────────────────────────────────────────────
// The detectors the card finds (its own rules, `exclude` aside), plus the ones already excluded.
const scExcludeField = (card, hass, config) => {
  if (!hass) return [];
  const ids = rcProbe(card, hass, { ...config, entities: undefined, exclude: [] })
    ._entries()
    .map((e) => e.entity);
  for (const id of config?.exclude || []) if (!ids.includes(id)) ids.push(id);
  return rcEntitiesField("exclude", ids);
};

const SC_CARD_HELPERS = ["area", "title", "layout", "illustration", "illustration_theme", "test_button", "include", "exclude", ...RC_ADVANCED_HELPERS];

// The fields of both editors: `extra` holds the full card's own booleans, `zoom` the mini card's.
const scSchema = (card, booleans) => (lang, hass, config) => [
  { name: "area", selector: { area: {} } },
  { name: "title", selector: { text: {} } },
  { name: "navigation_path", selector: { navigation: {} } },
  { name: "columns", selector: { number: { min: 1, max: 4, mode: "box" } } },
  rcLayoutField(SC_I18N, lang),
  ...rcBooleans(...booleans),
  { name: "illustration_theme", selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((value) => ({ value, label: rcT(SC_I18N, lang, `theme_${value}`) })) } } },
  { name: "battery_threshold", selector: { number: { min: 5, max: 50, step: 5, mode: "slider", unit_of_measurement: "%" } } },
  ...rcIncludeField(card, hass, config),
  ...scExcludeField(card, hass, config),
  ...rcAdvanced(SC_I18N, lang, "entities", "language"),
];

const SafetyCardEditor = rcEditor({
  card: SafetyCard,
  helpers: SC_CARD_HELPERS,
  schema: scSchema(SafetyCard, ["show_title", "illustration", "only_alerts", "hide_when_clear", "banner", "test_button", "blink"]),
});

rcRegister(
  SafetyCard,
  SafetyCardEditor,
  "Safety Card",
  "Smoke, carbon monoxide, gas and water leak detectors of a room or the whole home: alarms first, battery, end of life and test",
);

// ── Mini card ────────────────────────────────────────────────────────────────
// The detectors on two lines: the badge, title and status, then a tinted pill for each detector in alarm or needing a
// look; quiet detectors only show once zoomed in to the full card.
class SafetyMiniCard extends rcMini(
  SafetyCard,
  "safety-mini-card",
  `
    .r.alert { --t: var(--rc-alert); }
    .r.warn  { --t: var(--rc-warn); }
    .r.alert ha-icon { animation: rc-blink 1.5s ease-in-out infinite; }
    .no-blink .r.alert ha-icon { animation: none; }
    @media (prefers-reduced-motion: reduce) { .r.alert ha-icon { animation: none; } }
    ha-card.mini-ill { padding: 0; }
    .mini-ill .hero { margin: 0; }
    .mini-ill .rs { margin: 0; padding: 6px 12px 10px 8px; }
  `,
  { alertsOnly: true },
) {
  _drawMini(items) {
    const v = this._visible(items, ["mini", this._parts(items), this._night()]);
    if (!v) return;
    const chips = v.shown
      .map(
        (i) => `
        <button class="r pill ${i.level}" data-id="${rcEsc(i.id)}" title="${rcEsc(i.name)} — ${rcEsc(i.state)}">
          <ha-icon icon="${rcEsc(i.icon)}"></ha-icon><span>${rcEsc(i.name)}</span>
        </button>`,
      )
      .join("");
    const cls = this._config.blink === false ? " no-blink" : "";
    if (this._illustrated()) this._paintHero(v, items, chips, cls);
    else this._paintMini({ level: v.level, icon: v.icon, status: v.status, chips, cls });
    // An alarm is announced on the compact view too, once when it starts or changes.
    const key = v.alarms.length ? JSON.stringify(v.alarms.map((i) => [i.id, i.top])) : null;
    if (key && key !== this._announced) this.shadowRoot.querySelector(".mini .st, .hero .hpill")?.setAttribute?.("role", "alert");
    this._announced = key;
  }

  // The compact view with the illustration: the full card's banner (same height), then the chips under it — no strip
  // under the banner when there is no chip to show.
  _paintHero(v, items, chips, cls) {
    const c = this._config;
    rcMorph(
      this.shadowRoot,
      `
      <style>${RC_BASE_STYLES}${this.constructor.styles}</style>
      <ha-card class="lvl-${v.level}${cls} ill mini-ill">
        ${this._hero(v, items, c.title || this._areaName() || this._t("title"))}
        ${chips ? `<div class="rs">${chips}</div>` : ""}
      </ha-card>`,
    );
    const root = this.shadowRoot;
    rcBindNav(root.querySelector(".head"), c.navigation_path);
    for (const el of root.querySelectorAll(".r")) if (rcOnce(el, "chip")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
    this._fitPill();
  }

  // On the banner, the zoom button sits at its top right corner.
  _zoomHost() {
    return this.shadowRoot.querySelector(".hero") || super._zoomHost();
  }
}

const SafetyMiniCardEditor = rcEditor({
  card: SafetyMiniCard,
  helpers: [...SC_CARD_HELPERS, "zoom"],
  schema: scSchema(SafetyMiniCard, ["show_title", "illustration", "hide_when_clear", "banner", "test_button", "blink", "zoom"]),
});

rcRegister(
  SafetyMiniCard,
  SafetyMiniCardEditor,
  "Safety Mini Card",
  "The detectors on two lines: alarms and maintenance first, with a zoom to the full card",
);
