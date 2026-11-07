import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "productos.json"

# (carpeta, categoría forzada). Las infusiones y los inciensos viven en su propia carpeta
# y la web les asigna su categoría; aquí se hace igual para que el catálogo del servidor de pagos esté COMPLETO.
CARPETAS = [
    (ROOT / "data" / "productos", None),
    (ROOT / "data" / "inciensos", "inciensos"),
    (ROOT / "data" / "infusiones", "infusiones"),
]

productos = []
ids = set()
for carpeta, categoria in CARPETAS:
    if not carpeta.exists():
        continue
    for path in sorted(carpeta.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            raise SystemExit(f"Error leyendo {path}: {exc}")
        if not isinstance(data, dict):
            raise SystemExit(f"El archivo {path} no contiene un objeto JSON.")
        if not data.get("id") or not data.get("nombre"):
            raise SystemExit(f"El producto {path} necesita al menos 'id' y 'nombre'.")
        if data["id"] in ids:
            raise SystemExit(f"Identificador repetido: {data['id']} ({path})")
        ids.add(data["id"])
        if categoria:
            data["categoria"] = categoria
        productos.append(data)

# Los productos ocultos también se incluyen en el catálogo para que el CMS pueda editarlos;
# la web los filtra y no los muestra al público.
OUTPUT.write_text(
    json.dumps({"productos": productos}, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(f"Catálogo generado: {len(productos)} producto(s).")


# --- Mapa del sitio (sitemap.xml): páginas fijas + una entrada por cada ficha publicada ---
BASE = "https://www.arcillahechizada.com"
PAGINAS = [
    "", "tienda", "amuletos", "botellitas", "pociones", "grimorios", "mandalas",
    "piezas-unicas", "personalizados", "eventos", "el-taller", "envios-y-recogida",
    "reserva-de-llamada", "opiniones", "faq", "para-tiendas", "contacto",
    "condiciones-de-compra", "aviso-legal", "privacidad", "cookies",
]
# Qué secciones están publicadas: se lee de data/secciones/*.json (panel > Secciones de la tienda).
# Si esa carpeta no existe, se usa el ajuste antiguo data/ajustes.json.
_publicadas = None
_carpeta_sec = ROOT / "data" / "secciones"
if _carpeta_sec.exists() and any(_carpeta_sec.glob("*.json")):
    _publicadas = set()
    for _f in _carpeta_sec.glob("*.json"):
        try:
            _d = json.loads(_f.read_text(encoding="utf-8"))
        except Exception:
            continue
        if _d.get("publicada") in (True, "true", "True"):
            _publicadas.add(str(_d.get("identificador") or _f.stem).strip())
if _publicadas is None:
    try:
        _aj = json.loads((ROOT / "data" / "ajustes.json").read_text(encoding="utf-8"))
    except Exception:
        _aj = {}
    _publicadas = {n for n, k in (("packs", "mostrarPacks"), ("velas", "mostrarVelas")) if _aj.get(k)}
_ocultas = set()
for _n in ("packs", "velas"):
    if _n in _publicadas:
        PAGINAS.append(_n)
    else:
        _ocultas.add(_n)
urls = [f"{BASE}/{p}" for p in PAGINAS]
for prod in productos:
    if prod.get("estado") == "oculto" or prod.get("categoria") in _ocultas:
        continue
    # Un producto que solo vive en una sección nueva (categoría «Otros») no se anuncia si esa sección está oculta
    if prod.get("categoria") == "otros" and prod.get("seccion") and prod.get("seccion") not in _publicadas:
        continue
    urls.append(f"{BASE}/ficha?id={quote(prod['id'].strip())}")
sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
sitemap += [f"  <url><loc>{u}</loc></url>" for u in urls]
sitemap.append("</urlset>")
(ROOT / "sitemap.xml").write_text("\n".join(sitemap) + "\n", encoding="utf-8")
print(f"Mapa del sitio generado: {len(urls)} direcciones.")
