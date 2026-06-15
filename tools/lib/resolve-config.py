#!/usr/bin/env python3
"""
Resolve Mighty Powers central config (agents roster + optional overrides).

Layers (highest priority last):
  1. Bundled default-agents.toml (next to this script)
  2. {project-root}/.mighty-powers/agents.toml
  3. {project-root}/.mighty-powers/agents.user.toml

Outputs merged JSON to stdout.

  python3 resolve-config.py --project-root /abs/path/to/project
  python3 resolve-config.py --project-root ... --key agents
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import tomllib
except ImportError:
    sys.stderr.write("error: Python 3.11+ required (stdlib tomllib not found).\n")
    sys.exit(3)

_MISSING = object()
_KEYED_MERGE_FIELDS = ("code", "id")
_LIB_DIR = Path(__file__).resolve().parent


def load_toml(file_path: Path) -> dict:
    if not file_path.exists():
        return {}
    try:
        with file_path.open("rb") as f:
            parsed = tomllib.load(f)
        return parsed if isinstance(parsed, dict) else {}
    except (tomllib.TOMLDecodeError, OSError) as error:
        sys.stderr.write(f"warning: failed to read {file_path}: {error}\n")
        return {}


def _detect_keyed_merge_field(items):
    if not items or not all(isinstance(item, dict) for item in items):
        return None
    for candidate in _KEYED_MERGE_FIELDS:
        if all(item.get(candidate) is not None for item in items):
            return candidate
    return None


def _merge_by_key(base, override, key_name):
    result = []
    index_by_key = {}
    for item in base:
        if isinstance(item, dict) and item.get(key_name) is not None:
            index_by_key[item[key_name]] = len(result)
        result.append(dict(item) if isinstance(item, dict) else item)
    for item in override:
        if not isinstance(item, dict):
            result.append(item)
            continue
        key = item.get(key_name)
        if key is not None and key in index_by_key:
            result[index_by_key[key]] = dict(item)
        else:
            if key is not None:
                index_by_key[key] = len(result)
            result.append(dict(item))
    return result


def _merge_arrays(base, override):
    base_arr = base if isinstance(base, list) else []
    override_arr = override if isinstance(override, list) else []
    keyed_field = _detect_keyed_merge_field(base_arr + override_arr)
    if keyed_field:
        return _merge_by_key(base_arr, override_arr, keyed_field)
    return base_arr + override_arr


def deep_merge(base, override):
    if isinstance(base, dict) and isinstance(override, dict):
        result = dict(base)
        for key, over_val in override.items():
            if key in result:
                result[key] = deep_merge(result[key], over_val)
            else:
                result[key] = over_val
        return result
    if isinstance(base, list) and isinstance(override, list):
        return _merge_arrays(base, override)
    return override


def agents_table_to_map(agents_list):
    result = {}
    for item in agents_list or []:
        if isinstance(item, dict) and item.get("code"):
            result[item["code"]] = dict(item)
    return result


def extract_key(data, dotted_key: str):
    parts = dotted_key.split(".")
    current = data
    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return _MISSING
    return current


def main():
    parser = argparse.ArgumentParser(description="Resolve Mighty Powers central config.")
    parser.add_argument("--project-root", "-p", required=True)
    parser.add_argument("--key", "-k", action="append", default=[])
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    mp_dir = project_root / ".mighty-powers"

    defaults = load_toml(_LIB_DIR / "default-agents.toml")
    team = load_toml(mp_dir / "agents.toml")
    user = load_toml(mp_dir / "agents.user.toml")

    merged = deep_merge(defaults, team)
    merged = deep_merge(merged, user)

    # Normalize [[agents]] list to {code: {...}} map for party-mode
    if isinstance(merged.get("agents"), list):
        merged["agents"] = agents_table_to_map(merged["agents"])

    if args.key:
        output = {}
        for key in args.key:
            value = extract_key(merged, key)
            if value is not _MISSING:
                output[key] = value
    else:
        output = merged

    sys.stdout.write(json.dumps(output, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
