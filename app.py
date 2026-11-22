import json
import re
from collections import deque
from pathlib import Path

from flask import Flask, abort, redirect, render_template, url_for

import ui_config as cfg

BASE_DIR = Path(__file__).resolve().parent

with open(BASE_DIR / "hmi_pages.json", encoding="utf-8") as f:
    HMI = json.load(f)

PAGES = {p["name"]: p for p in HMI["pages"]}
PAGES_BY_ID = {p["id"]: p for p in HMI["pages"]}
WIDTH, HEIGHT = HMI["resolution"]
START_PAGE = PAGES_BY_ID[HMI["start_page"]]["name"]

NAV_RE = re.compile(r"^page\s+(\w+)$")
SET_RE = re.compile(r"^(\w+)\.val\s*=\s*(-?\d+)$")
LABEL_RE = re.compile(r"^\s*(.*?)\s*\((.+)\)\s*$")


# --------------------------------------------------------------------------
# Lectura del modelo Nextion
# --------------------------------------------------------------------------
def code_lines(events, key):
    for raw in (events or {}).get(key, []):
        line = raw.split("//")[0].strip()
        if line:
            yield line


def nav_target(component):
    for line in code_lines(component.get("events"), "up"):
        m = NAV_RE.match(line)
        if m and m.group(1) in PAGES:
            return m.group(1)
    return None


def load_defaults(pg):
    """Valores que asigna el evento 'loadend' (hN.val=<n>)."""
    values = {}
    for line in code_lines(pg.get("events"), "loadend"):
        m = SET_RE.match(line)
        if m:
            values[m.group(1)] = int(m.group(2))
    return values


def page_kind(pg):
    types = {c["type"] for c in pg["components"]}
    if "video" in types:
        return "intro"
    if pg["name"] == cfg.BODYMAP_PAGE:
        return "bodymap"
    if "slider" in types:
        return "protocol" if pg["name"] in cfg.PROTOCOLS else "region"
    return "menu"


def build_tree():
    """Árbol de navegación (padre de cada página) recorriendo desde el menú principal."""
    parent = {cfg.HOME_PAGE: None}
    queue = deque([cfg.HOME_PAGE])
    while queue:
        name = queue.popleft()
        buttons = sorted(
            (c for c in PAGES[name]["components"] if c["type"] == "button"),
            key=lambda c: (c["y"], c["x"]),
        )  # el orden aquí solo afecta a qué padre se descubre primero
        for c in buttons:
            t = nav_target(c)
            if t and t not in parent and page_kind(PAGES[t]) != "intro":
                parent[t] = name
                queue.append(t)
    return parent


PARENT = build_tree()


def title_of(name):
    if name in cfg.PROTOCOLS:
        return cfg.PROTOCOLS[name]["title"]
    return cfg.TITLES.get(name, name)


def short_of(name):
    if name in cfg.PROTOCOLS:
        return cfg.PROTOCOLS[name]["short"]
    return cfg.SHORT.get(name) or cfg.TITLES.get(name, name)


def visual_order(c):
    # Filas con tolerancia de 40 px (en el .HMI los botones de una misma fila
    # no siempre tienen exactamente la misma "y"), luego de izquierda a derecha.
    return (round(c["y"] / 40), c["x"])


def children_of(name):
    """Opciones de navegación hacia páginas hijas, en el orden visual del .HMI."""
    items, seen = [], set()
    comps = sorted(PAGES[name]["components"], key=visual_order)
    for c in comps:
        if c["type"] != "button":
            continue
        t = nav_target(c)
        if t and PARENT.get(t) == name and t not in seen:
            seen.add(t)
            items.append({"name": t, "component": c})
    return items


def breadcrumb(name):
    chain = []
    while name:
        chain.append({"name": name, "label": short_of(name)})
        name = PARENT.get(name)
    return list(reversed(chain))


def split_label(text, fallback_label, fallback_unit):
    text = " ".join((text or "").split())
    m = LABEL_RE.match(text)
    if m:
        return m.group(1), m.group(2)
    return (text or fallback_label), fallback_unit


def build_params(pg, kind):
    sliders = {c["name"]: c for c in pg["components"] if c["type"] == "slider"}
    texts = {c["name"]: c.get("text") for c in pg["components"] if c["type"] == "text"}
    defaults = load_defaults(pg)
    spec = cfg.PROTOCOL_PARAMS if kind == "protocol" else cfg.REGION_PARAMS

    params = []
    for s in spec:
        sl = sliders.get(s["slider"]) if s["slider"] else None
        if sl:
            lo, hi = sl["min"], sl["max"]
            value = defaults.get(sl["name"], sl["value"])
        else:
            lo, hi, value = 0, s["max_raw"], s["default_raw"]
        lo = max(lo, s.get("min_raw", lo))
        value = min(max(value, lo), hi)

        label, unit = s["label"], s["unit"]
        if s.get("label_from"):
            label, unit = split_label(texts.get(s["label_from"]), label, unit)
            unit = unit.replace("Joules", "J")

        params.append({
            "key": s["key"], "label": label, "unit": unit,
            "min": lo, "max": hi, "value": value, "default": value,
            "step": s["step_raw"], "scale": s["scale"], "decimals": s["decimals"],
        })
    return params


# --------------------------------------------------------------------------
# Rutas
# --------------------------------------------------------------------------
app = Flask(__name__)


@app.context_processor
def inject_globals():
    return {"device": cfg.DEVICE, "home_page": cfg.HOME_PAGE}


@app.route("/")
def index():
    # Igual que Program.s: "page 0" al encender
    return redirect(url_for("page", name=START_PAGE))


@app.route("/page/<name>")
def page(name):
    pg = PAGES.get(name)
    if pg is None:
        abort(404)
    kind = page_kind(pg)
    ctx = {
        "page": pg, "kind": kind, "title": title_of(name),
        "parent": PARENT.get(name), "crumbs": breadcrumb(name),
    }

    if kind == "intro":
        video = next(c for c in pg["components"] if c["type"] == "video")
        nxt = None
        for line in code_lines(video.get("events"), "playend"):
            m = NAV_RE.match(line)
            if m:
                nxt = m.group(1)
        return render_template("intro.html", next_page=nxt or cfg.HOME_PAGE, **ctx)

    if kind == "menu":
        items = []
        for it in children_of(name):
            sub = PAGES[it["name"]]
            sub_kind = page_kind(sub)
            count = len(children_of(it["name"])) if sub_kind in ("menu", "bodymap") else 0
            items.append({
                "name": it["name"], "label": short_of(it["name"]),
                "kind": sub_kind,
                "description": cfg.DESCRIPTIONS.get(it["name"]),
                "applicator": cfg.PROTOCOLS.get(it["name"], {}).get("applicator"),
                "count": count,
            })
        return render_template("menu.html", items=items, **ctx)

    if kind == "bodymap":
        bg = pg.get("bg_image")
        zones = []
        for it in children_of(name):
            c = it["component"]
            zones.append({
                "name": it["name"], "label": short_of(it["name"]),
                "title": title_of(it["name"]),
                "left": c["x"] / WIDTH * 100, "top": c["y"] / HEIGHT * 100,
                "width": c["w"] / WIDTH * 100, "height": c["h"] / HEIGHT * 100,
            })
        return render_template("bodymap.html", zones=zones, image=bg, **ctx)

    # protocol / region
    picture = next((c for c in pg["components"] if c["type"] == "picture"), None)
    protocol = cfg.PROTOCOLS.get(name, {})
    category = PARENT.get(name)
    return render_template(
        "params.html",
        params=build_params(pg, kind),
        protocol=protocol,
        category=short_of(category) if category else None,
        image=picture["image"] if picture else None,
        **ctx,
    )


@app.route("/clasico/<name>")
def classic(name):
    """Render original, píxel a píxel, del proyecto Nextion."""
    pg = PAGES.get(name)
    if pg is None:
        abort(404)
    return render_template(
        "classic.html", page=pg, width=WIDTH, height=HEIGHT, pages=HMI["pages"]
    )


@app.route("/paginas")
def page_list():
    """Índice de todas las páginas del proyecto (útil para desarrollo)."""
    rows = [
        {"page": p, "kind": page_kind(p), "title": title_of(p["name"])}
        for p in HMI["pages"]
    ]
    return render_template("pages.html", rows=rows)


@app.errorhandler(404)
def not_found(_):
    return render_template("error.html"), 404


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
