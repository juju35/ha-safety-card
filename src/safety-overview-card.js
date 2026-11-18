/**
 * safety-overview-card: every room with a smoke, carbon monoxide, gas or water leak detector, at a glance. The rooms needing a look come
 * first (only them until the detail button is pressed); a tap on a room unfolds its safety card.
 * https://github.com/juju35/ha-safety-card
 */

// The tile of the detectors with no room.
const SC_OTHER = "_other";

class SafetyOverviewCard extends rcRoomsPanel(RcCard) {
  static tag = "safety-overview-card";
  static i18n = SC_I18N;
  static defaults = { zoom: true, illustration: true, illustration_theme: "auto", sort: "state", battery_threshold: 20, exclude_areas: [], exclude: [], rooms: [] };

  static getStubConfig() {
    return {};
  }

  set hass(hass) {
    super.hass = hass;
    for (const el of this._details || []) el.hass = hass;
  }

  getCardSize() {
    return 1 + Math.ceil((this._rooms?.length || 1) / 3);
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  // The rooms and their detectors; the detectors with no room (or a deleted one) gather in an "Other" tile, so that
  // their alarms are never left out.
  _collect() {
    const h = this._hass;
    const c = this._config;
    // The registry scan is kept until the registries change; whether an entity is a detector reads its state, checked at
    // each render so that a detector whose state arrives late still shows.
    const ids = rcByArea(this, (id) => id.startsWith("binary_sensor.") && !h.entities[id]?.entity_category)
      .map(([id]) => id)
      .filter((id) => !!scAlarmKind(h, id));
    const loose = rcMemo((this._memo ||= {}), "loose", [c, h.entities, h.devices], () => {
      const excluded = new Set(c.exclude || []);
      return Object.keys(h.entities || {}).filter((id) => {
        const r = h.entities[id];
        return id.startsWith("binary_sensor.") && !r.hidden && !r.entity_category && !excluded.has(id) && !this._areaOf(id);
      });
    }).filter((id) => !!scAlarmKind(h, id));
    // Excluding one alarm sensor of a combined detector excludes the whole detector (its device).
    const excludedDevices = new Set((c.exclude || []).map((id) => h.entities?.[id]?.device_id).filter(Boolean));
    const overrides = Object.fromEntries((c.rooms || []).map((x) => [x.area, x]));
    const exclude = new Set(c.exclude_areas || []);
    const rooms = {};
    for (const d of scDetectors(this, [...ids, ...loose])) {
      if (exclude.has(d.area) || excludedDevices.has(d.device)) continue;
      const room = d.area && h.areas?.[d.area] ? d.area : SC_OTHER;
      if (room === SC_OTHER && exclude.has(SC_OTHER)) continue;
      const r = scRead(h, d, Number(c.battery_threshold) || 20);
      (rooms[room] ||= { id: room, dets: [] }).dets.push({ ...r, kind: d.alarms[0].kind, kinds: [...new Set(d.alarms.map((a) => a.kind))], id: (r.active[0] || d.alarms[0]).id, ids: d.alarms.map((a) => a.id) });
    }
    const rank = (x) => (x.level === "alert" ? 2 : x.level === "warn" ? 1 : 0);
    let list = Object.values(rooms).map((x) => {
      const area = h.areas[x.id];
      const o = overrides[x.id] || {};
      const level = x.dets.some((d) => d.level === "alert") ? "alert" : x.dets.some((d) => d.level === "warn") ? "warn" : "ok";
      if (x.id === SC_OTHER) return { ...x, level, name: o.name ?? this._t("other_room"), icon: o.icon ?? "mdi:map-marker-question-outline", navigation_path: o.navigation_path };
      return { ...x, level, name: o.name ?? area.name ?? x.id, icon: o.icon ?? rcRoomIcon(area), navigation_path: o.navigation_path };
    });
    rcSortRooms(list, c, rank);
    this._all = list;
    this._total = list.length;
    if (rcCompact(this)) list = list.filter((x) => rank(x) > 0 || x.id === this._openArea);
    return list;
  }

  // A room's line: its alarm, else the one need of its only detector needing a look, else how many need one.
  _roomState(x) {
    const alarms = x.dets.filter((d) => d.level === "alert");
    if (alarms.length) return this._t(rcTopAlert(alarms.flatMap((d) => d.active.map((a) => a.kind))));
    const warn = x.dets.filter((d) => d.level === "warn");
    if (warn.length === 1) {
      const d = warn[0];
      const key = scWarnKey(d);
      if (key !== "battery") return this._t(key);
      return d.battery != null ? this._t("battery_pct", { n: Math.round(d.battery) }) : this._t("battery_low");
    }
    return warn.length ? this._tn("check", warn.length) : this._t("all_clear");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    const c = this._config;
    const rooms = this._collect();
    this._rooms = rooms;
    const all = this._all.flatMap((x) => x.dets.map((d) => ({ ...d, areaName: x.name })));
    const parts = this._all.map((x) => [x.id, x.name, x.icon, x.dets.map((d) => [d.id, d.level, d.active.map((a) => a.kind), d.batteryLow, d.replace, d.fault, d.unavailable, d.battery])]);
    if (!this._changed([this._openArea, this._zoomed, rooms.map((x) => x.id), parts, this._night()])) return;

    if (!this.shadowRoot.querySelector("ha-card")) {
      this.shadowRoot.innerHTML = `
        <style>${RC_BASE_STYLES}${SafetyOverviewCard.styles}</style>
        <ha-card><div class="top"></div><div class="panel" hidden></div><div class="grid"></div></ha-card>`;
      this.shadowRoot.querySelector(".top").addEventListener("click", (ev) => rcZoomClick(this, ev));
      this.shadowRoot.querySelector(".grid").addEventListener("click", (ev) => {
        const tile = ev.target.closest(".room");
        if (tile) this._tap(tile.dataset.area);
      });
    }

    // The header: same status as a home-wide safety card, then chips counting the maintenance needs.
    const alarms = all.filter((d) => d.level === "alert");
    const warn = all.filter((d) => d.level === "warn");
    const top = rcTopAlert(alarms.flatMap((d) => d.active.map((a) => a.kind)));
    // No detector: grey, not a reassuring green.
    const level = alarms.length ? "alert" : warn.length ? "warn" : all.length ? "ok" : "none";
    const status = alarms.length
      ? this._t("alarm_in", { alarm: this._t(top), room: alarms[0].areaName })
      : warn.length
        ? this._tn("check", warn.length)
        : this._t(all.length ? "all_clear" : "no_detectors");
    const icon = alarms.length ? RC_ALERT_KINDS[top].on : warn.length ? "mdi:shield-alert-outline" : "mdi:shield-home-outline";
    const chip = (cls, ic, label, text) =>
      `<span class="chip ${cls}" title="${rcEsc(label)}"><ha-icon icon="${ic}"></ha-icon>${text ? `<span>${rcEsc(text)}</span>` : ""}</span>`;
    const count = (key) => warn.filter((d) => scWarnKey(d) === key).length;
    const headChips = ["battery", "replace", "fault", "unavailable"]
      .map((key) => {
        const n = count(key);
        return n ? chip("warn", SC_WARN_ICONS[key], this._t(key === "battery" ? "battery_low" : key), String(n)) : "";
      })
      .join("");

    const card = this.shadowRoot.querySelector("ha-card");
    card.className = `lvl-${level}${this._illustrated() ? " ill" : ""}`;
    const title = c.title || this._t("title");
    card.querySelector(".top").innerHTML = this._illustrated()
      ? this._hero({ level, top, alarms, icon, status, title, chips: headChips })
      : `<div class="head">
      <div class="badge"><ha-icon icon="${icon}"></ha-icon></div>
      <div class="title">${rcEsc(title)}</div>
      ${headChips ? `<div class="hchips">${headChips}</div>` : ""}
      <div class="pill" title="${rcEsc(status)}"><span class="pt">${rcEsc(status)}</span></div>
      ${all.length ? rcZoomButton(this) : ""}</div>`;

    // A room tile: its name and state, then one chip per detector, tinted by its state.
    this._roomGrid(card.querySelector(".grid"), rooms, (x) => {
      const text = this._roomState(x);
      const chips = x.dets
        .map((d) => {
          const ic = d.level === "alert" ? RC_ALERT_KINDS[rcTopAlert(d.active.map((a) => a.kind))].on : d.level === "warn" ? SC_WARN_ICONS[scWarnKey(d)] : SC_KIND_ICONS[d.kind];
          return chip(d.level === "ok" ? "ok" : d.level, ic, this._t(`k_${d.kind}`));
        })
        .join("");
      return `
      <button class="room lvl-${x.level}${x.id === this._openArea ? " sel" : ""}" data-area="${rcEsc(x.id)}" title="${rcEsc(x.name)} — ${rcEsc(text)}">
        <span class="ic"><ha-icon icon="${rcEsc(x.icon)}"></ha-icon></span>
        <span class="name">${rcEsc(x.name)}</span>
        <span class="state">${rcEsc(text)}</span>
        <span class="chips">${chips}</span>
      </button>`;
    });
  }

  // The illustrated header is on unless `illustration: false` (the classic header then).
  _illustrated() {
    return this._config.illustration !== false;
  }

  // Night picture or not, part of the redraw signature; null without a picture.
  _night() {
    return this._illustrated() ? scIsNight(this._hass, this._config) : null;
  }

  // The safety card's banner for the whole home: the hallway for the state of every detector, the icon (coloured by the
  // status) with the title and the status pill on the wall at its left; under them, the rooms sounding or, without an
  // alarm, the chips counting the maintenance needs. The detail button sits at its top right corner.
  _hero({ level, top, alarms, icon, status, title, chips }) {
    this._uid ??= ++scUidNext;
    const dets = this._all.flatMap((x) => x.dets);
    const scene = scSceneState({ level, top }, dets);
    const pill = alarms.length ? this._t(top) : status;
    const rooms = [...new Set(alarms.map((d) => d.areaName))].join(", ");
    const sub = alarms.length ? `<div class="sub" title="${rcEsc(rooms)}">${rcEsc(rooms)}</div>` : chips ? `<div class="sub hchips">${chips}</div>` : "";
    return `
      <div class="hero sc-${scene}${this._night() ? " night" : ""}">
        ${scSceneSvg(scene, this._uid, scKindsOf(dets), dets.find((d) => d.level === "warn")?.kinds[0])}
        <div class="ground" aria-hidden="true"></div>
        <div class="head htext">
          <div class="badge" title="${rcEsc(status)}"><ha-icon icon="${rcEsc(icon)}"></ha-icon></div>
          <div class="titles">
            <div class="trow"><div class="title">${rcEsc(title)}</div><span class="hpill" title="${rcEsc(status)}" aria-label="${rcEsc(status)}"><span class="dot"></span><span class="pt">${rcEsc(pill)}</span></span></div>
            ${sub}
          </div>
        </div>
        ${dets.length ? rcZoomButton(this) : ""}
      </div>`;
  }

  _shownRooms() {
    return this._rooms;
  }

  _clearPanel() {
    this._details = [];
  }

  // Details of the open room: its safety card (same bundle, always defined).
  _fillPanel() {
    const x = this._rooms.find((r) => r.id === this._openArea);
    const panel = this.shadowRoot.querySelector(".panel");
    panel.hidden = false;
    const key = JSON.stringify([x.id, x.dets.length]);
    if (this._panelArea === key) return;
    this._panelArea = key;
    panel.innerHTML = "";
    const el = document.createElement("safety-card");
    el.setConfig({
      type: "custom:safety-card",
      // The "Other" tile has no area: its detectors are listed.
      ...(x.id === SC_OTHER ? { entities: x.dets.flatMap((d) => d.ids) } : { area: x.id }),
      exclude: this._config.exclude || [],
      battery_threshold: this._config.battery_threshold,
      ...(this._config.language ? { language: this._config.language } : {}),
    });
    el.hass = this._hass;
    panel.appendChild(el);
    this._details = [el];
  }

  static styles = `${RC_ZOOM_STYLES}${RC_ROOM_GRID_STYLES}
      ha-card { container-type: inline-size; position: relative; }
      ha-card.lvl-ok    { --c: var(--rc-ok); }
      ha-card.lvl-none  { --c: var(--rc-idle); }
      ha-card.lvl-warn  { --c: var(--rc-warn); }
      ha-card.lvl-alert { --c: var(--rc-alert); }
      .chip { --k: var(--rc-ok); flex: none; display: inline-flex; align-items: center; gap: 2px; height: 18px; padding: 0 5px;
              border-radius: 999px; font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap;
              color: color-mix(in srgb, var(--k) 50%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--k) 14%, transparent); }
      .head .chip { height: 20px; padding: 0 6px; }
      .chip ha-icon { --mdc-icon-size: 12px; }
      .chip:not(:has(span)) { width: 18px; padding: 0; justify-content: center; }
      .chip.alert { --k: var(--rc-alert); }
      .chip.warn  { --k: var(--rc-warn); }
      .head > .hchips { flex: none; display: flex; align-items: center; gap: inherit; }
      @container (max-width: 420px) {
        .head { gap: 6px; flex-wrap: wrap; }
        /* The chips go under the title; the zoom stays on the title's row, and so does the pill while it fits whole
           beside the whole title (else, measured by the card, it goes under the chips). */
        .head > .hchips { order: 2; flex: 1 0 100%; flex-wrap: wrap; box-sizing: border-box; padding-left: 46px; }
        .head > .pill, .head > .zoom { order: 1; }
        .head[data-wrap] > .pill { order: 3; }
      }
      ${SC_SCENE_STYLE}
      /* On the banner, the maintenance chips sit on the subtitle line, tinted for the wall like the status pill. */
      .hero .sub.hchips { display: flex; gap: 4px; overflow: hidden; }
      /* Banner alone (no room to show, no open room): the card ends on the parquet strip, no padding under it. */
      ha-card.ill:has(.grid[hidden]):has(.panel[hidden]) { padding-bottom: 0; }
      .hero .chip { color: color-mix(in srgb, var(--k) 45%, #0d2a45); background: color-mix(in srgb, var(--k) 18%, rgba(255,255,255,.78)); }
      .hero.night .chip { color: color-mix(in srgb, var(--k) 35%, #ffffff); background: color-mix(in srgb, var(--k) 30%, rgba(8,18,38,.55)); }
      .room { --t: var(--rc-idle); }
      .room.lvl-warn  { --t: var(--rc-warn); }
      .room.lvl-alert { --t: var(--rc-alert); }
      .room.lvl-alert .ic { animation: rc-blink 1.5s ease-in-out infinite; }
      .chips { gap: 3px; margin-top: 4px; }
      @media (prefers-reduced-motion: reduce) { .room.lvl-alert .ic { animation: none; } }
    `;
}

// ── Editor ───────────────────────────────────────────────────────────────────
const SafetyOverviewCardEditor = rcEditor({
  card: SafetyOverviewCard,
  helpers: ["title", "zoom", "illustration", "illustration_theme", "exclude", ...RC_ADVANCED_HELPERS],
  schema: (lang, hass, config) => {
    const probe = hass ? rcProbe(SafetyOverviewCard, hass, { ...config, exclude_areas: [], exclude: [], zoom: false }) : null;
    const rooms = probe ? probe._collect() : [];
    const ids = rooms.flatMap((x) => x.dets.flatMap((d) => d.ids));
    for (const id of config?.exclude || []) if (!ids.includes(id)) ids.push(id);
    return [
      ...rcOverviewFields(SC_I18N, lang),
      ...rcBooleans("show_title", "illustration", "zoom"),
      { name: "illustration_theme", selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((value) => ({ value, label: rcT(SC_I18N, lang, `theme_${value}`) })) } } },
      { name: "battery_threshold", selector: { number: { min: 5, max: 50, step: 5, mode: "slider", unit_of_measurement: "%" } } },
      { name: "exclude_areas", selector: { select: { multiple: true, mode: "dropdown", options: rooms.map((x) => ({ value: x.id, label: x.name })) } } },
      ...rcEntitiesField("exclude", ids),
      ...rcAdvanced(SC_I18N, lang, "rooms", "language"),
    ];
  },
});

rcRegister(
  SafetyOverviewCard,
  SafetyOverviewCardEditor,
  "Safety Overview Card",
  "Every room's smoke, carbon monoxide, gas and water leak detectors at a glance; tap a room for its safety card",
);
