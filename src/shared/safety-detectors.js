// ── Safety detectors ─────────────────────────────────────────────────────────
// A detector is a device with one or more alarm binary sensors (smoke, carbon monoxide, gas, water leak); an alarm sensor
// with no device is a detector of its own. What else the device exposes is read from its other entities: battery (a level,
// or a "battery low" binary sensor), problem sensors (end of life, fault), a carbon monoxide level, test and silence buttons.
import { rcAlertKind, rcPerRegistry } from "./discovery-rules.js";
import { rcUnavailable } from "./helpers.js";

export const SC_KINDS = ["smoke", "co", "gas", "leak"];
export const SC_KIND_ICONS = { smoke: "mdi:smoke-detector-variant", co: "mdi:molecule-co", gas: "mdi:gas-burner", leak: "mdi:water-check" };
// A problem sensor that says the detector reached its end of life (else it is a fault).
export const SC_EOL = /end.?of.?life|fin.?de.?vie|replace|remplac|expir|lifetime|dur[ée]e.?de.?vie|lebensdauer/i;
export const SC_SILENCE = /silence|hush|mute|sourdine|stumm/i;
export const SC_TEST = /(^|[\s_.-])(self.?)?test/i;

// Alarm kind of an entity (`smoke`, `co`, `gas`, `leak`), undefined for anything else (configuration and diagnostic ones too).
export const scAlarmKind = (hass, id) => {
  if (!id.startsWith("binary_sensor.") || hass.entities?.[id]?.entity_category) return undefined;
  const kind = rcAlertKind(hass.states[id]?.attributes.device_class);
  return SC_KINDS.includes(kind) ? kind : undefined;
};

// Every entity of each device, in registry order.
export const scDeviceEntities = rcPerRegistry((hass) => {
  const out = {};
  for (const [id, r] of Object.entries(hass.entities || {})) if (r.device_id) (out[r.device_id] ||= []).push(id);
  return out;
});

export const scLabel = (hass, id) => `${id} ${hass.states[id]?.attributes.friendly_name || ""}`;

// The detectors of a list of alarm sensors, grouped by device: { key, device, area, alarms: [{ id, kind }] }.
export const scDetectors = (card, ids) => {
  const h = card._hass;
  const out = new Map();
  for (const id of ids) {
    const kind = scAlarmKind(h, id);
    if (!kind) continue;
    const device = h.entities?.[id]?.device_id;
    const key = device || id;
    if (!out.has(key)) out.set(key, { key, device, area: card._areaOf(id), alarms: [] });
    out.get(key).alarms.push({ id, kind });
  }
  return [...out.values()];
};

// What a detector reports: its active alarms, whether it can report at all, and its maintenance needs. `threshold` is the
// battery level (%) under which it is low.
export const scRead = (hass, d, threshold = 20) => {
  const st = (id) => hass.states[id];
  const r = { active: [], battery: null, batteryLow: false, replace: false, fault: false, ppm: null, test: null, silence: null };
  r.active = d.alarms.filter((a) => st(a.id)?.state === "on");
  r.unavailable = d.alarms.every((a) => !st(a.id) || rcUnavailable(st(a.id)));
  for (const id of d.device ? scDeviceEntities(hass)[d.device] || [] : []) {
    const s = st(id);
    if (!s) continue;
    const dc = s.attributes.device_class;
    const domain = id.split(".")[0];
    const num = Number.parseFloat(s.state);
    if (domain === "sensor" && dc === "battery" && Number.isFinite(num)) r.battery = num;
    else if (domain === "binary_sensor" && dc === "battery") r.batteryLow ||= s.state === "on";
    else if (domain === "binary_sensor" && dc === "problem" && s.state === "on") r[SC_EOL.test(scLabel(hass, id)) ? "replace" : "fault"] = true;
    else if (domain === "sensor" && dc === "carbon_monoxide" && Number.isFinite(num)) r.ppm = num;
    else if (domain === "button" && SC_SILENCE.test(scLabel(hass, id))) r.silence ??= id;
    else if (domain === "button" && SC_TEST.test(scLabel(hass, id))) r.test ??= id;
  }
  if (r.battery != null && r.battery < threshold) r.batteryLow = true;
  r.since = r.active.map((a) => st(a.id).last_changed).sort()[0];
  r.level = r.active.length ? "alert" : r.unavailable || r.batteryLow || r.replace || r.fault ? "warn" : "ok";
  return r;
};

// The device's name, the alarm sensor's when it has none.
export const scDeviceName = (hass, d) => {
  const dev = d.device && hass.devices?.[d.device];
  return dev?.name_by_user || dev?.name || hass.states[d.alarms[0].id]?.attributes.friendly_name || d.alarms[0].id;
};

// "2 min" since an ISO time, in the card's language.
export const scAgo = (card, iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return card._t("now");
  if (s < 3600) return card._t("min", { n: Math.floor(s / 60) });
  if (s < 86400) return card._t("hour", { n: Math.floor(s / 3600) });
  return card._t("day", { n: Math.floor(s / 86400) });
};

// The maintenance need that names a detector's warning, most urgent first.
export const scWarnKey = (r) => (r.unavailable ? "unavailable" : r.fault ? "fault" : r.replace ? "replace" : "battery");
export const SC_WARN_ICONS = {
  unavailable: "mdi:smoke-detector-variant-off",
  fault: "mdi:alert-circle-outline",
  replace: "mdi:timer-sand",
  battery: "mdi:battery-alert-variant-outline",
};
