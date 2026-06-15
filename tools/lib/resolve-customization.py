#!/usr/bin/env python3
"""
Resolve customization for a Mighty Powers skill using three-layer TOML merge.

Reads customization from three layers (highest priority first):
  1. {project-root}/.mighty-powers/custom/{name}.user.toml  (personal, gitignored)
  2. {project-root}/.mighty-powers/custom/{name}.toml        (team/org, committed)
  3. {skill-root}/customize.toml                             (skill defaults)

Skill name is derived from the basename of the skill directory.

Outputs merged JSON to stdout. Errors go to stderr.

Requires Python 3.11+ (uses stdlib `tomllib`).

  python3 resolve-customization.py --skill /abs/path/to/skill-dir
  python3 resolve-customization.py --skill ... --key workflow
  python3 resolve-customization.py --skill ... --key workflow.on_complete
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import tomllib
except ImportError:
    sys.stderr.write(
        "error: Python 3.11+ is required (stdlib `tomllib` not found).\n"
        "Install a newer Python or run the resolution manually per the\n"
        "fallback instructions in the skill's SKILL.md.\n"
    )
    sys.exit(3)


_MISSING = object()
_KEYED_MERGE_FIELDS = ("code", "id")


def find_project_root(start: Path):
    current = start.resolve()
    while True:
        if (
            (current / ".mighty-powers").exists()
            or (current / "_bmad").exists()
            or (current / ".git").exists()
        ):
            return current
        parent = current.parent
        if parent == current:
            return None
        current = parent


def custom_dir_for(project_root: Path) -> Path:
    mp = project_root / ".mighty-powers" / "custom"
    if mp.parent.exists():
        return mp
    return project_root / "_bmad" / "custom"


def load_toml(file_path: Path, required: bool = False) -> dict:
    if not file_path.exists():
        if required:
            sys.stderr.write(f"error: required customization file not found: {file_path}\n")
            sys.exit(1)
        return {}
    try:
        with file_path.open("rb") as f:
            parsed = tomllib.load(f)
        if not isinstance(parsed, dict):
            if required:
                sys.stderr.write(f"error: {file_path} did not parse to a table\n")
                sys.exit(1)
            return {}
        return parsed
    except tomllib.TOMLDecodeError as error:
        level = "error" if required else "warning"
        sys.stderr.write(f"{level}: failed to parse {file_path}: {error}\n")
        if required:
            sys.exit(1)
        return {}
    except OSError as error:
        level = "error" if required else "warning"
        sys.stderr.write(f"{level}: failed to read {file_path}: {error}\n")
        if required:
            sys.exit(1)
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
        if not isinstance(item, dict):
            continue
        if item.get(key_name) is not None:
            index_by_key[item[key_name]] = len(result)
        result.append(dict(item))

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


def extract_key(data, dotted_key: str):
    parts = dotted_key.split(".")
    current = data
    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return _MISSING
    return current


def write_json_stdout(output):
    reconfigure = getattr(sys.stdout, "reconfigure", None)
    if reconfigure is not None:
        reconfigure(encoding="utf-8")
    sys.stdout.write(json.dumps(output, indent=2, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Resolve customization for a Mighty Powers skill using three-layer TOML merge.",
        add_help=True,
    )
    parser.add_argument(
        "--skill", "-s", required=True,
        help="Absolute path to the skill directory (must contain customize.toml)",
    )
    parser.add_argument(
        "--key", "-k", action="append", default=[],
        help="Dotted field path to resolve (repeatable). Omit for full dump.",
    )
    args = parser.parse_args()

    skill_dir = Path(args.skill).resolve()
    skill_name = skill_dir.name
    defaults_path = skill_dir / "customize.toml"

    defaults = load_toml(defaults_path, required=True)

    project_root = find_project_root(skill_dir) or find_project_root(Path.cwd())

    team = {}
    user = {}
    if project_root:
        custom_dir = custom_dir_for(project_root)
        team = load_toml(custom_dir / f"{skill_name}.toml")
        user = load_toml(custom_dir / f"{skill_name}.user.toml")

    merged = deep_merge(defaults, team)
    merged = deep_merge(merged, user)

    if args.key:
        output = {}
        for key in args.key:
            value = extract_key(merged, key)
            if value is not _MISSING:
                output[key] = value
    else:
        output = merged

    write_json_stdout(output)


if __name__ == "__main__":
    main()
