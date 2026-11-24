// ── Overviews ────────────────────────────────────────────────────────────────
// Shared by room-overview-card and room-environment-overview-card.
import { rcEsc, rcInDialog, rcMemo, rcT } from "./helpers.js";

// Visible entities accepted by `match(id)`, with their area, minus the config's `exclude`: the registries are
// scanned again only when they or the config change.
export const rcByArea = (card, match) => {
  const h = card._hass;
  const c = card._config;
  return rcMemo((card._memo ||= {}), "byArea", [c, h.entities, h.devices], () => {
    const excluded = new Set(c.exclude || []);
    const out = [];
    for (const [id, r] of Object.entries(h.entities || {})) {
      if (r.hidden || excluded.has(id) || !match(id)) continue;
      const aid = card._areaOf(id);
      if (aid) out.push([id, aid]);
    }
    return out;
  });
};

// Rooms in the order of the config's `rooms` list, then, with `sort: state`, the highest `rank(room)` first,
// then by name.
export const rcSortRooms = (list, config, rank) => {
  const order = (config.rooms || []).map((x) => x.area);
  return list.sort((a, b) => {
    if (order.length) {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      if (ia !== ib) return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
    }
    return (config.sort === "state" ? rank(b) - rank(a) : 0) || a.name.localeCompare(b.name);
  });
};

// The overviews only show the rooms needing a look until their detail button (`zoom`, on by default) is pressed;
// `zoom: false` shows every room, with no button.
export const rcCompact = (card) => card._config.zoom !== false && !card._zoomed;

// The zoom / detail button: the same icons on the overviews and the mini cards.
export const rcZoomIcon = (card) => (card._zoomed ? "mdi:arrow-collapse" : "mdi:arrow-expand");

// The detail button of an overview header, at its end.
export const rcZoomButton = (card) =>
  card._config.zoom === false
    ? ""
    : `<button class="zoom" title="${rcEsc(card._t(card._zoomed ? "rooms_check" : "rooms_all"))}"><ha-icon icon="${rcZoomIcon(card)}"></ha-icon></button>`;

// Back to the compact view (mini card, or overview showing the rooms needing a look), when zoomed in.
export const rcUnzoom = (card) => {
  if (!card._zoomed) return;
  card._zoomed = false;
  card._sig = null;
  card._render();
};

// Patch a part of the shadow DOM in place from new HTML, instead of rewriting it: Home Assistant sends a new state
// several times a second, and a rewrite replaced every node — the banner's picture redrawn and its animations
// started over, the tile under the pointer or the keyboard focus replaced, and for a frame the browser laid out a
// new tree, which moved the dashboard. Nodes whose tag is unchanged are kept and only the changed text and attributes
// are written. Children carrying a data-key (else a data-id or data-area: the tiles, the chips, the rooms) are matched by it wherever they
// moved; the others by position. A node marked data-rc-keep (added by the card after the HTML: the zoom button)
// stays where it is.
// The key carries the node's first class: a compact view's chip is never reused as the zoomed view's tile of the
// same entity (each keeps its own listener).
export const rcKeyOf = (n) => {
  const k = n.nodeType === 1 ? (n.getAttribute("data-key") ?? n.getAttribute("data-id") ?? n.getAttribute("data-area")) : null;
  return k === null ? null : `${n.classList[0] || ""}:${k}`;
};
export const rcKept = (n) => n.nodeType === 1 && n.hasAttribute("data-rc-keep");
export const rcPatchAttrs = (cur, next) => {
  for (const { name } of [...cur.attributes]) if (!next.hasAttribute(name)) cur.removeAttribute(name);
  for (const { name, value } of next.attributes) if (cur.getAttribute(name) !== value) cur.setAttribute(name, value);
};
export const rcPlace = (parent, node, ref) => {
  if (node === ref) return;
  try {
    // moveBefore (where supported) keeps the focus of a moved node.
    if (parent.moveBefore && node.parentNode === parent) return parent.moveBefore(node, ref);
  } catch (_e) {
    /* fall back to insertBefore */
  }
  parent.insertBefore(node, ref);
};
export const rcPatchChildren = (cur, next) => {
  const old = [...cur.childNodes].filter((n) => !rcKept(n));
  const fresh = [...next.childNodes];
  const byKey = new Map();
  for (const o of old) {
    const k = rcKeyOf(o);
    if (k !== null && !byKey.has(k)) byKey.set(k, o);
  }
  const used = new Set();
  fresh.forEach((n, i) => {
    const k = rcKeyOf(n);
    let o = k !== null ? byKey.get(k) : old[i];
    if (!o || o.nodeType !== n.nodeType || o.nodeName !== n.nodeName || used.has(o) || (k === null && rcKeyOf(o) !== null)) o = null;
    const ref = cur.childNodes[i] ?? null;
    if (!o) {
      cur.insertBefore(n, ref);
      return;
    }
    used.add(o);
    rcPlace(cur, o, ref);
    if (n.nodeType === 1) {
      rcPatchAttrs(o, n);
      rcPatchChildren(o, n);
    } else if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
  });
  for (const o of old) if (!used.has(o)) o.remove();
};
export const rcMorph = (root, html) => {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  // Without a real DOM (the unit tests' stand-ins), the HTML is written as it is.
  if (!tpl.content || !root.childNodes) root.innerHTML = html;
  else rcPatchChildren(root, tpl.content);
};
// Wires `el` once: a node kept by rcMorph keeps its listeners, so they are not added again.
export const rcOnce = (el, key) => {
  if (!el) return false;
  const done = (el._rcBound ||= new Set());
  if (done.has(key)) return false;
  done.add(key);
  return true;
};

// True for a click outside `card` that is not in a dialog opened from it (more-info, say): it folds the card back.
export const rcOutside = (card, ev) => !ev.composedPath().includes(card) && !rcInDialog(ev);

// "A click elsewhere" is caught on the pointer, not only on the click event: on iOS (Safari and the companion app)
// a tap on something that is not clickable (the background, an empty spot, a card with no action) sends no click to
// the page. The handler runs when the press and the release are both outside the card (a slider dragged out of the
// card does not count), and a scroll does not count (the browser cancels the pointer); keyboard clicks still go
// through the click event. The handler keeps its own checks (outside of the card, not in a dialog).
export const watchOutside = (card, handler) => {
  let downOutside = false;
  const onDown = (ev) => {
    downOutside = !ev.composedPath().includes(card);
  };
  const onUp = (ev) => {
    if (downOutside) handler(ev);
    downOutside = false;
  };
  const onClick = (ev) => {
    if (ev.detail === 0) handler(ev);
  };
  return {
    on() {
      document.addEventListener("pointerdown", onDown, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("click", onClick, true);
    },
    off() {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("click", onClick, true);
    },
    // A tap (press and release at the same spot), for the tests.
    tap(ev) {
      onDown(ev);
      onUp(ev);
    },
  };
};

// A click on the detail button: every room, or back to the rooms needing a look. True when handled.
export const rcZoomClick = (card, ev) => {
  if (!ev.target.closest?.(".zoom")) return false;
  ev.stopPropagation();
  card._zoomed = !card._zoomed;
  card._sig = null;
  card._render();
  if (ev.detail === 0) card.shadowRoot.querySelector(".zoom")?.focus({ preventScroll: true });
  return true;
};

// Editor fields shared by the overviews: title, columns and sort.
export const rcOverviewFields = (i18n, lang) => [
  { name: "title", selector: { text: {} } },
  { name: "columns", selector: { number: { min: 1, max: 6, mode: "box" } } },
  {
    name: "sort",
    selector: {
      select: {
        mode: "dropdown",
        options: ["name", "state"].map((value) => ({ value, label: rcT(i18n, lang, `ed_sort_${value}`) })),
      },
    },
  },
];
