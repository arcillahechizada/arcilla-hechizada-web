"""Lee los artículos de el-grimorio-articulos/*.md (los que se escriben desde Decap),
genera data/blog.json con los PUBLICADOS y añade /el-grimorio y cada artículo a sitemap.xml."""
import json
import re
import unicodedata
from datetime import datetime, date
from pathlib import Path
from urllib.parse import quote

import yaml

ROOT = Path(__file__).resolve().parents[1]
CARPETA = ROOT / "el-grimorio-articulos"
SALIDA = ROOT / "data" / "blog.json"
SITEMAP = ROOT / "sitemap.xml"
BASE = "https://www.arcillahechizada.com"


def slug_de(nombre: str) -> str:
    s = unicodedata.normalize("NFD", nombre)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "articulo"


def texto(valor) -> str:
    return "" if valor is None else re.sub(r"\s+", " ", str(valor)).strip()


def fecha_iso(valor) -> str:
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    return texto(valor)


articulos = []
usados = set()
for ruta in sorted(CARPETA.glob("*.md")):
    bruto = ruta.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", bruto, re.S)
    if not m:
        print(f"Aviso: {ruta.name} no tiene cabecera, se salta.")
        continue
    try:
        datos = yaml.safe_load(m.group(1)) or {}
    except Exception as exc:
        print(f"Aviso: no puedo leer la cabecera de {ruta.name}: {exc}")
        continue
    if texto(datos.get("estado")).lower() != "publicado":
        continue
    cuerpo = m.group(2).strip()
    slug = slug_de(ruta.stem)
    n = 2
    while slug in usados:
        slug = f"{slug_de(ruta.stem)}-{n}"
        n += 1
    usados.add(slug)
    plano = re.sub(r"[#*_>`\[\]()!-]", "", cuerpo)
    resumen = texto(datos.get("seo_descripcion")) or texto(plano)[:200]
    articulos.append({
        "slug": slug,
        "titulo": texto(datos.get("title")) or ruta.stem,
        "fecha": fecha_iso(datos.get("date")),
        "categoria": texto(datos.get("categoria")),
        "imagen": texto(datos.get("imagen")),
        "resumen": resumen,
        "seoTitulo": texto(datos.get("seo_titulo")),
        "seoDescripcion": texto(datos.get("seo_descripcion")),
        "cuerpo": cuerpo,
    })

# Sin fecha = el más nuevo (sale primero). La fecha nunca se muestra en la web.
articulos.sort(key=lambda a: a["fecha"] or "9999", reverse=True)
SALIDA.write_text(json.dumps({"articulos": articulos}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Blog generado: {len(articulos)} artículo(s) publicado(s).")

# --- sitemap: quitar entradas antiguas del blog y añadir las actuales ---
if SITEMAP.exists():
    lineas = SITEMAP.read_text(encoding="utf-8").splitlines()
    lineas = [l for l in lineas if "/articulo?a=" not in l and f"{BASE}/el-grimorio<" not in l and "</urlset>" not in l]
    lineas.append(f"  <url><loc>{BASE}/el-grimorio</loc></url>")
    for a in articulos:
        lineas.append(f"  <url><loc>{BASE}/articulo?a={quote(a['slug'])}</loc></url>")
    lineas.append("</urlset>")
    SITEMAP.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    print("Mapa del sitio actualizado con el blog.")
