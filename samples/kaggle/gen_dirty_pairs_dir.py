"""Regenerate samples/dirty-pairs/ in batch_upload format.

File naming: <code>_<ID|Selfie>_<name>_<notes>.jpg
  27 correct pairs  → codes 1-27, same name for ID and Selfie
  13 cross pairs    → codes 28-40, different names for ID and Selfie

Outputs:
  pairs.csv  — for batch.py  (columns: applicant_id, name, id_image_path, selfie_image_path)
  results.csv — for CsvViewer (columns: applicant_id, id_image_path, selfie_image_path, id_name, selfie_name, similarity, distance, decision, error)
"""

import csv, os, shutil
from pathlib import Path
from PIL import Image

repo_root = Path(__file__).parent.parent.parent
pairs_csv_in = repo_root / "samples" / "kaggle" / "dirty_pairs.csv"
results_csv_in = repo_root / "samples" / "kaggle" / "dirty_results.csv"
out_dir = repo_root / "samples" / "dirty-pairs"

MAX_DIM = 800
JPEG_QUALITY = 85

def resize_image(src: Path, dst: Path):
    img = Image.open(src).convert("RGB")
    w, h = img.size
    if w > MAX_DIM or h > MAX_DIM:
        ratio = min(MAX_DIM / w, MAX_DIM / h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    img.save(dst, "JPEG", quality=JPEG_QUALITY, optimize=True)

# Read results
results = {}
with open(results_csv_in, newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        results[row["applicant_id"]] = row

# Clean and recreate directory
if out_dir.exists():
    shutil.rmtree(out_dir)
out_dir.mkdir(parents=True, exist_ok=True)

pairs_batch = []   # for batch.py
pairs_viewer = []  # for CsvViewer
code = 0

with open(pairs_csv_in, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        code += 1
        pid = row["applicant_id"]
        id_src = repo_root / row["id_image_path"]
        selfie_src = repo_root / row["selfie_image_path"]
        id_name = row["id_name"]
        selfie_name = row["selfie_name"]

        id_safe = id_name.replace(" ", "_")
        selfie_safe = selfie_name.replace(" ", "_")

        if pid.startswith("correct"):
            id_file = f"{code}_ID_{id_safe}.jpg"
            selfie_file = f"{code}_Selfie_{selfie_safe}.jpg"
            notes = id_safe  # name column in pairs.csv
        else:
            id_file = f"{code}_ID_{id_safe}.jpg"
            selfie_file = f"{code}_Selfie_{selfie_safe}.jpg"
            notes = f"{id_safe}_vs_{selfie_safe}"

        resize_image(id_src, out_dir / id_file)
        resize_image(selfie_src, out_dir / selfie_file)

        rel = lambda p: f"samples/dirty-pairs/{p}"

        # pairs.csv row (for batch.py)
        pairs_batch.append({
            "applicant_id": str(code),
            "name": notes,
            "id_image_path": rel(id_file),
            "selfie_image_path": rel(selfie_file),
        })

        # results.csv row (for CsvViewer)
        r = results.get(pid, {})
        pairs_viewer.append({
            "applicant_id": str(code),
            "id_image_path": rel(id_file),
            "selfie_image_path": rel(selfie_file),
            "id_name": id_name,
            "selfie_name": selfie_name,
            "similarity": r.get("similarity", ""),
            "distance": r.get("distance", ""),
            "decision": r.get("decision", ""),
            "error": r.get("error", ""),
        })

        print(f"  {code:2d}: {id_file}, {selfie_file}")

# Write pairs.csv (for batch.py)
csv_batch = out_dir / "pairs.csv"
with open(csv_batch, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["applicant_id", "name", "id_image_path", "selfie_image_path"])
    w.writeheader()
    w.writerows(pairs_batch)

# Write results.csv (for CsvViewer)
csv_viewer = out_dir / "results.csv"
with open(csv_viewer, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=[
        "applicant_id", "id_image_path", "selfie_image_path",
        "id_name", "selfie_name", "similarity", "distance",
        "decision", "error",
    ])
    w.writeheader()
    w.writerows(pairs_viewer)

items = list(out_dir.iterdir())
total_bytes = sum(f.stat().st_size for f in items if f.is_file())
print(f"\nDone — {code} pairs ({code - 13} same, 13 cross), {total_bytes/1024/1024:.1f} MB")
print(f"  pairs.csv   → {csv_batch}")
print(f"  results.csv → {csv_viewer}")
