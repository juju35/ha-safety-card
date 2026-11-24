// ── Safety illustration ──────────────────────────────────────────────────────
// Shared by the safety cards and the overview.
// The header's picture: a hallway (wall, ceiling, two doors) at the right of a 90 px banner, on a 10 px parquet strip
// that runs under the whole banner. The 200 × 80 scene sits on the strip at 1:1, its floor at y 80; the left of the
// banner is the wall alone, under the title. The detectors are drawn big and change with the state of the home:
// all clear (green light), smoke (cloud, red light, alarm rings), CO (boiler, CO detector, amber air), gas (cooker, gas
// detector, fumes), water leak (pipe, drips, puddle, floor sensor), battery low or another maintenance need (amber
// light, a bubble). Only the kinds of detector the card shows are drawn: a home with a single leak sensor gets the
// pipe and the floor sensor, no ceiling smoke detector. Its colours come from classes, so that night only switches a
// class on the banner.
import { SC_KINDS, scWarnKey } from "./safety-detectors.js";

// Scene of a summary: the alarm's kind, a maintenance need, all clear, or no detector.
export const scSceneState = (sum, items) => {
  if (sum.level === "alert") return sum.top;
  if (sum.level === "warn") return items.some((i) => i.level === "warn" && !i.unavailable && scWarnKey(i) === "battery") ? "battery" : "check";
  return sum.level;
};

// Night picture: forced by illustration_theme, else Home Assistant's dark mode alone (a light theme keeps the day
// picture after sunset).
export const scIsNight = (hass, config) => {
  const theme = config.illustration_theme;
  if (theme === "night") return true;
  if (theme === "day") return false;
  return !!hass?.themes?.darkMode;
};

// The kinds of detector among the card's detectors, in SC_KINDS order.
export const scKindsOf = (items) => SC_KINDS.filter((k) => items.some((i) => i.kinds?.includes(k)));

// biome-ignore lint/style/useConst: incremented by the cards (safety-card.js, safety-overview-card.js).
export let scUidNext = 0;

// A quiet detector's light: amber and blinking for the one needing a look (the scene's --led), green for the others.
export const scLedCls = (s, kind, warn) => (s === "battery" || s === "check" ? (kind === warn ? "sc-led sc-blink" : "sc-led ok") : "sc-led");

// The ceiling smoke detector, 73 px wide, its light coloured by the scene (--led).
export const scCeilingDetector = (s, uid, warn) => {
  const alarm = s === "smoke";
  const led = alarm ? "sc-led sc-blink" : scLedCls(s, "smoke", warn);
  const ring = (d) => `<circle class="sc-ping${d}" cx="0" cy="5.6" r="3" />`;
  return `<g transform="translate(112 6)">
      ${alarm ? `<circle class="sc-glow" cx="0" cy="10" r="38" fill="url(#sc-glow-${uid})"/>` : ""}
      <g transform="scale(2.8)">
        <rect class="sc-det-base" x="-9" y="-1" width="18" height="1.6" rx=".4"/>
        <path class="sc-det" d="M-13 0H13V3.4C13 6 6.5 7.4 0 7.4S-13 6 -13 3.4Z"/>
        <path class="sc-det-vent" d="M-9 3.6H-5M-3 4.4H3M5 3.6H9"/>
        <circle class="${led}" cx="0" cy="5.6" r="1.5"/>
        ${alarm ? ring("") + ring(" d2") : ""}
      </g>
    </g>`;
};

export const scDoor = (x) =>
  `<g transform="translate(${x} 80)"><rect class="sc-frame" x="-13" y="-58" width="26" height="58"/><rect class="sc-door" x="-10.5" y="-55.5" width="21" height="55.5"/><circle class="sc-knob" cx="6.5" cy="-27" r="1.3"/></g>`;

// Smoke: a cloud around the ceiling detector, drifting.
export const scSmoke = () =>
  `<g class="sc-smoke">${[
    [86, 34, 12],
    [104, 30, 15],
    [130, 32, 16],
    [118, 48, 17],
    [94, 52, 11],
    [150, 46, 13],
  ]
    .map(([x, y, r], i) => `<circle class="sc-puff p${i % 3}" cx="${x}" cy="${y}" r="${r}"/>`)
    .join("")}</g>`;

// CO: the boiler on the wall, the CO detector beside it, the air tinted amber.
export const scCo = (uid) => `<rect class="sc-haze co" x="0" y="6" width="200" height="74" mask="url(#sc-fade-${uid})"/>
    <g transform="translate(76 0)">
      <path class="sc-pipe" d="M-6 64V80M6 64V80"/>
      <rect class="sc-boiler" x="-15" y="24" width="30" height="40" rx="3"/>
      <rect class="sc-boiler-win" x="-6" y="40" width="12" height="12" rx="2"/>
      <path class="sc-flame" d="M0 51q-4.5-3.5 0-9.5q4.5 6 0 9.5z"/>
      <circle class="sc-boiler-dial" cx="0" cy="31" r="3"/>
    </g>
    <g transform="translate(152 48)">
      <circle class="sc-ping amber" cx="0" cy="0" r="6"/>
      <rect class="sc-box" x="-13" y="-13" width="26" height="26" rx="5"/>
      <text class="sc-co" y="3.6" text-anchor="middle">CO</text>
      <circle class="sc-blink sc-led-amber" cx="8" cy="-7.5" r="1.8"/>
    </g>`;

// Gas: the cooker, its fumes, the gas detector on the wall above.
export const scGas = (uid) => `<rect class="sc-haze gas" x="0" y="6" width="200" height="74" mask="url(#sc-fade-${uid})"/>
    <g transform="translate(146 80)">
      <rect class="sc-cooker" x="-26" y="-36" width="52" height="36" rx="2"/>
      <rect class="sc-hob" x="-27" y="-38" width="54" height="3" rx="1"/>
      <rect class="sc-oven" x="-19" y="-26" width="38" height="20" rx="2"/>
      <circle class="sc-knob2" cx="-14" cy="-31" r="2"/><circle class="sc-knob2" cx="-5" cy="-31" r="2"/><circle class="sc-knob2" cx="4" cy="-31" r="2"/><circle class="sc-knob2" cx="13" cy="-31" r="2"/>
      <path class="sc-fume f0" d="M-12 -42q-4 -5 0 -10t0 -10"/><path class="sc-fume f1" d="M2 -42q-4 -5 0 -10t0 -10"/><path class="sc-fume f2" d="M14 -42q-4 -5 0 -10t0 -10"/>
    </g>
    <g transform="translate(88 40)">
      <circle class="sc-ping" cx="0" cy="0" r="6"/>
      <rect class="sc-box" x="-13" y="-13" width="26" height="26" rx="5"/>
      <path class="sc-gas-ic" d="M0 7.5c-4.6 0-7-3-7-6.4 0-4.4 4.2-6.8 4.6-11.1 2.4 1.6 3.4 4 3.2 6.2 1.4-.7 2.2-2 2.4-3.4 2.4 2.2 3.8 5 3.8 8.2 0 3.6-2.6 6.5-7 6.5z"/>
      <circle class="sc-blink sc-led-red" cx="8" cy="-7.5" r="1.8"/>
    </g>`;

// Water leak: a pipe on the wall dripping, the puddle spreading, the leak sensor on the floor in red.
export const scLeak = () => `<path class="sc-wpipe" d="M200 30H136a4 4 0 0 0-4 4v4"/>
    <rect class="sc-wjoint" x="128.5" y="36" width="7" height="4" rx="1"/>
    <path class="sc-drip" d="M132 42q-3 4 0 6q3-2 0-6z"/>
    <path class="sc-drip d2" d="M132 42q-3 4 0 6q3-2 0-6z"/>
    <ellipse class="sc-puddle" cx="134" cy="78" rx="38" ry="4"/>
    <g transform="translate(142 78) scale(1.35)">
      <circle class="sc-ping" cx="0" cy="-3" r="5"/>
      <path class="sc-puck" d="M-12 -1V-5.5C-12 -8 -6 -9.4 0 -9.4S12 -8 12 -5.5V-1C12 1.4 6 2.6 0 2.6S-12 1.4-12-1Z"/>
      <ellipse class="sc-puck-top" cx="0" cy="-5.6" rx="12" ry="3.6"/>
      <circle class="sc-blink sc-led-red" cx="5" cy="-5.6" r="1.6"/>
    </g>`;

// The quiet detectors (all clear or a maintenance need) of the kinds the card shows, other than the ceiling smoke one:
// the CO and gas detectors on the wall (the one needing a look the rightmost, by the bubble), the leak sensor on the
// floor under its pipe.
export const scWallBoxes = (kinds, warn) => {
  const wall = kinds.filter((k) => k === "co" || k === "gas").sort((a, b) => (a === warn) - (b === warn));
  return wall.map((k, i) => [k, 98 - 28 * (wall.length - 1 - i)]);
};
export const scQuiet = (s, kinds, warn) => {
  const box = ([k, x]) => `<g transform="translate(${x} 50)">
      <rect class="sc-box" x="-13" y="-13" width="26" height="26" rx="5"/>
      ${
        k === "co"
          ? `<text class="sc-co calm" y="3.6" text-anchor="middle">CO</text>`
          : `<path class="sc-gas-ic calm" d="M0 7.5c-4.6 0-7-3-7-6.4 0-4.4 4.2-6.8 4.6-11.1 2.4 1.6 3.4 4 3.2 6.2 1.4-.7 2.2-2 2.4-3.4 2.4 2.2 3.8 5 3.8 8.2 0 3.6-2.6 6.5-7 6.5z"/>`
      }
      <circle class="${scLedCls(s, k, warn)}" cx="8" cy="-7.5" r="1.8"/>
    </g>`;
  const leak = kinds.includes("leak")
    ? `<path class="sc-wpipe" d="M200 30H136a4 4 0 0 0-4 4v4"/>
    <rect class="sc-wjoint" x="128.5" y="36" width="7" height="4" rx="1"/>
    <g transform="translate(142 78) scale(1.35)">
      <path class="sc-puck" d="M-12 -1V-5.5C-12 -8 -6 -9.4 0 -9.4S12 -8 12 -5.5V-1C12 1.4 6 2.6 0 2.6S-12 1.4-12-1Z"/>
      <ellipse class="sc-puck-top calm" cx="0" cy="-5.6" rx="12" ry="3.6"/>
      <circle class="${scLedCls(s, "leak", warn)}" cx="5" cy="-5.6" r="1.6"/>
    </g>`
    : "";
  return leak + scWallBoxes(kinds, warn).map(box).join("");
};

// Where the maintenance bubble points at the detector needing a look: beside the ceiling detector, right of the wall
// detector, above the floor sensor (upside down).
export const scBubbleAt = (warn) => {
  if (warn === "leak") return { x: 138, y: 52, flip: true };
  if (warn === "co" || warn === "gas") return { x: 120, y: 50 };
  return { x: 144, y: 44 };
};

// Maintenance: a bubble beside the detector, a low battery (battery) or an exclamation mark (fault, end of life,
// unavailable), with the detector's chirp.
export const scBubble = (s, at) => `<g transform="translate(${at.x} ${at.y})">
      ${at.flip ? "" : `<path class="sc-chirp" d="M-8 -20q4 2 3 6M-4 -23q6 3 5 9"/>`}
      <path class="sc-bubble"${at.flip ? ' transform="scale(1 -1)"' : ""} d="M-6 -9H2L-4 -15V-9H22a4 4 0 0 1 4 4V7a4 4 0 0 1-4 4H-6a4 4 0 0 1-4-4V-5a4 4 0 0 1 4-4Z"/>
      <g${at.flip ? ' transform="translate(0 -2)"' : ""}>${
        s === "battery"
          ? `<rect class="sc-batt" x="-2" y="-3" width="20" height="9" rx="1.6"/><rect class="sc-batt-tip" x="18" y="-.4" width="2.2" height="3.8" rx=".6"/><rect class="sc-batt-low sc-blink" x="0" y="-1" width="4" height="5" rx=".6"/>`
          : `<text class="sc-excl" x="8" y="6" text-anchor="middle">!</text>`
      }</g>
    </g>`;

export const SC_SCENE_PARTS = { smoke: scSmoke, co: scCo, gas: scGas, leak: scLeak };

// The whole picture for a scene state, with the kinds of detector shown and the kind of the one needing a look. `uid`
// keeps each card's gradient apart on a page with several cards. No detector at all: the ceiling one, greyed.
export const scSceneSvg = (s, uid, kinds = [], warn) => `<svg class="sc-scene" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="sc-glow-${uid}"><stop offset="0" stop-color="#e5484d" stop-opacity=".45"/><stop offset="1" stop-color="#e5484d" stop-opacity="0"/></radialGradient>
      <linearGradient id="sc-fadeg-${uid}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="90" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
      <mask id="sc-fade-${uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="80"><rect width="200" height="80" fill="url(#sc-fadeg-${uid})"/></mask>
    </defs>
    ${scDoor(32)}${scDoor(188)}
    ${SC_SCENE_PARTS[s] ? SC_SCENE_PARTS[s](uid) : scQuiet(s, kinds, warn)}
    ${s === "battery" || s === "check" ? scBubble(s, scBubbleAt(warn)) : ""}
    ${s === "smoke" || !kinds.length || kinds.includes("smoke") ? scCeilingDetector(s, uid, warn) : ""}
  </svg>`;

// The banner: the scene, the ground strip, the title and the status on the wall at the left.
export const SC_SCENE_STYLE = `
  .hero { position: relative; overflow: hidden; height: 90px; margin: -12px -12px 0; color: #2a2620;
          --led: #43c463; --wall: #f2efe9; --ceil: #e6e1d8;
          background: linear-gradient(var(--ceil) 0 6px, var(--wall) 6px); }
  .hero.night { color: #fff; --wall: #2a2b33; --ceil: #33343e; }
  .hero.sc-battery, .hero.sc-check, .hero.sc-co { --led: #f5b400; }
  .hero.sc-smoke { --led: #e5484d; }
  .hero.sc-none { --led: #9aa3ae; }
  .sc-scene { position: absolute; right: 0; bottom: 10px; width: 200px; height: 80px; overflow: visible; }
  .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px;
            background: repeating-linear-gradient(90deg, #c99a6b 0 38px, #b98a5c 38px 40px); box-shadow: inset 0 2px 0 #a97c50; }
  .night .ground { background: repeating-linear-gradient(90deg, #4a3a2c 0 38px, #3e3024 38px 40px); box-shadow: inset 0 2px 0 #5c4836; }
  .hero .htext { position: absolute; left: 12px; top: 6px; bottom: 16px; right: 152px; display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: nowrap; }
  /* The text runs over the faded left of the scene (its mask fades it in from x 0 to 90). */
  .hero .htext::after { content: none; }
  .hero .badge { position: relative; background: rgba(255,255,255,.72); box-shadow: 0 0 0 1px rgba(60,50,40,.14), 0 1px 3px rgba(60,50,40,.16); }
  .hero.night .badge { background: rgba(255,255,255,.12); box-shadow: 0 0 0 1px rgba(255,255,255,.14); }
  .hero .titles { flex: 1 1 auto; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; column-gap: 8px; row-gap: 2px; }
  .hero .titles > * { flex: 1 0 100%; min-width: 0; }
  /* The title, then its status pill 8 px after it, centred on it, while the whole title and the pill's whole label fit
     on that row; otherwise (measured by the card, see _fitPill) the pill on its own line under the subtitle
     (data-wrap), and its dot alone (data-dot) when even then the text would run into the floor strip. */
  .hero .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .hero .title { flex: 0 1 auto; min-width: 0; color: inherit; font-weight: 600; line-height: 1.25;
                 white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hero .hpill { flex: none; display: inline-flex; align-items: center; gap: 4px; max-width: none; min-width: 0; box-sizing: border-box;
                 padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; overflow: hidden;
                 background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #0d2a45); }
  .hero.night .hpill { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #ffffff); }
  .hero .hpill .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); flex: none; }
  .hero .hpill .pt { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .hero .sub { font-size: 12px; line-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #5b5346; }
  .hero.night .sub { color: rgba(255,255,255,.78); }
  :host([hide-title]) .hero .title { display: none; }
  .hero[data-wrap] .trow { display: contents; }
  .hero[data-wrap] .title { flex: 1 0 100%; }
  .hero[data-wrap] .sub { order: 1; }
  .hero[data-wrap] .hpill { order: 2; max-width: 100%; }
  .hero[data-dot] .hpill { padding: 5px; }
  .hero[data-dot] .hpill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  /* Narrower still: only the pill's coloured dot, on the title line (its text stays its tooltip and label). */
  @container (max-width: 200px) {
    .hero .hpill { padding: 5px; }
    .hero .hpill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  }
  /* The zoom button of the mini card: round, frosted, in the top right corner of the banner. */
  .hero .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; margin: 0; width: 24px; height: 24px; border-radius: 50%;
                color: #33506b; background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); backdrop-filter: blur(4px); }
  .hero .zoom:hover { background: rgba(255,255,255,.75); color: #33506b; }
  .hero.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
  .hero.night .zoom:hover { background: rgba(255,255,255,.22); color: #fff; }
  /* Narrow card: no room for the scene beside the text, the wall alone stays. */
  @container (max-width: 300px) { .sc-scene { display: none; } .hero .htext { right: 36px; } }
  .sc-frame { fill: #e2dccf; } .sc-door { fill: #fff; } .sc-knob { fill: #c9b9a0; }
  .night .sc-frame { fill: #3a3a48; } .night .sc-door { fill: #4a4a58; } .night .sc-knob { fill: #6b6b7c; }
  .sc-det { fill: #fff; stroke: #c9ced6; stroke-width: .5; } .sc-det-base { fill: #d9dde3; }
  .sc-det-vent { stroke: #c9ced6; stroke-width: .5; fill: none; stroke-linecap: round; }
  .night .sc-det { fill: #d8dce2; stroke: #9aa3ae; } .night .sc-det-base { fill: #9aa3ae; }
  .sc-led { fill: var(--led); } .sc-led.ok { fill: #43c463; } .night .sc-led { filter: drop-shadow(0 0 1.2px var(--led)); }
  .sc-none .sc-det { opacity: .75; }
  .sc-ping { fill: none; stroke: #e5484d; stroke-width: 1.1; transform-box: fill-box; transform-origin: center; animation: sc-ping 2s ease-out infinite; }
  .sc-ping.amber { stroke: #f5b400; }
  .sc-ping.d2 { animation-delay: -1s; }
  .sc-glow { animation: sc-pulse 1.6s ease-in-out infinite; }
  .sc-blink { animation: sc-blink 1.2s steps(2) infinite; }
  .sc-puff { fill: #b4b2a9; opacity: .6; animation: sc-drift 4s ease-in-out infinite; }
  .sc-puff.p1 { animation-delay: -1.3s; } .sc-puff.p2 { animation-delay: -2.6s; }
  .night .sc-puff { fill: #6a6f7a; }
  .sc-haze { opacity: .16; animation: sc-pulse 3s ease-in-out infinite; } .sc-haze.co { fill: #f5b400; } .sc-haze.gas { fill: #9ccc3c; }
  .sc-boiler { fill: #fff; stroke: #c9ced6; } .sc-boiler-win { fill: #2c3034; } .sc-boiler-dial { fill: #e8eef3; stroke: #9aa3ae; stroke-width: .7; }
  .sc-pipe { stroke: #9aa3ae; stroke-width: 2.4; fill: none; }
  .night .sc-boiler { fill: #3d4248; stroke: #5a6068; } .night .sc-boiler-dial { fill: #2c3034; }
  .sc-flame { fill: #ef9f27; transform-box: fill-box; transform-origin: 50% 100%; animation: sc-flicker .9s ease-in-out infinite alternate; }
  .sc-box { fill: #fff; stroke: #c9ced6; } .night .sc-box { fill: #d8dce2; stroke: #9aa3ae; }
  .sc-co { font: 700 10px/1 Roboto, Arial, sans-serif; fill: #d68f00; }
  .sc-led-amber { fill: #f5b400; } .sc-led-red { fill: #e5484d; }
  .sc-gas-ic { fill: #e5484d; } .sc-gas-ic.calm { fill: #9aa3ae; } .sc-co.calm { fill: #9aa3ae; }
  .sc-cooker { fill: #f4f5f7; stroke: #c9ced6; } .sc-hob { fill: #5d6570; } .sc-oven { fill: #2c3034; } .sc-knob2 { fill: #9aa3ae; }
  .night .sc-cooker { fill: #3d4248; stroke: #5a6068; }
  .sc-fume { fill: none; stroke: #8fb83a; stroke-width: 1.6; stroke-linecap: round; opacity: 0; animation: sc-rise 2.4s ease-out infinite; }
  .sc-fume.f1 { animation-delay: -.8s; } .sc-fume.f2 { animation-delay: -1.6s; }
  .sc-wpipe { fill: none; stroke: #9aa3ae; stroke-width: 4; } .sc-wjoint { fill: #7d8894; }
  .sc-drip { fill: #4fb3e8; animation: sc-drip 1.6s ease-in infinite; } .sc-drip.d2 { animation-delay: -.8s; }
  .sc-puddle { fill: #4fb3e8; opacity: .55; transform-box: fill-box; transform-origin: center; animation: sc-spread 2.4s ease-in-out infinite; }
  .sc-puck { fill: #fff; stroke: #c9ced6; stroke-width: .6; } .sc-puck-top { fill: #fff; stroke: #e5484d; stroke-width: .9; } .sc-puck-top.calm { stroke: #c9ced6; stroke-width: .6; }
  .night .sc-puck, .night .sc-puck-top { fill: #d8dce2; }
  .sc-bubble { fill: #fff; stroke: #f5b400; stroke-width: 1; } .night .sc-bubble { fill: #3a3b46; }
  .sc-batt { fill: none; stroke: #5d6570; stroke-width: 1.2; } .sc-batt-tip { fill: #5d6570; } .sc-batt-low { fill: #e5484d; }
  .night .sc-batt { stroke: #c9ced6; } .night .sc-batt-tip { fill: #c9ced6; }
  .sc-excl { font: 700 13px/1 Roboto, Arial, sans-serif; fill: #d68f00; }
  .sc-chirp { fill: none; stroke: #f5b400; stroke-width: 1.1; stroke-linecap: round; animation: sc-blink 1.2s steps(2) infinite; }
  @keyframes sc-ping { from { transform: scale(1); opacity: .9; } to { transform: scale(3.2); opacity: 0; } }
  @keyframes sc-pulse { 50% { opacity: .35; } }
  @keyframes sc-blink { 50% { opacity: .15; } }
  @keyframes sc-drift { 50% { transform: translate(-4px, 2px); } }
  @keyframes sc-flicker { from { transform: scaleY(.8); } to { transform: scaleY(1.1); } }
  @keyframes sc-rise { 0% { opacity: 0; transform: translateY(4px); } 30% { opacity: .8; } 100% { opacity: 0; transform: translateY(-8px); } }
  @keyframes sc-drip { from { transform: translateY(0); opacity: 1; } to { transform: translateY(28px); opacity: 0; } }
  @keyframes sc-spread { 50% { transform: scaleX(1.1); } }
  .no-blink .sc-blink, .no-blink .sc-ping, .no-blink .sc-glow, .no-blink .sc-chirp { animation: none; }
  @media (prefers-reduced-motion: reduce) { .hero * { animation: none !important; } }
`;
