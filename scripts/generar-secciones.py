"""Lee las secciones de data/secciones/*.json (las que se crean desde el panel > Secciones de la tienda),
genera data/secciones.json y pone/quita en sitemap.xml las secciones publicadas."""
import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
CARPETA = ROOT / "data" / "secciones"
SALIDA = ROOT / "data" / "secciones.json"
SITEMAP = ROOT / "sitemap.xml"
BASE = "https://www.arcillahechizada.com"
# Secciones que ya tienen página propia desde siempre (el resto usa seccion.html?s=...)
CON_PAGINA = {"grimorios", "amuletos", "pociones", "mandalas", "botellitas", "infusiones",
              "inciensos", "plantas-semillas", "packs", "velas"}
# Las que Google ya conoce siempre en el mapa del sitio no se tocan; solo se gestionan estas:
GESTIONADAS = {"packs", "velas"}


def texto(v):
    return "" if v is None else str(v).strip()


def numero(v, defecto=9999):
    try:
        f = float(v)
        return int(f) if f == int(f) else f
    except (TypeError, ValueError):
        return defecto


def booleano(v, defecto):
    if v is None or v == "":
        return defecto
    if isinstance(v, str):
        return v.strip().lower() in ("true", "si", "sí", "1")
    return bool(v)


secciones = []
for ruta in sorted(CARPETA.glob("*.json")):
    try:
        d = json.loads(ruta.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"Aviso: no puedo leer {ruta.name}: {exc}")
        continue
    ident = texto(d.get("identificador")) or ruta.stem
    secciones.append({
        "id": ident,
        "nombre": texto(d.get("nombre")) or ident,
        "publicada": booleano(d.get("publicada"), False),
        "orden": numero(d.get("orden")),
        "mostrarEnMenu": booleano(d.get("mostrarEnMenu"), True),
        "mostrarEnTarjetas": booleano(d.get("mostrarEnTarjetas"), True),
        "fotoTarjeta": texto(d.get("fotoTarjeta")),
        "fotoCabecera": texto(d.get("fotoCabecera")),
        "altCabecera": texto(d.get("altCabecera")),
        "introduccion": texto(d.get("introduccion")),
        "descripcionSeo": texto(d.get("descripcionSeo")),
        "pagina": f"{ident}.html" if ident in CON_PAGINA else f"seccion.html?s={quote(ident)}",
    })

secciones.sort(key=lambda s: (s["orden"], s["nombre"].lower()))
SALIDA.write_text(json.dumps({"secciones": secciones}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Secciones generadas: {len(secciones)} ({sum(1 for s in secciones if s['publicada'])} publicadas).")

if SITEMAP.exists():
    lineas = SITEMAP.read_text(encoding="utf-8").splitlines()
    quitar = [f"{BASE}/{g}<" for g in GESTIONADAS]
    lineas = [l for l in lineas if "/seccion?s=" not in l and not any(q in l for q in quitar) and "</urlset>" not in l]
    for s in secciones:
        if not s["publicada"]:
            continue
        if s["id"] in GESTIONADAS:
            lineas.append(f"  <url><loc>{BASE}/{s['id']}</loc></url>")
        elif s["id"] not in CON_PAGINA:
            lineas.append(f"  <url><loc>{BASE}/seccion?s={quote(s['id'])}</loc></url>")
    lineas.append("</urlset>")
    SITEMAP.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    print("Mapa del sitio actualizado con las secciones.")
