// The mock home of the screenshots and animations: six rooms, one detector each.
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const AREAS = {
  living: "Living room",
  kitchen: "Kitchen",
  hallway: "Hallway",
  bedroom: "Bedroom",
  kids: "Kids room",
  garage: "Garage",
};
// [device, area, alarm sensors, battery %, extras]
const DETECTORS = [
  ["d_living", "living", ["smoke"], 92, {}],
  ["d_kitchen", "kitchen", ["smoke", "gas"], 18, { test: true, silence: true }],
  ["d_hall", "hallway", ["co"], 80, { ppm: 0, test: true }],
  ["d_bed", "bedroom", ["smoke"], 71, { eol: true, test: true }],
  ["d_kids", "kids", ["smoke"], 88, { test: true }],
  ["d_garage", "garage", ["co"], 64, { ppm: 2 }],
];
const DC = { smoke: "smoke", co: "carbon_monoxide", gas: "gas" };

// `scene`: "maintenance" (a low battery, an end of life), "clear" (nothing to do), "alarm" (smoke in the kitchen, the
// living room sounding too).
export const setup = (s) => {
  const states = {};
  const entities = {};
  const devices = {};
  const add = (id, device, state, attributes, last_changed = ago(600)) => {
    states[id] = { entity_id: id, state, attributes, last_changed };
    entities[id] = { entity_id: id, device_id: device };
  };
  for (const [device, area, kinds, battery, x] of DETECTORS) {
    devices[device] = { area_id: area, name: `${AREAS[area]} detector` };
    for (const kind of kinds) {
      const sounding = s.scene === "alarm" && ((area === "kitchen" && kind === "smoke") || (area === "living" && kind === "smoke"));
      add(`binary_sensor.${area}_${kind}`, device, sounding ? "on" : "off", { device_class: DC[kind], friendly_name: `${AREAS[area]} ${kind}` }, sounding ? ago(area === "kitchen" ? 2 : 1) : ago(600));
    }
    const low = s.scene === "clear" && battery < 20 ? 85 : battery;
    add(`sensor.${area}_battery`, device, String(low), { device_class: "battery", unit_of_measurement: "%" });
    if (x.ppm != null) add(`sensor.${area}_co_level`, device, String(x.ppm), { device_class: "carbon_monoxide", unit_of_measurement: "ppm" });
    if (x.eol) add(`binary_sensor.${area}_end_of_life`, device, s.scene === "clear" ? "off" : "on", { device_class: "problem", friendly_name: "End of life" });
    if (x.test) add(`button.${area}_self_test`, device, "unknown", { friendly_name: `${AREAS[area]} detector Self-test` });
    if (x.silence) add(`button.${area}_silence`, device, "unknown", { friendly_name: `${AREAS[area]} detector Silence` });
  }
  const areas = Object.fromEntries(Object.entries(AREAS).map(([area_id, name]) => [area_id, { area_id, name }]));
  return { hass: { states, entities, devices, areas, language: "en", locale: { language: "en" } }, config: { blink: false, ...s.config }, open: s.open };
};
