#!/usr/bin/env python3
"""Delete an unreferenced project photo folder requested through Pages CMS."""

from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path, PurePosixPath
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PROJECTS_DIR = ROOT / "data" / "projects"
PHOTOS_ROOT = ROOT / "images"
PROJECT_PHOTO_DIRECTORY = "Project 2026"


def validate_folder_name(folder_name: str) -> str:
    """Validate that the requested name identifies one safe child folder."""
    if (
        not folder_name
        or folder_name != folder_name.strip()
        or folder_name in {".", ".."}
        or any(character in folder_name for character in "/\\:\0")
    ):
        raise ValueError("Enter one folder name under images/Project 2026.")
    return folder_name


def folder_is_referenced(folder_name: str, projects_dir: Path) -> bool:
    """Return whether a project form references an image in this folder."""
    expected_prefix = ("images", PROJECT_PHOTO_DIRECTORY, folder_name)

    for form_path in sorted(projects_dir.glob("*.json")):
        project: Any = json.loads(form_path.read_text(encoding="utf-8"))
        if not isinstance(project, dict):
            raise ValueError(f"{form_path.name} must contain a JSON object.")

        photos = project.get("photos", [])
        if not isinstance(photos, list) or any(not isinstance(photo, str) for photo in photos):
            raise ValueError(f"{form_path.name}: photos must be a list of paths.")

        for photo in photos:
            photo_parts = PurePosixPath(photo.replace("\\", "/").lstrip("/")).parts
            if photo_parts[: len(expected_prefix)] == expected_prefix:
                return True

    return False


def delete_photo_folder(
    folder_name: str,
    photos_root: Path = PHOTOS_ROOT,
    projects_dir: Path = PROJECTS_DIR,
) -> Path:
    """Delete one unreferenced project-photo folder and return its path."""
    folder_name = validate_folder_name(folder_name)
    project_photo_root = photos_root.resolve() / PROJECT_PHOTO_DIRECTORY

    if project_photo_root.is_symlink() or not project_photo_root.is_dir():
        raise ValueError(f"{project_photo_root} is not an available photo directory.")

    target = project_photo_root / folder_name
    if target.is_symlink() or not target.is_dir():
        raise ValueError(f"Photo folder does not exist: {target}")
    if target.resolve().parent != project_photo_root.resolve():
        raise ValueError("The requested folder must be directly under Project 2026.")
    if folder_is_referenced(folder_name, projects_dir):
        raise ValueError(
            f"Cannot delete {folder_name!r}: a project form still references its photos."
        )

    shutil.rmtree(target)
    return target


def main() -> int:
    """Read the Pages CMS workflow payload and delete its requested folder."""
    try:
        payload = json.loads(os.environ["PAGES_CMS_PAYLOAD"])
        if not isinstance(payload, dict) or payload.get("source") != "pages-cms":
            raise ValueError("Expected a Pages CMS action payload.")
        inputs = payload.get("inputs")
        if not isinstance(inputs, dict) or not isinstance(inputs.get("folder"), str):
            raise ValueError("The Pages CMS action must include a folder name.")

        deleted_folder = delete_photo_folder(inputs["folder"])
        print(f"Deleted unreferenced photo folder: {deleted_folder.relative_to(ROOT)}")
        return 0
    except (KeyError, OSError, TypeError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())