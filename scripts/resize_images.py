#!/usr/bin/env python3
"""Optimize changed JPEG, PNG, and WebP images and remove embedded metadata."""

from __future__ import annotations

import io
import sys
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
IMAGES_ROOT = (ROOT / "images").resolve()
MAX_SIDE = 2400
SUPPORTED_FORMATS = {"JPEG", "PNG", "WEBP"}


def optimize_image(argument: str) -> bool:
    """Optimize one repository-relative image path; return whether it changed."""
    path = (ROOT / argument).resolve()
    if not path.is_relative_to(IMAGES_ROOT):
        raise ValueError(f"Image path is outside images/: {argument}")
    if not path.is_file():
        return False

    original_size = path.stat().st_size
    with Image.open(path) as source:
        image_format = source.format
        if image_format not in SUPPORTED_FORMATS:
            print(f"Skipped unsupported format: {path.relative_to(ROOT)}")
            return False
        if getattr(source, "is_animated", False):
            print(f"Skipped animated image: {path.relative_to(ROOT)}")
            return False

        oriented = ImageOps.exif_transpose(source)
        has_alpha = "A" in oriented.getbands() or "transparency" in oriented.info
        mode = "RGBA" if has_alpha and image_format != "JPEG" else "RGB"
        normalized = oriented.convert(mode)
        dimensions_changed = max(normalized.size) > MAX_SIDE
        if dimensions_changed:
            normalized.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)

        clean = Image.frombytes(normalized.mode, normalized.size, normalized.tobytes())
        output = io.BytesIO()
        save_options = {"optimize": True}
        if image_format == "JPEG":
            save_options.update(quality=85, progressive=True)
        elif image_format == "WEBP":
            save_options.update(quality=85, method=6)
        clean.save(output, format=image_format, **save_options)

    optimized_bytes = output.getvalue()
    if dimensions_changed or len(optimized_bytes) < original_size:
        path.write_bytes(optimized_bytes)
        print(
            f"Optimized {path.relative_to(ROOT)}: "
            f"{original_size:,} -> {len(optimized_bytes):,} bytes"
        )
        return True

    print(f"Already optimized: {path.relative_to(ROOT)}")
    return False


def main() -> int:
    """Optimize image paths supplied by the command line."""
    try:
        changed = sum(optimize_image(argument) for argument in sys.argv[1:])
    except (OSError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(f"Optimized {changed} image(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())