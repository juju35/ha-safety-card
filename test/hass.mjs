// A small mock Home Assistant: a living room smoke detector, a kitchen smoke + gas detector with a low battery and a test
// button, a hallway CO detector with its level, a bedroom smoke detector at its end of life, a detector with no device,
// and unrelated entities (a door, a diagnostic smoke entity) that the cards must leave out.
export const st = (entity_id, state, attributes = {}, last_changed = "2026-01-01T00:00:00Z") => ({ entity_id, state, attributes, last_changed });

export const makeHass = (overrides = {}) => ({
  language: "en",
  locale: { language: "en" },
  areas: {
    living: { area_id: "living", name: "Living room" },
    kitchen: { area_id: "kitchen", name: "Kitchen" },
    hallway: { area_id: "hallway", name: "Hallway" },
    bedroom: { area_id: "bedroom", name: "Bedroom" },
    garage: { area_id: "garage", name: "Garage" },
  },
  devices: {
    d_living: { area_id: "living", name: "Smoke detector Living room" },
    d_kitchen: { area_id: "kitchen", name: "Kitchen detector" },
    d_hall: { area_id: "hallway", name: "CO alarm" },
    d_bed: { area_id: "bedroom", name: "Smoke detector" },
  },
  entities: {
    "binary_sensor.living_smoke": { device_id: "d_living" },
    "sensor.living_battery": { device_id: "d_living", entity_category: "diagnostic" },
    "binary_sensor.kitchen_smoke": { device_id: "d_kitchen" },
    "binary_sensor.kitchen_gas": { device_id: "d_kitchen" },
    "sensor.kitchen_battery": { device_id: "d_kitchen", entity_category: "diagnostic" },
    "button.kitchen_self_test": { device_id: "d_kitchen", entity_category: "config" },
    "button.kitchen_silence": { device_id: "d_kitchen", entity_category: "config" },
    "binary_sensor.hall_co": { device_id: "d_hall" },
    "sensor.hall_co_level": { device_id: "d_hall" },
    "binary_sensor.bed_smoke": { device_id: "d_bed" },
    "binary_sensor.bed_end_of_life": { device_id: "d_bed", entity_category: "diagnostic" },
    "binary_sensor.garage_co": { area_id: "garage" },
    "binary_sensor.garage_smoke_diag": { area_id: "garage", entity_category: "diagnostic" },
    "binary_sensor.door": { area_id: "living" },
  },
  states: {
    "binary_sensor.living_smoke": st("binary_sensor.living_smoke", "off", { device_class: "smoke", friendly_name: "Living room smoke" }),
    "sensor.living_battery": st("sensor.living_battery", "92", { device_class: "battery", unit_of_measurement: "%" }),
    "binary_sensor.kitchen_smoke": st("binary_sensor.kitchen_smoke", "off", { device_class: "smoke", friendly_name: "Kitchen smoke" }),
    "binary_sensor.kitchen_gas": st("binary_sensor.kitchen_gas", "off", { device_class: "gas", friendly_name: "Kitchen gas" }),
    "sensor.kitchen_battery": st("sensor.kitchen_battery", "18", { device_class: "battery", unit_of_measurement: "%" }),
    "button.kitchen_self_test": st("button.kitchen_self_test", "unknown", { friendly_name: "Kitchen detector Self-test" }),
    "button.kitchen_silence": st("button.kitchen_silence", "unknown", { friendly_name: "Kitchen detector Silence" }),
    "binary_sensor.hall_co": st("binary_sensor.hall_co", "off", { device_class: "carbon_monoxide", friendly_name: "Hallway CO" }),
    "sensor.hall_co_level": st("sensor.hall_co_level", "2", { device_class: "carbon_monoxide", unit_of_measurement: "ppm" }),
    "binary_sensor.bed_smoke": st("binary_sensor.bed_smoke", "off", { device_class: "smoke", friendly_name: "Bedroom smoke" }),
    "binary_sensor.bed_end_of_life": st("binary_sensor.bed_end_of_life", "on", { device_class: "problem", friendly_name: "Smoke detector End of life" }),
    "binary_sensor.garage_co": st("binary_sensor.garage_co", "off", { device_class: "carbon_monoxide", friendly_name: "Garage CO" }),
    "binary_sensor.garage_smoke_diag": st("binary_sensor.garage_smoke_diag", "on", { device_class: "smoke", friendly_name: "Garage smoke test" }),
    "binary_sensor.door": st("binary_sensor.door", "on", { device_class: "door", friendly_name: "Door" }),
  },
  calls: [],
  callService(domain, service, data) {
    this.calls.push([domain, service, data]);
  },
  ...overrides,
});

// The same home with the kitchen smoke sensor sounding since `since`.
export const withAlarm = (since = new Date(Date.now() - 120000).toISOString()) => {
  const h = makeHass();
  h.states["binary_sensor.kitchen_smoke"] = st("binary_sensor.kitchen_smoke", "on", { device_class: "smoke", friendly_name: "Kitchen smoke" }, since);
  return h;
};
