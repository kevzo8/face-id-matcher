"""
Generate a pairs.csv from the Kaggle Selfies ID Images dataset.
Pairs each person's ID photo with their first selfie.
Extracts name and age from folder name.
"""

import csv
import os
import re
from pathlib import Path

DATASET_ROOT = Path(__file__).parent / "kaggle" / "Selfies ID Images dataset"
OUTPUT_CSV = Path(__file__).parent / "kaggle_pairs.csv"

rows = []

for race_folder in DATASET_ROOT.iterdir():
    if not race_folder.is_dir():
        continue
    for person_folder in race_folder.iterdir():
        if not person_folder.is_dir():
            continue

        folder_name = person_folder.name

        # Extract applicant_id (first segment before first underscore)
        applicant_id = folder_name.split("_")[0]

        # Extract name: everything after "name_" in the folder name
        name_match = re.search(r'name_(.+)$', folder_name)
        name = name_match.group(1) if name_match else "Unknown"

        # Extract age
        age_match = re.search(r'age_(\d+)', folder_name)
        age = age_match.group(1) if age_match else ""

        id_files = list(person_folder.glob("ID_*.jpg"))
        selfie_files = list(person_folder.glob("Selfie_*.jpg"))

        if not id_files or not selfie_files:
            continue

        id_file = id_files[0]
        selfie_file = selfie_files[0]

        rows.append({
            "applicant_id": applicant_id,
            "name": name,
            "age": age,
            "id_image_path": str(id_file),
            "selfie_image_path": str(selfie_file),
        })

with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["applicant_id", "name", "age", "id_image_path", "selfie_image_path"])
    writer.writeheader()
    writer.writerows(rows)

print(f"Generated {len(rows)} pairs -> {OUTPUT_CSV}")
for r in rows[:3]:
    print(f"  {r['applicant_id']}  name={r['name']}  age={r['age']}")
