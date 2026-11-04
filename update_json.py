import pandas as pd
import json
import os
from pathlib import Path
from datetime import datetime

usuario = os.getlogin()
sheet_id = "1maRNGDuU9rEFWZLgMdhJS1waAnJxl6ENntm-nyD0tq8"
gid = "1765182479"
url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"

print("Descargando datos de Google Sheets...")
base_an = pd.read_csv(url)
print(f"Filas descargadas: {len(base_an)}")

# Cargar parquet de CLUES
parquet_path = Path(fr"C:\Users\{usuario}\IMSS-BIENESTAR\División de Procesamiento de información - Repositorio de Datos\CLUES\clues.parquet")
clues = pd.read_parquet(parquet_path)

# Intentar leer Excel de unidades
xlsx_path = Path(fr"C:\Users\{usuario}\Downloads\UnidadesIMB_CS!_v2 (1).xlsx")
if xlsx_path.exists():
    base = pd.read_excel(xlsx_path, sheet_name="Sheet 1")[["clues_imb"]]
    base = base.merge(clues[["clues_imb", "entidad"]], on="clues_imb", how="left")
    print("Usando Excel de unidades como base")
else:
    # Fallback: usar CLUES del JSON existente + entidad del parquet
    existing_json = Path("public/base_clues.json")
    existing = json.loads(existing_json.read_text(encoding="utf-8"))
    base_clues_list = [r["clues_imb"] for r in existing if r.get("clues_imb")]
    # Leer clues_total original del meta existente (puede tener duplicados por turno)
    existing_meta = json.loads((output_dir / "base_meta.json").read_text(encoding="utf-8"))
    _clues_total_original = int(existing_meta.get("clues_total", len(base_clues_list)))
    base = pd.DataFrame({"clues_imb": base_clues_list})
    base = base.merge(clues[["clues_imb", "entidad"]], on="clues_imb", how="left")
    print("Excel no encontrado, usando base_clues.json existente + parquet")

output_dir = Path("public")

# Escribir base_clues.json
clues_df = base[["clues_imb"]].dropna().drop_duplicates()
clues_df = clues_df.assign(clues_imb=clues_df["clues_imb"].astype(str).str.strip())
clues_df = clues_df[clues_df["clues_imb"] != ""]

(output_dir / "base_clues.json").write_text(
    json.dumps(clues_df.to_dict(orient="records"), ensure_ascii=False, indent=2),
    encoding="utf-8",
)

# Escribir base_meta.json
if xlsx_path.exists():
    clues_total = int(len(base["clues_imb"].dropna()))
else:
    clues_total = _clues_total_original  # conservar valor original (incluye duplicados por turno)
entidades = int(base["entidad"].dropna().astype(str).str.strip().nunique())
meta = {
    "clues_total": clues_total,
    "clues_unicas": int(clues_df["clues_imb"].nunique()),
    "entidades_esperadas": entidades,
    "script_last_run_at": datetime.now().isoformat(timespec="seconds"),
}

(output_dir / "base_meta.json").write_text(
    json.dumps(meta, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(f"base_clues.json actualizado: {meta['clues_unicas']} CLUES")
print(f"base_meta.json actualizado:")
print(json.dumps(meta, indent=2, ensure_ascii=False))
