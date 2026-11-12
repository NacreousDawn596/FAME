#!/usr/bin/env python3
"""Export every FAME app-instance database to JSON (one file per instance).

Reads instances.csv (same source of truth as deploy.py) and, for each app
instance (any name other than "fame", which is the static home screen and has
no database), dumps every public table into exports/<name>.json.

Usage:
    python3 export.py              # export all app instances
    python3 export.py fame-avl     # export a single instance
"""

from __future__ import annotations

import csv
import json
import pathlib
import subprocess
import sys
from datetime import UTC, datetime

ROOT = pathlib.Path(__file__).resolve().parent
CSV_PATH = ROOT / "instances.csv"
OUT_DIR = ROOT / "exports"

# Alembic's bookkeeping table holds no domain data.
SKIP_TABLES = {"alembic_version"}


def read_instances() -> list[dict]:
    with CSV_PATH.open(newline="") as fh:
        return [
            {"name": r["name"].strip(), "port": r["port"].strip()}
            for r in csv.DictReader(fh)
        ]


def run_psql(container: str, sql: str) -> str:
    proc = subprocess.run(
        ["docker", "exec", container, "psql", "-U", "fame", "-d", "fame", "-tAc", sql],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"psql failed on {container}: {proc.stderr.strip()}")
    return proc.stdout


def list_tables(container: str) -> list[str]:
    out = run_psql(
        container,
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;",
    )
    return [line.strip() for line in out.splitlines() if line.strip()]


def dump_table(container: str, table: str) -> list:
    quoted = f'"{table}"'
    out = run_psql(
        container,
        f"SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)::text FROM {quoted} t;",
    )
    return json.loads(out)


def export_instance(name: str) -> None:
    container = f"{name}-postgres-1"
    tables = {t for t in list_tables(container) if t not in SKIP_TABLES}
    payload = {
        "instance": name,
        "exported_at": datetime.now(UTC).isoformat(),
        "tables": {t: dump_table(container, t) for t in sorted(tables)},
    }
    OUT_DIR.mkdir(exist_ok=True)
    out_path = OUT_DIR / f"{name}.json"
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    row_counts = {t: len(rows) for t, rows in payload["tables"].items()}
    print(f"  {name} -> {out_path}  ({len(tables)} tables)")
    for t, n in row_counts.items():
        print(f"      {t}: {n} rows")


def main() -> None:
    if not CSV_PATH.exists():
        print(f"error: {CSV_PATH} not found", file=sys.stderr)
        sys.exit(1)

    instances = read_instances()
    apps = [i for i in instances if i["name"] != "fame"]

    requested = sys.argv[1:] if len(sys.argv) > 1 else None
    if requested:
        targets = [i["name"] for i in apps if i["name"] in requested]
        missing = [n for n in requested if n not in {i["name"] for i in apps}]
        if missing:
            print(f"warning: not app instances (skipped): {', '.join(missing)}")
    else:
        targets = [i["name"] for i in apps]

    print(f"Exporting {len(targets)} database(s)...")
    for name in targets:
        try:
            export_instance(name)
        except RuntimeError as exc:
            print(f"  !! {exc}", file=sys.stderr)
    print("done.")


if __name__ == "__main__":
    main()
