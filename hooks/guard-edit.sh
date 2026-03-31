#!/bin/bash
# Mighty Powers Guard — PreToolUse hook for Edit/Write commands
# Blocks edits outside the frozen directory (if set)

FREEZE_FILE="${PWD}/.mighty-powers/guard-freeze.txt"

if [ ! -f "$FREEZE_FILE" ]; then
  exit 0
fi

FREEZE_DIR=$(cat "$FREEZE_FILE" 2>/dev/null | head -1 | tr -d '[:space:]')

if [ -z "$FREEZE_DIR" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//;s/"$//')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

RESOLVED_FREEZE=$(cd "$PWD" && realpath "$FREEZE_DIR" 2>/dev/null || echo "$PWD/$FREEZE_DIR")
RESOLVED_FILE=$(realpath "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")

case "$RESOLVED_FILE" in
  "$RESOLVED_FREEZE"/*)
    exit 0
    ;;
  "$RESOLVED_FREEZE")
    exit 0
    ;;
  *)
    echo "GUARD BLOCKED: Edit outside frozen directory"
    echo "File: $FILE_PATH"
    echo "Allowed directory: $FREEZE_DIR"
    echo "To edit files outside this directory, run /unfreeze first."
    exit 2
    ;;
esac
