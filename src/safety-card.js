/**
 * safety-card / safety-mini-card: the smoke, carbon monoxide, gas and water leak detectors of a room, or of the whole home. Alarms come
 * first, with a banner; then what needs a look (battery, end of life, fault, unavailable); then the quiet ones.
 * https://github.com/juju35/ha-safety-card
 */

// ── Illustration ─────────────────────────────────────────────────────────────
// The header's picture: a hallway (wall, ceiling, two doors) at the right of a 90 px banner, on a 10 px parquet strip
// that runs under the whole banner. The 200 × 80 scene sits on the strip at 1:1, its floor at y 80; the left of the
// banner is the wall alone, under the title. The detectors are drawn big and change with the state of the home:
// all clear (green light), smoke (cloud, red light, alarm rings), CO (boiler, CO detector, amber air), gas (cooker, gas
// detector, fumes), water leak (pipe, drips, puddle, floor sensor), battery low or another maintenance need (amber
// light, a bubble). Only the kinds of detector the card shows are drawn: a home with a single leak sensor gets the
// pipe and the floor sensor, no ceiling smoke detector. Its colours come from classes, so that night only switches a
// class on the banner.

// Scene of a summary: the alarm's kind, a maintenance need, all clear, or no detector.
const scSceneState = (sum, items) => {
  if (sum.level === "alert") return sum.top;
  if (sum.level === "warn") return items.some((i) => i.level === "warn" && !i.unavailable && scWarnKey(i) === "battery") ? "battery" : "check";
  return sum.level;
};

// Night picture: forced by illustration_theme, else Home Assistant's dark mode alone (a light theme keeps the day
// picture after sunset).
const scIsNight = (hass, config) => {
  const theme = config.illustration_theme;
  if (theme === "night") return true;
  if (theme === "day") return false;
  return !!hass?.themes?.darkMode;
};

// The kinds of detector among the card's detectors, in SC_KINDS order.
const scKindsOf = (items) => SC_KINDS.filter((k) => items.some((i) => i.kinds?.includes(k)));

let scUidNext = 0;

// A quiet detector's light: amber and blinking for the one needing a look (the scene's --led), green for the others.
const scLedCls = (s, kind, warn) => (s === "battery" || s === "check" ? (kind === warn ? "sc-led sc-blink" : "sc-led ok") : "sc-led");

// The ceiling smoke detector, 73 px wide, its light coloured by the scene (--led).
const scCeilingDetector = (s, uid, warn) => {
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

const scDoor = (x) =>
  `<g transform="translate(${x} 80)"><rect class="sc-frame" x="-13" y="-58" width="26" height="58"/><rect class="sc-door" x="-10.5" y="-55.5" width="21" height="55.5"/><circle class="sc-knob" cx="6.5" cy="-27" r="1.3"/></g>`;

// Smoke: a cloud around the ceiling detector, drifting.
const scSmoke = () =>
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
const scCo = (uid) => `<rect class="sc-haze co" x="0" y="6" width="200" height="74" mask="url(#sc-fade-${uid})"/>
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
const scGas = (uid) => `<rect class="sc-haze gas" x="0" y="6" width="200" height="74" mask="url(#sc-fade-${uid})"/>
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
const scLeak = () => `<path class="sc-wpipe" d="M200 30H136a4 4 0 0 0-4 4v4"/>
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
const scWallBoxes = (kinds, warn) => {
  const wall = kinds.filter((k) => k === "co" || k === "gas").sort((a, b) => (a === warn) - (b === warn));
  return wall.map((k, i) => [k, 98 - 28 * (wall.length - 1 - i)]);
};
const scQuiet = (s, kinds, warn) => {
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
const scBubbleAt = (warn) => {
  if (warn === "leak") return { x: 138, y: 52, flip: true };
  if (warn === "co" || warn === "gas") return { x: 120, y: 50 };
  return { x: 144, y: 44 };
};

// Maintenance: a bubble beside the detector, a low battery (battery) or an exclamation mark (fault, end of life,
// unavailable), with the detector's chirp.
const scBubble = (s, at) => `<g transform="translate(${at.x} ${at.y})">
      ${at.flip ? "" : `<path class="sc-chirp" d="M-8 -20q4 2 3 6M-4 -23q6 3 5 9"/>`}
      <path class="sc-bubble"${at.flip ? ' transform="scale(1 -1)"' : ""} d="M-6 -9H2L-4 -15V-9H22a4 4 0 0 1 4 4V7a4 4 0 0 1-4 4H-6a4 4 0 0 1-4-4V-5a4 4 0 0 1 4-4Z"/>
      <g${at.flip ? ' transform="translate(0 -2)"' : ""}>${
        s === "battery"
          ? `<rect class="sc-batt" x="-2" y="-3" width="20" height="9" rx="1.6"/><rect class="sc-batt-tip" x="18" y="-.4" width="2.2" height="3.8" rx=".6"/><rect class="sc-batt-low sc-blink" x="0" y="-1" width="4" height="5" rx=".6"/>`
          : `<text class="sc-excl" x="8" y="6" text-anchor="middle">!</text>`
      }</g>
    </g>`;

const SC_SCENE_PARTS = { smoke: scSmoke, co: scCo, gas: scGas, leak: scLeak };

// The whole picture for a scene state, with the kinds of detector shown and the kind of the one needing a look. `uid`
// keeps each card's gradient apart on a page with several cards. No detector at all: the ceiling one, greyed.
const scSceneSvg = (s, uid, kinds = [], warn) => `<svg class="sc-scene" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
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
const SC_SCENE_STYLE = `
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

  _bindAfter(root) {
    const items = this._items || [];
    const press = (ids) => ids.length && rcCall(this._hass, "button", "press", { entity_id: ids });
    root.querySelector(".act-silence")?.addEventListener("click", () => press(items.filter((i) => i.level === "alert" && i.silence).map((i) => i.silence)));
    root.querySelector(".act-details")?.addEventListener("click", () => {
      const first = items.find((i) => i.level === "alert");
      if (first) rcMoreInfo(this, first.id);
    });
    root.querySelector(".act-test")?.addEventListener("click", () => {
      clearTimeout(this._armTimer);
      if (this._armed) press(items.filter((i) => i.test).map((i) => i.test));
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

  // The compact view with the illustration: the full card's banner (same height), then the chips under it.
  _paintHero(v, items, chips, cls) {
    const c = this._config;
    this.shadowRoot.innerHTML = `
      <style>${RC_BASE_STYLES}${this.constructor.styles}</style>
      <ha-card class="lvl-${v.level}${cls} ill mini-ill">
        ${this._hero(v, items, c.title || this._areaName() || this._t("title"))}
        <div class="rs">${chips}</div>
      </ha-card>`;
    const root = this.shadowRoot;
    if (c.navigation_path) rcBindNav(root.querySelector(".head"), c.navigation_path);
    for (const el of root.querySelectorAll(".r")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
  }

  // On the banner, the zoom button sits at its top right corner.
  _zoomHost() {
    return this.shadowRoot.querySelector(".hero") || super._zoomHost();
  }
}

const SafetyMiniCardEditor = rcEditor({
  card: SafetyMiniCard,
  helpers: [...SC_CARD_HELPERS, "zoom"],
  schema: scSchema(SafetyMiniCard, ["show_title", "illustration", "hide_when_clear", "test_button", "blink", "zoom"]),
});

rcRegister(
  SafetyMiniCard,
  SafetyMiniCardEditor,
  "Safety Mini Card",
  "The detectors on two lines: alarms and maintenance first, with a zoom to the full card",
);
