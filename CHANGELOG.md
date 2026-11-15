# Changelog

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
