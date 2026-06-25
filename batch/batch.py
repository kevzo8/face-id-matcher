#!/usr/bin/env python3
"""
CPS-221 Face Match Batch Processor
====================================
Processes KYC applications in bulk by comparing selfie images against ID photos.

Usage:
    python batch.py --input pairs.csv --output results.csv --threshold 0.6
    python batch.py --input pairs.csv --provider rekognition --threshold 0.6
    python batch.py --input pairs.csv --provider dlib --workers 4

Input CSV format:
    applicant_id,id_image_path,selfie_image_path

Output CSV format:
    applicant_id,similarity,distance,decision,error

Decisions:
    auto_approve     — similarity >= threshold (faces match)
    manual_review    — similarity < threshold (faces don't match)
    error            — processing failed (check error column)
"""

import argparse
import csv
import sys
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# Allow running from anywhere
sys.path.insert(0, str(Path(__file__).parent))

from providers.insightface_provider import InsightFaceProvider
from providers.rekognition_provider import RekognitionProvider


def get_provider(name: str):
    if name == "insightface":
        return InsightFaceProvider()
    elif name == "rekognition":
        return RekognitionProvider()
    else:
        print(f"Unknown provider: {name}. Use 'insightface' or 'rekognition'.")
        sys.exit(1)


def process_pair(provider, applicant_id: str, id_path: str, selfie_path: str, threshold: float):
    id_path = os.path.abspath(id_path)
    selfie_path = os.path.abspath(selfie_path)

    if not os.path.exists(id_path):
        return applicant_id, 0.0, 1.0, "error", f"ID image not found: {id_path}"
    if not os.path.exists(selfie_path):
        return applicant_id, 0.0, 1.0, "error", f"Selfie image not found: {selfie_path}"

    result = provider.compare(id_path, selfie_path, threshold)

    if result.error:
        return applicant_id, 0.0, 1.0, "error", result.error

    decision = "auto_approve" if result.match else "manual_review"
    return applicant_id, result.similarity, result.distance, decision, ""


def main():
    parser = argparse.ArgumentParser(
        description="CPS-221 Face Match Batch Processor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--input", "-i", required=True,
        help="Input CSV file with columns: applicant_id,id_image_path,selfie_image_path",
    )
    parser.add_argument(
        "--output", "-o", default=None,
        help="Output CSV file (default: results_<timestamp>.csv)",
    )
    parser.add_argument(
        "--provider", "-p", default="insightface", choices=["insightface", "rekognition"],
        help="Face matching provider (default: insightface — free, local)",
    )
    parser.add_argument(
        "--threshold", "-t", type=float, default=0.6,
        help="Match threshold: lower = more lenient, higher = stricter (default: 0.6)",
    )
    parser.add_argument(
        "--workers", "-w", type=int, default=1,
        help="Number of parallel workers (default: 1)",
    )
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    if not args.output:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        args.output = f"results_{timestamp}.csv"

    provider = get_provider(args.provider)

    rows = []
    with open(args.input, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        required = {"applicant_id", "id_image_path", "selfie_image_path"}
        if not required.issubset(set(reader.fieldnames or [])):
            print(f"Error: CSV must have columns: {', '.join(required)}")
            sys.exit(1)
        rows = list(reader)

    total = len(rows)
    print(f"\n{'='*60}")
    print(f"  CPS-221 Face Match Batch Processor")
    print(f"{'='*60}")
    print(f"  Provider:  {args.provider}")
    print(f"  Input:     {args.input} ({total} records)")
    print(f"  Output:    {args.output}")
    print(f"  Threshold: {args.threshold}")
    print(f"  Workers:   {args.workers}")
    print(f"{'='*60}\n")

    results = []
    completed = 0

    # Collect extra columns from input (everything except the required + image paths)
    extra_cols = [c for c in (rows[0].keys() if rows else [])
                  if c not in {"applicant_id", "id_image_path", "selfie_image_path", "selfie_path"}]

    if args.workers <= 1:
        for row in rows:
            result = process_pair(
                provider, row["applicant_id"],
                row["id_image_path"], row["selfie_image_path"],
                args.threshold,
            )
            extra = {c: row.get(c, "") for c in extra_cols}
            results.append((result, extra))
            completed += 1
            status = result[3]
            icon = {"auto_approve": "PASS", "manual_review": "FAIL", "error": "ERR"}[status]
            name_tag = f"  {extra['name']}" if "name" in extra and extra["name"] else ""
            try:
                print(f"  [{completed}/{total}] {icon}  {result[0]}{name_tag}  similarity={result[1]:.1f}%")
            except UnicodeEncodeError:
                safe_name = extra.get("name", "").encode("ascii", "replace").decode() if "name" in extra else ""
                print(f"  [{completed}/{total}] {icon}  {result[0]}  {safe_name}  similarity={result[1]:.1f}%")
    else:
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {
                executor.submit(
                    process_pair, provider, row["applicant_id"],
                    row["id_image_path"], row["selfie_path"] if "selfie_path" in row else row["selfie_image_path"],
                    args.threshold,
                ): row
                for row in rows
            }
            for future in as_completed(futures):
                row = futures[future]
                result = future.result()
                extra = {c: row.get(c, "") for c in extra_cols}
                results.append((result, extra))
                completed += 1
                status = result[3]
                icon = {"auto_approve": "PASS", "manual_review": "FAIL", "error": "ERR"}[status]
                name_tag = f"  {extra['name']}" if "name" in extra and extra["name"] else ""
                try:
                    print(f"  [{completed}/{total}] {icon}  {result[0]}{name_tag}  similarity={result[1]:.1f}%")
                except UnicodeEncodeError:
                    safe_name = extra.get("name", "").encode("ascii", "replace").decode() if "name" in extra else ""
                    print(f"  [{completed}/{total}] {icon}  {result[0]}  {safe_name}  similarity={result[1]:.1f}%")

    results.sort(key=lambda r: r[0][0])

    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        header = ["applicant_id"] + extra_cols + ["similarity", "distance", "decision", "error"]
        writer.writerow(header)
        for (r, extra) in results:
            writer.writerow([r[0]] + [extra.get(c, "") for c in extra_cols] +
                             [f"{r[1]:.2f}", f"{r[2]:.4f}", r[3], r[4]])

    approved = sum(1 for (r, _) in results if r[3] == "auto_approve")
    review = sum(1 for (r, _) in results if r[3] == "manual_review")
    errors = sum(1 for (r, _) in results if r[3] == "error")

    print(f"\n{'='*60}")
    print(f"  RESULTS")
    print(f"{'='*60}")
    print(f"  Total:          {total}")
    print(f"  Auto-Approve:   {approved}  ({approved/total*100:.1f}%)" if total else "")
    print(f"  Manual Review:  {review}  ({review/total*100:.1f}%)" if total else "")
    print(f"  Errors:         {errors}")
    print(f"  Output saved:   {args.output}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
