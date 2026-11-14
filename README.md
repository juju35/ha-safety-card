# ha-safety-card

[![Marketplace](https://img.shields.io/badge/Marketplace-Custom-41BDF5.svg)](https://www.home-assistant.io/integrations/marketplace/)
[![HACS Validation](https://github.com/juju35/ha-safety-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/juju35/ha-safety-card/actions/workflows/hacs.yml)
[![Validate](https://github.com/juju35/ha-safety-card/actions/workflows/validate.yml/badge.svg)](https://github.com/juju35/ha-safety-card/actions/workflows/validate.yml)
[![Lint](https://github.com/juju35/ha-safety-card/actions/workflows/lint.yml/badge.svg)](https://github.com/juju35/ha-safety-card/actions/workflows/lint.yml)
[![Release](https://img.shields.io/github/v/release/juju35/ha-safety-card)](https://github.com/juju35/ha-safety-card/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/juju35/ha-safety-card/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/julienstep9)

<p align="center"><img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/icon.svg" alt="Safety Cards" width="120"></p>

<p align="center">
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/nest.svg" alt="Google Nest" height="28">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/netatmo.svg" alt="Netatmo" height="28">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/kidde.svg" alt="Kidde" height="28">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/x-sense.svg" alt="X-Sense" height="28">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/aqara.svg" alt="Aqara" height="28">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/heiman.svg" alt="Heiman" height="28">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/frient.svg" alt="frient" height="28">
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/ajax.svg" alt="Ajax" height="20">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/fibaro.svg" alt="Fibaro" height="28">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/shelly.svg" alt="Shelly" height="28">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/somfy.svg" alt="Somfy" height="24">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/zigbee.svg" alt="Zigbee" height="28">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/z-wave.svg" alt="Z-Wave" height="24">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/matter.svg" alt="Matter" height="24">
</p>

Lovelace cards for Home Assistant's **smoke, carbon monoxide and gas detectors**: an alarm comes first, large, with where and since when; then what needs a look (low battery, end of life, fault, unavailable); then the quiet detectors. Add a card, it finds every detector of the home (or of a room) by itself, whatever the integration.

[![Open your Home Assistant instance and open a repository inside the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-safety-card&category=plugin)

| Card | Type | What it shows |
|---|---|---|
| [Safety](#safety) | `custom:safety-card` | The detectors of the home or of a room: an alarm banner, one tile per detector, a “Test all” button. |
| [Safety mini](#safety-mini) | `custom:safety-mini-card` | The same detectors on two lines: only the alarms and the detectors needing a look, with a zoom to the full card. |
| [Safety overview](#safety-overview) | `custom:safety-overview-card` | Every room with a detector at a glance; tap a room to unfold its safety card. |

| All clear | Maintenance | Smoke alarm | Every room |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-clear.png" alt="All clear" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-maintenance.png" alt="Maintenance" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-alarm.gif" alt="Smoke alarm" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-overview-all.png" alt="Every room" width="400"> |

The cards share the look of the other ha-* cards (header with a status pill, compact tiles), a visual editor covering every option (`entities` and `rooms` as YAML in its folded **Advanced** section), labels in 22 languages following the Home Assistant language, light and dark themes, and come in a single Marketplace install with no dependency.

## Features

### Safety

`custom:safety-card` — The smoke, carbon monoxide and gas detectors of the whole home, or of one room (`area`).

- **One tile per detector**: a detector is a device, with all its alarm sensors (a smoke + gas detector is one tile, *Smoke + Gas*); an alarm sensor with no device is a detector of its own
- **Alarm first**: the detector sounding goes to the top, in red, with a blinking icon and how long it has been sounding (*Smoke detected · 2 min*); the header pill names the alarm and its room (*Smoke detected · Kitchen*) and the badge pulses
- **Alarm banner** under the header (`banner`): what, where and since when, the other detectors sounding (*also Living room*), a **Silence** button when the detectors have one (a `button` entity named *silence*, *hush* or *mute*) and a **Details** button that opens the alarm's dialog
- **Maintenance** in orange, read from the detector's own entities: a battery level under `battery_threshold` (20 % by default) or a *battery low* binary sensor (*Battery 18%*), an end-of-life problem sensor (*Replace soon*), any other problem sensor (*Fault*), and an alarm sensor that cannot report (*Unavailable*: a silent detector is no all-clear); the header counts them (*2 to check*)
- **Quiet detectors** in green, with the carbon monoxide level when the detector reports one (*CO · 2 ppm*)
- **Test all** (`test_button`): shown when the detectors have a test button (a `button` entity named *test* or *self-test*) and no alarm is on; a first tap arms it for 5 seconds (*Tap again to test (loud)*), the second one presses every test button
- **Names**: for the whole home, each detector is named after its room (with the device's name when the room has several); in a room, after its device, without the room's name
- `only_alerts` shows only the detectors in alarm or needing a look; `hide_when_clear` hides the whole card when everything is fine
- A tap on a tile opens the detector's dialog; `layout: tiles` gives large tiles, easier to tap on a phone

### Safety mini

`custom:safety-mini-card` — The detectors on two lines: the badge, the title and the status, then a tinted pill for each detector in alarm (red, blinking) or needing a look (orange). Quiet detectors only show once zoomed in: the **zoom** button (top right) opens the full card in place, and a click anywhere else folds it back (`zoom: false` removes the button).

### Safety overview

`custom:safety-overview-card` — Every room with a detector, at a glance.

- One tile per room, coloured by its most serious detector: *Smoke detected* (red, blinking), *Battery 18%*, *Replace soon* or *2 to check* (orange), *All clear*; under the name, one small chip per detector, tinted by its state
- Header with the home status (same as a home-wide safety card) and chips counting the low batteries, the detectors to replace, the faults and the unavailable ones
- Only the rooms needing a look show; the **detail** button (top right) shows every room, and back (`zoom: false`: every room, always); rooms needing a look come first (`sort: state`, the default) or by name (`sort: name`)
- **Tap** a room to unfold its safety card at the top of the card (banner, tiles, test button); tap it again or anywhere else to fold it back
- `rooms` reorders the rooms and overrides their name, icon or `navigation_path` (a tap then opens that dashboard instead of unfolding)
- Detectors with no room (or whose room was deleted) gather in an **Other** tile: their alarms always reach the header
- Excluding one alarm sensor of a combined detector (`exclude`) leaves the whole detector out

## Supported integrations

The cards read Home Assistant's own device classes, so any integration that exposes a smoke (`smoke`), carbon monoxide (`carbon_monoxide`) or gas (`gas`) binary sensor works. What else a tile shows depends on what the integration exposes for the device.

| | Integration | Detectors |
|:---:|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/nest.svg" alt="Google Nest" height="20"> | [Nest Protect](https://github.com/iMicknl/ha-nest-protect) (Marketplace) | Google Nest Protect |
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/netatmo.svg" alt="Netatmo" height="20"> | [Netatmo](https://www.home-assistant.io/integrations/netatmo/) (built in) | Netatmo smart smoke and CO alarms |
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/zigbee.svg" alt="Zigbee" height="20"> | [Zigbee Home Automation](https://www.home-assistant.io/integrations/zha/) (built in) and [Zigbee2MQTT](https://www.zigbee2mqtt.io/) | Aqara, Heiman, frient, X-Sense, Tuya… |
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/z-wave.svg" alt="Z-Wave" height="17"> | [Z-Wave](https://www.home-assistant.io/integrations/zwave_js/) (built in) | Fibaro, Kidde, First Alert… |
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/matter.svg" alt="Matter" height="17"> | [Matter](https://www.home-assistant.io/integrations/matter/) (built in) | Matter smoke and CO alarms |
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/shelly.svg" alt="Shelly" height="20"> | [Shelly](https://www.home-assistant.io/integrations/shelly/) (built in) | Shelly Plus Smoke |
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/somfy.svg" alt="Somfy" height="17"> | [Overkiz](https://www.home-assistant.io/integrations/overkiz/) (built in) | Somfy smoke detectors |
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/ajax.svg" alt="Ajax" height="14">&nbsp;<img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/kidde.svg" alt="Kidde" height="20">&nbsp;<img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/images/x-sense.svg" alt="X-Sense" height="20"> | Ajax, Kidde HomeSafe, X-Sense and other brand integrations | Their smoke, CO and gas detectors |

The battery, end-of-life, fault, CO level, test and silence entities are only shown when the integration exposes them for the device (see [How it works](#how-it-works)).

An integration missing from this list works too as soon as its detector is a smoke, CO or gas binary sensor; open an issue with its entities if a maintenance sensor is not picked up.

## Installation

### Via the Marketplace (recommended)

Click the button below to add the repository directly:

[![Add to the Marketplace](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-safety-card&category=plugin)

Or manually:

1. Open **Settings → Marketplace → Add from link** (top right; this needs a GitHub account connected)
2. Add `https://github.com/juju35/ha-safety-card` — Type: **Dashboard**
3. Open **Safety Cards** and click **Install**
4. Clear your browser cache and refresh

The Marketplace registers the dashboard resource for you.

### Manual

1. Download `ha-safety-card.js` and the `ha-safety-card.i18n.*.js` translation files from the [latest release](https://github.com/juju35/ha-safety-card/releases/latest)
2. Copy them all to `/config/www/` (without the translation files, the cards show in English)
3. Go to **Settings → Dashboards → Resources** → Add resource:
   - URL: `/local/ha-safety-card.js`
   - Type: **JavaScript Module**
4. Clear your browser cache and refresh

## Configuration

Every option is in the visual editor. In YAML:

```yaml
# The whole home
type: custom:safety-card

# One room, only what needs a look
type: custom:safety-card
area: kitchen
only_alerts: true

# Two lines on a phone dashboard
type: custom:safety-mini-card

# Every room
type: custom:safety-overview-card
```

### Safety and Safety mini

| Option | Type | Default | Description |
|---|---|---|---|
| `area` | string | | Area ID; empty: the whole home |
| `title` | string | area name, else *Home safety* | Card title |
| `show_title` | boolean | `true` | Show the title (the pill and buttons stay in place) |
| `navigation_path` | string | | A tap on the header opens this dashboard path |
| `columns` | number | `2` | Tiles per row (1–4); one per row on a narrow card |
| `layout` | `compact` \| `tiles` | `compact` | `tiles`: large tiles, the size of Home Assistant's Tile card |
| `only_alerts` | boolean | `false` | Full card only: show only the detectors in alarm or needing a look (always the case in the mini card's compact view) |
| `hide_when_clear` | boolean | `false` | Hide the card when every detector is fine |
| `banner` | boolean | `true` | The alarm banner under the header (full card) |
| `test_button` | boolean | `true` | The “Test all” button, when the detectors have a test button |
| `blink` | boolean | `true` | Blink the alarmed detectors and pulse the badge |
| `battery_threshold` | number | `20` | Battery level (%) under which a detector needs a look |
| `include` | list | | Detectors to add (from another room, or with no room) |
| `exclude` | list | | Detectors to leave out |
| `entities` | list | | Advanced (YAML): replaces the discovery; entity IDs of alarm sensors, or `{entity, name, icon}` |
| `language` | string | Home Assistant's | Advanced: one of the [languages](#translations) |
| `zoom` | boolean | `true` | Mini card only: the zoom button |

### Safety overview

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | string | *Home safety* | Card title |
| `show_title` | boolean | `true` | Show the title |
| `columns` | number | `3` | Room tiles per row (1–6) |
| `sort` | `state` \| `name` | `state` | Rooms needing a look first, or by name |
| `zoom` | boolean | `true` | Only the rooms needing a look, with a detail button showing every room; `false`: every room, always |
| `battery_threshold` | number | `20` | Battery level (%) under which a detector needs a look |
| `exclude_areas` | list | | Rooms to leave out |
| `exclude` | list | | Detectors to leave out |
| `rooms` | list | | Advanced (YAML): order and overrides, `{area, name, icon, navigation_path}` |
| `language` | string | Home Assistant's | Advanced: one of the [languages](#translations) |

## Screenshots

### Safety

| Maintenance | All clear | Smoke alarm |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-maintenance.png" alt="Maintenance" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-clear.png" alt="All clear" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-alarm.png" alt="Smoke alarm" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-maintenance-dark.png" alt="Maintenance, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-clear-dark.png" alt="All clear, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-alarm-dark.png" alt="Smoke alarm, dark" width="400"> |

| One room (`area`) | Large tiles (`layout: tiles`) |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-room.png" alt="One room" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-tiles.png" alt="Large tiles" width="320"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-room-dark.png" alt="One room, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-tiles-dark.png" alt="Large tiles, dark" width="320"> |

**Alarm animation**: the detectors sounding blink, the banner's icon blinks with them and the header badge pulses (steady with `blink: false`, or when the system asks for reduced motion).

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-alarm.gif" alt="Smoke alarm animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-alarm-dark.gif" alt="Smoke alarm animation, dark" width="400"> |

### Safety mini

| Maintenance | All clear | Smoke alarm | Zoomed in |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-mini-maintenance.png" alt="Mini, maintenance" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-mini-clear.png" alt="Mini, all clear" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-mini-alarm.gif" alt="Mini, smoke alarm" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-mini-zoom.png" alt="Mini, zoomed in" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-mini-maintenance-dark.png" alt="Mini, maintenance, dark" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-mini-clear-dark.png" alt="Mini, all clear, dark" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-mini-alarm-dark.gif" alt="Mini, smoke alarm, dark" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-mini-zoom-dark.png" alt="Mini, zoomed in, dark" width="400"> |

### Safety overview

| Rooms needing a look | Every room | A room unfolded | Smoke alarm |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-overview-check.png" alt="Overview, rooms needing a look" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-overview-all.png" alt="Overview, every room" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-overview-room.png" alt="Overview, a room unfolded" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-overview-alarm.png" alt="Overview, smoke alarm" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-overview-check-dark.png" alt="Overview, rooms needing a look, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-overview-all-dark.png" alt="Overview, every room, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-overview-room-dark.png" alt="Overview, a room unfolded, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-safety-card/main/screenshots/safety-overview-alarm-dark.png" alt="Overview, smoke alarm, dark" width="400"> |

## How it works

- **Discovery**: every visible `binary_sensor` with the `smoke`, `carbon_monoxide` or `gas` device class (configuration and diagnostic entities left out), in the card's area or anywhere in the home; `include` adds others, `exclude` leaves some out, `entities` replaces the discovery
- **Detectors**: the alarm sensors are grouped by device; the device's other entities give the battery (`battery` sensor or binary sensor), the maintenance needs (`problem` binary sensors: end of life when its name says so, a fault otherwise), the carbon monoxide level (`carbon_monoxide` sensor) and the test and silence buttons (`button` entities, from their name)
- **Levels**: an active alarm sensor is an alarm (red); a detector that cannot report, a low battery, an end of life or a fault needs a look (orange); everything else is fine (green)
- **Actions**: a tap on a tile opens the alarm sensor's dialog; **Silence** and **Test all** press the devices' own buttons (`button.press`), nothing else

## Development

```bash
npm install
npm run build        # stamps the version of package.json into dist/ha-safety-card.js
npm run check        # builds and checks the bundle (run in CI)
npm test             # unit tests
npm run screenshots  # renders the cards with a mock home into screenshots/ (and the alarm GIFs, needs ffmpeg)
```

`dist/` is not committed: `npm run build` creates it locally, CI builds it on every push, and the release workflow attaches the built files to the release, which is where the Marketplace installs them from.

### Releasing

1. Bump `version` in `package.json`
2. Add a `## <version>` section at the top of [CHANGELOG.md](https://github.com/juju35/ha-safety-card/blob/main/CHANGELOG.md)
3. Push to `main`: the **Release** workflow builds the cards, creates the tag and the GitHub release with the changelog section as notes, and attaches `ha-safety-card.js` and its translation files

## Translations

The cards auto-detect the language from your Home Assistant settings. Currently supported:

| Language | Code |
|---|---|
| English | `en` |
| Français | `fr` |
| Deutsch | `de` |
| Español | `es` |
| Српски | `sr` |
| Srpski (latinica) | `sr-Latn` |
| Italiano | `it` |
| Nederlands | `nl` |
| Português (Portugal) | `pt` |
| Polski | `pl` |
| Română | `ro` |
| Dansk | `da` |
| Svenska | `sv` |
| Български | `bg` |
| Русский | `ru` |
| Українська | `uk` |
| Magyar | `hu` |
| Slovenčina | `sk` |
| Čeština | `cs` |
| Slovenščina | `sl` |
| Latviešu | `lv` |
| Ελληνικά | `el` |

Contributions for additional languages are welcome!

## License

[MIT](https://github.com/juju35/ha-safety-card/blob/main/LICENSE)

## Support

If you find this project useful, you can support its development:

<a href="https://buymeacoffee.com/julienstep9"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" height="50"></a>
