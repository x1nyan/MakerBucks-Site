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
PROJECT_DATA_PATH = ROOT / "js" / "project-data.js"
PROJECTS_DIR = ROOT / "data" / "projects"
FOOTER_PATH = ROOT / "data" / "footer.json"
FOOTER_CSV_PATH = ROOT / "DonorStatement.csv"
FOOTER_CSV_FIELDS = ["Statement"]

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
    "Photos",
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
# Historical category names, used only to split the legacy single-string
# Category cell during `migrate`. Categories are otherwise a free-form list
# per project form; new categories don't need to be added here.


CSV_TO_PROJECT = {
    "Project": "title",
    "Maker(s)": "maker",
    "Overview": "overview",
    "Scope": "scope",
    "Materials": "materials",
    "Fabrication Steps": "fabricationSteps",
    "Outcome": "outcome",
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
]

COVER_PATTERN = re.compile(r"(?:^|/)cover\.[^/]+$", re.IGNORECASE)


def warn(message: str) -> None:
    """Report a non-fatal content problem (shown as an annotation in GitHub Actions)."""
    print(f"::warning::{message}", file=sys.stderr)


def sort_photo_paths(paths: list[str]) -> list[str]:
    """Order photo paths with the cover image first, then alphabetically."""
    unique = list(dict.fromkeys(paths))
    return sorted(unique, key=lambda path: (not COVER_PATTERN.search(path), path.lower()))


def read_csv_rows() -> list[dict[str, str]]:
    """Read the generated project CSV and validate its header and row shape."""
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
    """Split a legacy category cell using the historical category list."""
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
    """Convert a project title to a lowercase, filesystem-friendly slug."""
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

        photos = [line.strip() for line in row["Photos"].splitlines() if line.strip()]
        project: dict[str, Any] = {
            "order": order,
            "categories": parse_categories(row["Category"]),
            "featured": row["Featured"].strip().casefold() == "true",
            "photos": photos,
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

        missing_photos = [photo for photo in photos if not (ROOT / photo).is_file()]
        if missing_photos:
            image_warnings.append(f"{title}: {', '.join(missing_photos)}")

    print(f"Migrated {len(rows)} projects into {PROJECTS_DIR.relative_to(ROOT)}.")
    print("The source CSV was not changed. Run the build command to regenerate it.")
    if image_warnings:
        print("Photos that do not exist:")
        for warning in image_warnings:
            print(f"  - {warning}")


def load_projects() -> list[dict[str, Any]]:
    """Load project JSON forms and return them in their configured display order."""
    paths = sorted(PROJECTS_DIR.glob("*.json"))
    projects = []
    for path in paths:
        try:
            project = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(project, dict):
                raise ValueError("must contain a JSON object.")
        except (OSError, ValueError) as error:
            warn(f"{path.name}: skipped, unreadable project file ({error})")
            continue
        project["_source"] = path.name
        projects.append(project)

    def order_key(project: dict[str, Any]) -> tuple[bool, int, str]:
        """Sort valid numeric order values before projects without an order."""
        try:
            order = int(project.get("order"))
            return False, order, str(project.get("title", "")).casefold()
        except (TypeError, ValueError):
            return True, 0, str(project.get("title", "")).casefold()

    return sorted(projects, key=order_key)


def project_to_csv(project: dict[str, Any]) -> dict[str, str]:
    """Validate one project form and convert it to generated CSV fields."""
    source = project.get("_source", "project form")
    title = str(project.get("title") or "").strip()
    if not title:
        raise ValueError(f"{source}: Project title is required.")

    categories = project.get("categories") or []
    if isinstance(categories, str):
        categories = parse_categories(categories)
    if not isinstance(categories, list) or any(not isinstance(item, str) for item in categories):
        raise ValueError(f"{source}: categories must be a list of category names.")
    categories = [category.strip() for category in categories if category.strip()]
    if not categories:
        raise ValueError(f"{source}: at least one category is required.")

    featured_value = project.get("featured", False)
    if isinstance(featured_value, str):
        if featured_value.casefold() not in {"true", "false"}:
            raise ValueError(f"{source}: Featured must be true or false.")
        featured = featured_value.casefold() == "true"
    elif isinstance(featured_value, bool):
        featured = featured_value
    else:
        raise ValueError(f"{source}: Featured must be a boolean.")

    photos = project.get("photos") or []
    if not isinstance(photos, list) or any(not isinstance(item, str) for item in photos):
        raise ValueError(f"{source}: photos must be a list of uploaded image paths.")
    cover = project.get("coverPhoto") or ""
    if not isinstance(cover, str):
        cover = ""
    photos = [cover, *photos]
    photos = [photo.strip().replace("\\", "/").lstrip("/") for photo in photos if photo.strip()]
    existing = [photo for photo in photos if (ROOT / photo).is_file()]
    for photo in photos:
        if photo not in existing:
            warn(f"{source}: photo not found, left out: {photo}")
    cover = cover.strip().replace("\\", "/").lstrip("/")
    if cover and cover in existing:
        photos = [cover, *sort_photo_paths([photo for photo in existing if photo != cover])]
    else:
        photos = sort_photo_paths(existing)
        if photos and not COVER_PATTERN.search(photos[0]):
            warn(f"{source}: no cover photo set; using {photos[0]} as the cover.")

    row = {
        csv_field: str(project.get(project_field) or "")
        for csv_field, project_field in CSV_TO_PROJECT.items()
    }
    row["Project"] = title
    row["Category"] = ", ".join(categories)
    row["Featured"] = "TRUE" if featured else "FALSE"
    row["Photos"] = "\n".join(photos)

    missing = [field for field in REQUIRED_CSV_FIELDS if not row[field].strip()]
    if missing:
        raise ValueError(f"{source}: required fields are empty: {', '.join(missing)}.")

    order = project.get("order")
    return {"_order": order, **row}


def build_rows() -> list[dict[str, str]]:
    """Convert all loaded project forms to ordered CSV row dictionaries."""
    projects = load_projects()
    rows = []
    for project in projects:
        try:
            rows.append(project_to_csv(project))
        except ValueError as error:
            warn(f"{error} Project skipped; the rest of the site is unaffected.")
    return [{field: row[field] for field in CSV_FIELDS} for row in rows]


def footer_csv_text() -> str:
    """Build the DonorStatement.csv contents from data/footer.json."""
    try:
        return _footer_csv_text()
    except (OSError, ValueError) as error:
        warn(f"Footer not updated, keeping the existing statement ({error})")
        if FOOTER_CSV_PATH.exists():
            return FOOTER_CSV_PATH.read_text(encoding="utf-8-sig", newline="")
        return "Statement"


def _footer_csv_text() -> str:
    """Strictly build the DonorStatement.csv contents from data/footer.json."""
    if not FOOTER_PATH.exists():
        raise ValueError(f"{FOOTER_PATH.relative_to(ROOT)} is missing.")

    data = json.loads(FOOTER_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"{FOOTER_PATH.name} must contain a JSON object.")

    statement = str(data.get("donorStatement") or "").strip()
    if not statement:
        raise ValueError(f"{FOOTER_PATH.name}: donorStatement is required.")

    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=FOOTER_CSV_FIELDS, lineterminator=os.linesep)
    writer.writeheader()
    writer.writerow({"Statement": statement})
    return buffer.getvalue().removesuffix(os.linesep)


def write_text_atomically(path: Path, text: str) -> None:
    """Write text through a temporary file before replacing the destination."""
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    try:
        with temporary_path.open("w", encoding="utf-8", newline="") as output:
            output.write(text)
        temporary_path.replace(path)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()


def build() -> None:
    """Write MakerBucks_Database.csv and DonorStatement.csv from the JSON forms."""
    rows = build_rows()
    if not rows:
        raise ValueError("No valid projects found; leaving the existing site data untouched.")
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

    footer_text = footer_csv_text()
    write_text_atomically(FOOTER_CSV_PATH, footer_text)

    fallback_js = (
        "window.MB = window.MB || {};\n"
        f"window.MB.rawCsv = {json.dumps(csv_text)};\n"
        f"window.MB.rawFooterCsv = {json.dumps(footer_text)};\n"
    )
    PROJECT_DATA_PATH.write_text(fallback_js, encoding="utf-8", newline="")

    print(
        f"Wrote {len(rows)} projects to {CSV_PATH.name}, {FOOTER_CSV_PATH.name}, "
        f"and {PROJECT_DATA_PATH.name}."
    )


def check_round_trip() -> None:
    """Verify every form field matches the corresponding generated CSV cell."""
    source_rows = read_csv_rows()
    generated_rows = build_rows()
    if source_rows != generated_rows:
        raise ValueError(
            "The project forms do not match the current CSV. "
            "Run the build command, then check again."
        )

    if not FOOTER_CSV_PATH.exists():
        raise ValueError(f"{FOOTER_CSV_PATH.name} is missing. Run the build command.")
    current_footer = FOOTER_CSV_PATH.read_text(encoding="utf-8-sig", newline="")
    if current_footer != footer_csv_text():
        raise ValueError(
            "The footer form does not match the current DonorStatement.csv. "
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