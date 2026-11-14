/**
 * safety-overview-card: every room with a smoke, carbon monoxide or gas detector, at a glance. The rooms needing a look come
 * first (only them until the detail button is pressed); a tap on a room unfolds its safety card.
 * https://github.com/juju35/ha-safety-card
 */

class SafetyOverviewCard extends rcRoomsPanel(RcCard) {
  static tag = "safety-overview-card";
  static i18n = SC_I18N;
  static defaults = { zoom: true, sort: "state", battery_threshold: 20, exclude_areas: [], exclude: [], rooms: [] };

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
  // The rooms and their detectors (a detector with no room is left out: a room tile needs a room).
  _collect() {
    const h = this._hass;
    const c = this._config;
    const ids = rcByArea(this, (id) => !!scAlarmKind(h, id)).map(([id]) => id);
    const overrides = Object.fromEntries((c.rooms || []).map((x) => [x.area, x]));
    const exclude = new Set(c.exclude_areas || []);
    const rooms = {};
    for (const d of scDetectors(this, ids)) {
      if (!d.area || exclude.has(d.area) || !h.areas?.[d.area]) continue;
      const r = scRead(h, d, Number(c.battery_threshold) || 20);
      (rooms[d.area] ||= { id: d.area, dets: [] }).dets.push({ ...r, kind: d.alarms[0].kind, id: (r.active[0] || d.alarms[0]).id });
    }
    const rank = (x) => (x.level === "alert" ? 2 : x.level === "warn" ? 1 : 0);
    let list = Object.values(rooms).map((x) => {
      const area = h.areas[x.id];
      const o = overrides[x.id] || {};
      const level = x.dets.some((d) => d.level === "alert") ? "alert" : x.dets.some((d) => d.level === "warn") ? "warn" : "ok";
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
    const parts = this._all.map((x) => [x.id, x.name, x.icon, x.dets.map((d) => [d.id, d.level, d.batteryLow, d.replace, d.fault, d.unavailable, d.battery])]);
    if (!this._changed([this._openArea, this._zoomed, rooms.map((x) => x.id), parts])) return;

    if (!this.shadowRoot.querySelector("ha-card")) {
      this.shadowRoot.innerHTML = `
        <style>${RC_BASE_STYLES}${SafetyOverviewCard.styles}</style>
        <ha-card><div class="head"></div><div class="panel" hidden></div><div class="grid"></div></ha-card>`;
      this.shadowRoot.querySelector(".head").addEventListener("click", (ev) => rcZoomClick(this, ev));
      this.shadowRoot.querySelector(".grid").addEventListener("click", (ev) => {
        const tile = ev.target.closest(".room");
        if (tile) this._tap(tile.dataset.area);
      });
    }

    // The header: same status as a home-wide safety card, then chips counting the maintenance needs.
    const alarms = all.filter((d) => d.level === "alert");
    const warn = all.filter((d) => d.level === "warn");
    const top = rcTopAlert(alarms.flatMap((d) => d.active.map((a) => a.kind)));
    const level = alarms.length ? "alert" : warn.length ? "warn" : "ok";
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
    card.className = `lvl-${level}`;
    card.querySelector(".head").innerHTML = `
      <div class="badge"><ha-icon icon="${icon}"></ha-icon></div>
      <div class="title">${rcEsc(c.title || this._t("title"))}</div>
      ${headChips ? `<div class="hchips">${headChips}</div>` : ""}
      <div class="pill" title="${rcEsc(status)}"><span class="pt">${rcEsc(status)}</span></div>
      ${rcZoomButton(this)}`;

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
      area: x.id,
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
      ha-card.lvl-warn  { --c: var(--rc-warn); }
      ha-card.lvl-alert { --c: var(--rc-alert); }
      .chip { --k: var(--rc-ok); flex: none; display: inline-flex; align-items: center; gap: 2px; height: 18px; padding: 0 5px;
              border-radius: 999px; font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap;
              color: var(--k); background: color-mix(in srgb, var(--k) 14%, transparent); }
      .head .chip { height: 20px; padding: 0 6px; }
      .chip ha-icon { --mdc-icon-size: 12px; }
      .chip:not(:has(span)) { width: 18px; padding: 0; justify-content: center; }
      .chip.alert { --k: var(--rc-alert); }
      .chip.warn  { --k: var(--rc-warn); }
      .hchips { flex: none; display: flex; align-items: center; gap: inherit; }
      @container (max-width: 420px) {
        .head { gap: 6px; flex-wrap: wrap; }
        .hchips { order: 1; flex: 1 0 100%; flex-wrap: wrap; box-sizing: border-box; padding-left: 46px; }
      }
      @container (max-width: 260px) {
        .head::after { content: none; }
        .head > .pill { order: 0; margin-left: 0; max-width: none; }
      }
      .room { --t: var(--rc-idle); }
      .room.lvl-warn  { --t: var(--rc-warn); }
      .room.lvl-alert { --t: var(--rc-alert); }
      .room.lvl-alert .ic { animation: rc-blink 1.5s ease-in-out infinite; }
      .chips { gap: 3px; margin-top: 4px; }
      @media (prefers-reduced-motion: reduce) { .room .ic { animation: none; } }
    `;
}

// ── Editor ───────────────────────────────────────────────────────────────────
const SafetyOverviewCardEditor = rcEditor({
  card: SafetyOverviewCard,
  helpers: ["title", "zoom", "exclude", ...RC_ADVANCED_HELPERS],
  schema: (lang, hass, config) => {
    const probe = hass ? rcProbe(SafetyOverviewCard, hass, { ...config, exclude_areas: [], exclude: [], zoom: false }) : null;
    const rooms = probe ? probe._collect() : [];
    const ids = rooms.flatMap((x) => x.dets.map((d) => d.id));
    for (const id of config?.exclude || []) if (!ids.includes(id)) ids.push(id);
    return [
      ...rcOverviewFields(SC_I18N, lang),
      ...rcBooleans("show_title", "zoom"),
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
  "Every room's smoke, carbon monoxide and gas detectors at a glance; tap a room for its safety card",
);
