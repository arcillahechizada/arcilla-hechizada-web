import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_DIR = ROOT / "data" / "productos"
OUTPUT = ROOT / "data" / "productos.json"

productos = []
for path in sorted(PRODUCTS_DIR.glob("*.json")):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise SystemExit(f"Error leyendo {path}: {exc}")
    if not isinstance(data, dict):
        raise SystemExit(f"El archivo {path} no contiene un objeto JSON.")
    if not data.get("id") or not data.get("nombre"):
        raise SystemExit(f"El producto {path} necesita al menos 'id' y 'nombre'.")
    productos.append(data)

# Los productos ocultos también se incluyen en el catálogo para que el CMS pueda editarlos;
# la web los filtra y no los muestra al público.
OUTPUT.write_text(
    json.dumps({"productos": productos}, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(f"Catálogo generado: {len(productos)} producto(s).")
