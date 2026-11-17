// Renders the safety cards with a mock home and saves the README screenshots.
// Usage: npm install && npm run build && node scripts/screenshots/safety.mjs
import { pair, shoot } from "./harness.mjs";
import { setup } from "./mock.mjs";

const scenes = [...pair("maintenance", { scene: "maintenance" }), ...pair("clear", { scene: "clear" }), ...pair("alarm", { scene: "alarm" })];
await shoot({ prefix: "safety", tag: "safety-card", shots: scenes, setup });
await shoot({ prefix: "safety", tag: "safety-card", shots: pair("leak", { scene: "leak" }), setup });
await shoot({ prefix: "safety", tag: "safety-card", shots: pair("room", { scene: "alarm", config: { area: "kitchen" } }), setup });
// A room with a water leak sensor alone: the scene draws its pipe and floor sensor, no ceiling smoke detector.
await shoot({ prefix: "safety", tag: "safety-card", shots: pair("leak-only", { scene: "clear", config: { area: "bathroom" } }), setup });
await shoot({ prefix: "safety", tag: "safety-card", shots: pair("tiles", { scene: "maintenance", width: 380, config: { layout: "tiles", columns: 1 } }), setup });
// The mini card, and the same card zoomed in (its zoom button clicked).
await shoot({
  prefix: "safety-mini",
  tag: "safety-mini-card",
  shots: [...scenes, ...pair("zoom", { scene: "maintenance", zoom: true, open: ".zoom" })],
  setup,
});
// The overview: the rooms needing a look, every room (detail button), a room unfolded, the smoke alarm, a water leak.
await shoot({
  prefix: "safety-overview",
  tag: "safety-overview-card",
  shots: [
    ...pair("check", { scene: "maintenance" }),
    ...pair("all", { scene: "maintenance", open: ".zoom" }),
    ...pair("room", { scene: "maintenance", open: '.room[data-area="kitchen"]' }),
    ...pair("alarm", { scene: "alarm" }),
    ...pair("leak", { scene: "leak" }),
  ],
  setup,
});
