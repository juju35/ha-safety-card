# Changelog

## 1.2.0 - 2026-11-17

### Features
- **Illustrated header** on the safety card and the safety mini card (90 px on both): an animated hallway on a parquet strip, the title and the status on the wall at the left, the detectors drawn big at the right. The scene follows the state of the home: all clear, smoke, carbon monoxide, gas, water leak, low battery or another maintenance need. The icon badge is coloured by the status, day and night. Night when `sun.sun` is below the horizon or with the dark theme (even while the sun is up), or forced with `illustration_theme: day | night`; `illustration: false` keeps the classic header. Animations stop with `blink: false` (alarm ones) or when the system asks for reduced motion. Both options are in the visual editors.
- On the illustrated header the status is a pill right after the title (the alarm, the count to check or all clear, in the status colour), beside the title only while the whole title and the pill's whole label fit on that row (measured in the real fonts, so in every language), otherwise on its own line under the subtitle, keeping its dot alone when even that would not fit above the floor strip and below 200 px; the classic header (`illustration: false`) moves its pill to a line of its own by the same measure; the subtitle names the detectors sounding or needing a look. The mini card's zoom button is a small round frosted button in the top right corner of the banner.

## 1.1.0 - 2026-11-16

### Features
- **Water leak detectors** are now discovered alongside smoke, carbon monoxide and gas: any `moisture` binary sensor (Aqara, Fibaro, Shelly, Zigbee, Z-Wave…) shows as a detector, in red when wet (*Water leak*), with its battery and maintenance read like the others. No configuration needed; `exclude` or `entities` still apply.

## 1.0.1 - 2026-11-16

### Fixes
- Overview tiles keep a neutral background at every level (tile look B); the state reads from the tinted icon badge, the coloured state line and the per-detector chips. An alarm still stands out in red without tinting the whole tile.

## 1.0.0 - 2026-11-14

### Features
- **Safety card** (`custom:safety-card`): the smoke, carbon monoxide and gas detectors of the whole home or of a room, one tile per detector (all the alarm sensors of a device on one tile). Alarms first, in red and blinking, with how long they have been sounding; an **alarm banner** under the header with where, since when, the other detectors sounding, a **Silence** button (the devices' own silence buttons) and a **Details** button.
- **Maintenance**: a low battery (under `battery_threshold`, 20 % by default, or a *battery low* binary sensor), an end of life, a fault or an unavailable detector needs a look (orange); the header counts them. Quiet detectors show their carbon monoxide level when they report one.
- **Test all**: when the detectors have a test button and no alarm is on, a first tap arms the button for 5 seconds, the second one presses every test button.
- **Safety mini card** (`custom:safety-mini-card`): the detectors on two lines, only the alarms and the detectors needing a look as pills, with a zoom to the full card.
- **Safety overview card** (`custom:safety-overview-card`): every room with a detector, coloured by its most serious one, with a chip per detector; the rooms needing a look first, a detail button for every room, header chips counting the low batteries, the detectors to replace, the faults and the unavailable ones. A tap on a room unfolds its safety card.
- Options: `area`, `title`, `show_title`, `navigation_path`, `columns`, `layout` (`compact` or `tiles`), `only_alerts`, `hide_when_clear`, `banner`, `test_button`, `blink`, `battery_threshold`, `include`, `exclude`, `entities`, `language`; on the overview `sort`, `zoom`, `exclude_areas`, `rooms`. All in the visual editor.
- Labels in 22 languages (English in the bundle, the others loaded on demand), light and dark themes, screenshots and alarm animations in both.
