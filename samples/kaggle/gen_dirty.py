import csv, os, random, re
from pathlib import Path

root = Path(r'C:\Users\kevin.vega\face-id-matcher\samples\kaggle\Selfies ID Images dataset')
output = Path(r'C:\Users\kevin.vega\face-id-matcher\samples\kaggle\dirty_pairs.csv')
base = Path(r'C:\Users\kevin.vega\face-id-matcher')

def extract_name(folder_name):
    m = re.search(r'_name_([^\\/]+)', folder_name)
    if m:
        return m.group(1).replace('_', ' ')
    return 'Unknown'

persons = []
for group in sorted(root.iterdir()):
    if not group.is_dir():
        continue
    for person in sorted(group.iterdir()):
        if not person.is_dir():
            continue
        ids = sorted(person.glob('ID_*.jpg'))
        selfies = sorted(person.glob('Selfie_*.jpg'))
        if not ids or not selfies:
            continue
        folder_name = person.name
        try:
            folder_name.encode('ascii')
        except UnicodeEncodeError:
            continue
        try:
            with open(ids[0], 'rb') as f:
                if f.read(2) != b'\xff\xd8':
                    continue
            with open(selfies[0], 'rb') as f:
                if f.read(2) != b'\xff\xd8':
                    continue
        except:
            continue
        persons.append({
            'set_id': folder_name,
            'id_path': str(ids[0]),
            'selfie_path': str(selfies[0]),
            'name': extract_name(folder_name),
        })

print(f"Valid persons: {len(persons)}")

pairs = []
for i, p in enumerate(persons):
    pairs.append({
        'applicant_id': f"correct_{i}",
        'id_image_path': os.path.relpath(p['id_path'], base),
        'selfie_image_path': os.path.relpath(p['selfie_path'], base),
        'id_name': p['name'],
        'selfie_name': p['name'],
    })

rng = random.Random(42)
indices = list(range(len(persons)))
wrong_count = 0
used_selfies = set()
for i in indices:
    if wrong_count >= len(persons) // 2:
        break
    others = [j for j in indices if j != i and j not in used_selfies]
    if not others:
        continue
    j = rng.choice(others)
    pairs.append({
        'applicant_id': f"wrong_{wrong_count}",
        'id_image_path': os.path.relpath(persons[i]['id_path'], base),
        'selfie_image_path': os.path.relpath(persons[j]['selfie_path'], base),
        'id_name': persons[i]['name'],
        'selfie_name': persons[j]['name'],
    })
    used_selfies.add(j)
    wrong_count += 1

with open(output, 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['applicant_id', 'id_image_path', 'selfie_image_path', 'id_name', 'selfie_name'])
    w.writeheader()
    w.writerows(pairs)

total = len(pairs)
same = sum(1 for p in pairs if p['applicant_id'].startswith('correct'))
diff = total - same
print(f"Generated {total} pairs: {same} same-person, {diff} cross-person")
for r in pairs[:3]:
    print(f"  {r['applicant_id']}: id={r['id_name']} selfie={r['selfie_name']}  {r['id_image_path']}")
