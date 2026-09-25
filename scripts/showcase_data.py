#!/usr/bin/env python3
"""Migrate Pages CMS project forms, rebuild the website CSV, and verify round trips."""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "MakerBucks_Database.csv"
PROJECTS_DIR = ROOT / "data" / "projects"

CSV_FIELDS = [
    "Project",
    "Maker(s)",
    "Category",
    "Featured",
    "Overview",
    "Scope",
    "Materials",
    "Fabrication Steps",
    "Outcome",
    "Image Folder Path",
    "Url",
    "Notes",
]

CATEGORIES = [
    "Design & Fabrication",
    "Electronics & Hardware",
    "Engineering & Testing",
    "Props, Costumes & Art",
    "Robotics",
    "Science & Sensors",
]

CSV_TO_PROJECT = {
    "Project": "title",
    "Maker(s)": "maker",
    "Overview": "overview",
    "Scope": "scope",
    "Materials": "materials",
    "Fabrication Steps": "fabricationSteps",
    "Outcome": "outcome",
    "Image Folder Path": "imageFolderPath",
    "Url": "url",
    "Notes": "notes",
}

REQUIRED_CSV_FIELDS = [
    "Project",
    "Maker(s)",
    "Category",
    "Overview",
    "Scope",
    "Materials",
    "Fabrication Steps",
    "Outcome",
    "Image Folder Path",
]


def read_csv_rows() -> list[dict[str, str]]:
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if reader.fieldnames != CSV_FIELDS:
            raise ValueError(
                "CSV headers do not match the expected site schema. "
                f"Found: {reader.fieldnames!r}"
            )

        rows = []
        for line_number, row in enumerate(reader, start=2):
            if None in row:
                raise ValueError(f"CSV row {line_number} has extra columns.")
            rows.append({field: row.get(field) or "" for field in CSV_FIELDS})
        return rows


def parse_categories(value: str) -> list[str]:
    text = value.strip()
    if not text:
        return []

    ordered_categories = sorted(CATEGORIES, key=len, reverse=True)
    result = []
    position = 0

    while position < len(text):
        category = next(
            (
                item
                for item in ordered_categories
                if text.startswith(item, position)
                and (
                    position + len(item) == len(text)
                    or text[position + len(item)] == ","
                )
            ),
            None,
        )
        if category is None:
            raise ValueError(f"Unknown category near {text[position:]!r}.")

        result.append(category)
        position += len(category)
        if position < len(text):
            position += 1
            while position < len(text) and text[position].isspace():
                position += 1

    return result


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    if not slug:
        raise ValueError(f"Project title cannot be used as a filename: {value!r}")
    return slug


def migrate() -> None:
    """Create one JSON form per project without changing the source CSV."""
    if PROJECTS_DIR.exists() and any(PROJECTS_DIR.iterdir()):
        raise ValueError(
            f"Refusing to overwrite existing project files in {PROJECTS_DIR}."
        )

    rows = read_csv_rows()
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    used_slugs = set()
    image_warnings = []

    for order, row in enumerate(rows):
        title = row["Project"].strip()
        slug = slugify(title)
        if slug in used_slugs:
            raise ValueError(f"Duplicate project filename for {title!r}.")
        used_slugs.add(slug)

        project: dict[str, Any] = {
            "order": order,
            "categories": parse_categories(row["Category"]),
            "featured": row["Featured"].strip().casefold() == "true",
        }
        project.update(
            {project_field: row[csv_field] for csv_field, project_field in CSV_TO_PROJECT.items()}
        )

        path = PROJECTS_DIR / f"{slug}.json"
        path.write_text(
            json.dumps(project, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
            newline="",
        )

        image_folder = ROOT / row["Image Folder Path"]
        if row["Image Folder Path"] and not image_folder.is_dir():
            image_warnings.append(f"{title}: {row['Image Folder Path']}")

    print(f"Migrated {len(rows)} projects into {PROJECTS_DIR.relative_to(ROOT)}.")
    print("The source CSV was not changed. Run the build command to regenerate it.")
    if image_warnings:
        print("Image folders that do not exist:")
        for warning in image_warnings:
            print(f"  - {warning}")


def load_projects() -> list[dict[str, Any]]:
    paths = sorted(PROJECTS_DIR.glob("*.json"))
    if not paths:
        raise ValueError(f"No project forms found in {PROJECTS_DIR}.")

    projects = []
    for path in paths:
        project = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(project, dict):
            raise ValueError(f"{path.name} must contain a JSON object.")
        project["_source"] = path.name
        projects.append(project)

    def order_key(project: dict[str, Any]) -> tuple[bool, int, str]:
        try:
            order = int(project.get("order"))
            return False, order, str(project.get("title", "")).casefold()
        except (TypeError, ValueError):
            return True, 0, str(project.get("title", "")).casefold()

    return sorted(projects, key=order_key)


def project_to_csv(project: dict[str, Any]) -> dict[str, str]:
    source = project.get("_source", "project form")
    title = str(project.get("title") or "").strip()
    if not title:
        raise ValueError(f"{source}: Project title is required.")

    categories = project.get("categories") or []
    if isinstance(categories, str):
        categories = parse_categories(categories)
    if not isinstance(categories, list) or any(item not in CATEGORIES for item in categories):
        raise ValueError(f"{source}: categories must be selected from the configured list.")

    featured_value = project.get("featured", False)
    if isinstance(featured_value, str):
        if featured_value.casefold() not in {"true", "false"}:
            raise ValueError(f"{source}: Featured must be true or false.")
        featured = featured_value.casefold() == "true"
    elif isinstance(featured_value, bool):
        featured = featured_value
    else:
        raise ValueError(f"{source}: Featured must be a boolean.")

    row = {
        csv_field: str(project.get(project_field) or "")
        for csv_field, project_field in CSV_TO_PROJECT.items()
    }
    row["Project"] = title
    row["Category"] = ", ".join(categories)
    row["Featured"] = "TRUE" if featured else "FALSE"

    missing = [field for field in REQUIRED_CSV_FIELDS if not row[field].strip()]
    if missing:
        raise ValueError(f"{source}: required fields are empty: {', '.join(missing)}.")

    order = project.get("order")
    return {"_order": order, **row}


def build_rows() -> list[dict[str, str]]:
    projects = load_projects()
    rows = [project_to_csv(project) for project in projects]
    return [{field: row[field] for field in CSV_FIELDS} for row in rows]


def build() -> None:
    """Write MakerBucks_Database.csv from the ordered JSON project forms."""
    rows = build_rows()
    temporary_path = CSV_PATH.with_suffix(".csv.tmp")
    try:
        buffer = io.StringIO(newline="")
        writer = csv.DictWriter(buffer, fieldnames=CSV_FIELDS, lineterminator=os.linesep)
        writer.writeheader()
        writer.writerows(rows)
        csv_text = buffer.getvalue().removesuffix(os.linesep)

        with temporary_path.open("w", encoding="utf-8", newline="") as output:
            output.write(csv_text)
        temporary_path.replace(CSV_PATH)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()

    print(f"Wrote {len(rows)} projects to {CSV_PATH.name}.")


def check_round_trip() -> None:
    """Verify every form field matches the corresponding generated CSV cell."""
    source_rows = read_csv_rows()
    generated_rows = build_rows()
    if source_rows != generated_rows:
        raise ValueError(
            "The project forms do not match the current CSV. "
            "Run the build command, then check again."
        )
    print(f"Round-trip verified: {len(source_rows)} projects, {len(CSV_FIELDS)} columns.")


def main() -> int:
    """Dispatch the migrate, build, or check command-line operation."""
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("migrate", help="Create one JSON form per CSV project.")
    subparsers.add_parser("build", help="Rebuild the website CSV from project forms.")
    subparsers.add_parser("check", help="Verify forms match the current CSV values.")
    args = parser.parse_args()

    try:
        if args.command == "migrate":
            migrate()
        elif args.command == "build":
            build()
        else:
            check_round_trip()
    except (OSError, ValueError, json.JSONDecodeError, csv.Error) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())