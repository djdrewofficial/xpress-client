#!/usr/bin/env python3
"""Regenerate src/components/ui/iconData.ts from src/assets/icons/v2/*.svg."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "src" / "assets" / "icons" / "v2"
OUT = ROOT / "src" / "components" / "ui" / "iconData.ts"


def main() -> None:
    files = sorted(ICON_DIR.glob("*.svg"))
    if not files:
        raise SystemExit(f"No SVGs in {ICON_DIR}")
    lines = [f"  {json.dumps(p.stem)}: {json.dumps(p.read_text().strip())}," for p in files]
    names = [p.stem for p in files]
    OUT.write_text(
        "/* Generated from src/assets/icons/v2/*.svg. Regenerate: python3 scripts/gen-icons.py */\n"
        f"export const ICON_NAMES = {json.dumps(names)} as const;\n\n"
        "export type IconName = (typeof ICON_NAMES)[number];\n\n"
        "export const ICON_XML: Record<IconName, string> = {\n"
        + "\n".join(lines)
        + "\n};\n"
    )
    print(f"Wrote {len(names)} icons to {OUT}")


if __name__ == "__main__":
    main()
