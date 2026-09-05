import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = [
    (ROOT / "data" / "productos", None),
    (ROOT / "data" / "infusiones", "infusiones"),
    (ROOT / "data" / "inciensos", "inciensos"),
]
OUTPUT = ROOT / "data" / "productos.json"

productos = []
for folder, categoria_fija in FOLDERS:
    for path in sorted(folder.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise SystemExit(f"El archivo {path} no contiene un objeto JSON.")
        if categoria_fija:
            data["categoria"] = categoria_fija
        if not data.get("id") or not data.get("nombre"):
            raise SystemExit(f"El producto {path} necesita al menos 'id' y 'nombre'.")
        productos.append(data)

productos.sort(key=lambda x: (int(x.get("orden", 999999)) if str(x.get("orden", "")).strip().lstrip("-").isdigit() else 999999, str(x.get("nombre", "")).casefold()))
OUTPUT.write_text(json.dumps({"productos": productos}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Catálogo generado: {len(productos)} producto(s).")
