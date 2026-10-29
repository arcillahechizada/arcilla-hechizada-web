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
    "piezas-unicas", "personalizados", "el-taller", "envios-y-recogida",
    "reserva-de-llamada", "opiniones", "faq", "para-tiendas", "contacto",
    "condiciones-de-compra", "aviso-legal", "privacidad", "cookies",
]
urls = [f"{BASE}/{p}" for p in PAGINAS]
for prod in productos:
    if prod.get("estado") == "oculto":
        continue
    urls.append(f"{BASE}/ficha?id={quote(prod['id'].strip())}")
sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
sitemap += [f"  <url><loc>{u}</loc></url>" for u in urls]
sitemap.append("</urlset>")
(ROOT / "sitemap.xml").write_text("\n".join(sitemap) + "\n", encoding="utf-8")
print(f"Mapa del sitio generado: {len(urls)} direcciones.")
