#!/usr/bin/env bash
# Converts the Playwright demo recordings into the README GIFs.
#
#   docker compose up -d && npm run seed:local     # a live, seeded stack
#   cd frontend && npm run demo:record             # writes demo-recordings/**/*.webm
#   ./scripts/make-demo-gifs.sh                    # webm -> docs/assets/demo/*.gif
#
# Two-pass palette (palettegen/paletteuse): single-pass GIF encoding bands badly on the UI's flat
# colours. FFMPEG/FFPROBE can be overridden for a Windows/WSL ffmpeg.exe.
set -euo pipefail

FFMPEG="${FFMPEG:-ffmpeg}"
# ffprobe ships beside ffmpeg, so follow FFMPEG rather than making the caller set both.
if [ -z "${FFPROBE:-}" ]; then
  case "$FFMPEG" in
    */*) FFPROBE="$(dirname "$FFMPEG")/$(basename "$FFMPEG" | sed 's/ffmpeg/ffprobe/')" ;;
    *)   FFPROBE="ffprobe" ;;
  esac
fi
REC_DIR="${REC_DIR:-frontend/demo-recordings}"
OUT_DIR="${OUT_DIR:-docs/assets/demo}"
FPS="${FPS:-15}"
# The recordings are 1280x720; keep that, since downscaling is what made the UI text mushy.
WIDTH="${WIDTH:-1280}"
# GitHub streams a README GIF as it downloads, so a few MB plays fine. This is a "look at the
# pacing again" line, not a hard limit.
MAX_MB="${MAX_MB:-12}"
HEAD_TRIM="${HEAD_TRIM:-0.6}"
TAIL_TRIM="${TAIL_TRIM:-0.5}"

command -v "$FFMPEG" >/dev/null 2>&1 || { echo "ffmpeg not found (set FFMPEG=/path/to/ffmpeg)" >&2; exit 1; }
[ -d "$REC_DIR" ] || { echo "no recordings in $REC_DIR — run 'npm run demo:record' first" >&2; exit 1; }

mkdir -p "$OUT_DIR"
palette="$(mktemp -t verita-palette-XXXX.png)"
trap 'rm -f "$palette"' EXIT

shopt -s nullglob
found=0
for webm in "$REC_DIR"/*/*.webm; do
  found=1
  # Playwright names the directory "<file>.demo.ts-<test-title>-<project>"; the test title is the
  # GIF name we want.
  name="$(basename "$(dirname "$webm")")"
  name="${name%-chromium}"
  name="${name#*.demo.ts-}"
  out="$OUT_DIR/${name}.gif"

  # Playwright records the whole context lifetime: a blank first paint at the head, black teardown
  # frames at the tail. Frame 0 is also the still GitHub shows before playback, so it must not be
  # the blank one.
  duration="$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$webm" 2>/dev/null || echo 0)"
  trim=""
  if [ -n "$duration" ] && [ "${duration%%.*}" -gt 2 ] 2>/dev/null; then
    trim="-ss $HEAD_TRIM -t $(awk -v d="$duration" -v h="$HEAD_TRIM" -v t="$TAIL_TRIM" 'BEGIN { printf "%.2f", d - h - t }')"
  fi

  filters="fps=${FPS},scale=${WIDTH}:-1:flags=lanczos"
  # shellcheck disable=SC2086
  "$FFMPEG" -v error -y $trim -i "$webm" -vf "${filters},palettegen=stats_mode=diff" "$palette"
  # shellcheck disable=SC2086
  "$FFMPEG" -v error -y $trim -i "$webm" -i "$palette" \
    -lavfi "${filters} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3" "$out"

  size="$(du -m "$out" | cut -f1)"
  printf '%-28s %s  (%sMB)\n' "$name" "$out" "$size"
  if [ "$size" -gt "$MAX_MB" ]; then
    echo "  ^ over ${MAX_MB}MB — trim the script's pauses or drop FPS" >&2
  fi
done

[ "$found" = 1 ] || { echo "no .webm files under $REC_DIR" >&2; exit 1; }
