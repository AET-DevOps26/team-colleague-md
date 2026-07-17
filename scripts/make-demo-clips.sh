#!/usr/bin/env bash
# Converts the Playwright demo recordings into the README clips.
#
#   docker compose up -d && npm run seed:local     # a live, seeded stack
#   cd frontend && npm run demo:record             # writes demo-recordings/<run>/**/*.webm
#   ./scripts/make-demo-clips.sh                   # webm -> docs/assets/demo/*.webp
#
# Animated WebP rather than GIF: GIF is capped at 256 colours, which bands badly across this UI's
# flat fills and gradients, and its frame delays are whole centiseconds. WebP carries true colour at
# roughly half the bytes, and GitHub renders it from a plain <img> exactly like a GIF.
#
# Frame rate is deliberately left at the source's 25fps. Playwright's screencast records at a fixed
# 25 and nothing here can raise that — interpolating up to 60 only invents cross-faded frames that
# ghost on moving text, so the clips ship every frame real. See docs/testing/Frontend_Testing.md.
#
# SPEED=1.25 re-times a clip without dropping a frame of it:
#
#   SPEED=1.25 ./scripts/make-demo-clips.sh   # -> docs/assets/demo/<name>-1.25x.webp
#
# WebP stores a duration per frame, so speeding up shortens each delay (40ms -> 32ms) and every
# recorded frame still ships — this is a re-time, not a decimation. It re-encodes from the .webm
# rather than re-timing the .webp in place because ffmpeg can encode animated WebP but cannot
# decode it. SPEED=1 keeps the original name, so the 1x clips are never overwritten by a fast one.
#
# FFMPEG/FFPROBE can be overridden for a Windows/WSL ffmpeg.exe.
set -euo pipefail

FFMPEG="${FFMPEG:-ffmpeg}"
# ffprobe ships beside ffmpeg, so follow FFMPEG rather than making the caller set both.
if [ -z "${FFPROBE:-}" ]; then
  case "$FFMPEG" in
    */*) FFPROBE="$(dirname "$FFMPEG")/$(basename "$FFMPEG" | sed 's/ffmpeg/ffprobe/')" ;;
    *)   FFPROBE="ffprobe" ;;
  esac
fi

RUNS_DIR="${RUNS_DIR:-frontend/demo-recordings}"
OUT_DIR="${OUT_DIR:-docs/assets/demo}"
# 0-100. Not a percentage of anything intuitive; 75 is visually lossless on flat UI at ~2MB a clip.
QUALITY="${QUALITY:-75}"
# The recordings are 3840x2160 (a 1920x1080 layout captured at 2x), so the default downscales them
# to a 2560-wide clip and supersamples the extra detail in. Never set this above the source: it only
# adds bytes. Lower it to 1920 for a smaller file.
WIDTH="${WIDTH:-2560}"
# GitHub streams a README clip as it downloads, so a few MB plays fine. This is a "look at the
# pacing again" line, not a hard limit.
MAX_MB="${MAX_MB:-12}"
HEAD_TRIM="${HEAD_TRIM:-0.6}"
TAIL_TRIM="${TAIL_TRIM:-0.5}"
# Playback multiplier; 1 = the recorded pace. See the header.
SPEED="${SPEED:-1}"

# A speed-suffixed name, so 1x/1.25x/1.5x renders of one take sit side by side. Trailing zeros are
# dropped: SPEED=1.50 and SPEED=1.5 must not produce two differently-named copies of one clip.
speed_suffix=""
if [ "$(awk -v s="$SPEED" 'BEGIN { print (s == 1) }')" != 1 ]; then
  speed_suffix="-$(awk -v s="$SPEED" 'BEGIN { printf "%g", s }')x"
fi

# Default to the newest run, so re-running this right after a recording does the obvious thing.
# Every run keeps its own directory (playwright.demo.config.ts), so REC_DIR can name an older one
# when that take was better.
if [ -z "${REC_DIR:-}" ]; then
  REC_DIR="$(find "$RUNS_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' 2>/dev/null | sort | tail -1)"
fi

command -v "$FFMPEG" >/dev/null 2>&1 || { echo "ffmpeg not found (set FFMPEG=/path/to/ffmpeg)" >&2; exit 1; }
[ -n "$REC_DIR" ] && [ -d "$REC_DIR" ] || {
  echo "no recordings under $RUNS_DIR — run 'npm run demo:record' first, or set REC_DIR" >&2
  exit 1
}

mkdir -p "$OUT_DIR"
echo "encoding from $REC_DIR"

shopt -s nullglob
found=0
for webm in "$REC_DIR"/*/*.webm; do
  found=1
  # Playwright names the directory "<file>.demo.ts-<test-title>-<project>"; the test title is the
  # clip name we want.
  name="$(basename "$(dirname "$webm")")"
  name="${name%-chromium}"
  name="${name#*.demo.ts-}"
  out="$OUT_DIR/${name}${speed_suffix}.webp"

  # Playwright records the whole context lifetime: a blank first paint at the head, black teardown
  # frames at the tail. Frame 0 is also the still GitHub shows before playback, so it must not be
  # the blank one.
  duration="$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$webm" 2>/dev/null || echo 0)"
  trim=""
  if [ -n "$duration" ] && [ "${duration%%.*}" -gt 2 ] 2>/dev/null; then
    trim="-ss $HEAD_TRIM -t $(awk -v d="$duration" -v h="$HEAD_TRIM" -v t="$TAIL_TRIM" 'BEGIN { printf "%.2f", d - h - t }')"
  fi

  # -loop 0 means forever. Without it libwebp plays once and freezes, which reads as a broken image.
  #
  # These two flags are what make SPEED a re-time rather than a decimation, and both are load-bearing:
  #
  #  -fps_mode passthrough: setpts leaves a faster-than-25 stream behind, and ffmpeg's default would
  #    resample it back to a constant rate by throwing frames away.
  #  -enc_time_base 1/1000: without it the encoder inherits a 1/25 timebase and quantizes every frame
  #    delay onto a 40ms grid. Re-timed frames then round onto the same tick and get a 0ms duration —
  #    i.e. they ship in the file but never display, which is decimation with extra steps. A
  #    millisecond timebase is what lets a 40ms frame become the 26.67ms one that 1.5x needs.
  # shellcheck disable=SC2086
  "$FFMPEG" -v error -y $trim -i "$webm" \
    -vf "setpts=PTS/${SPEED},scale=${WIDTH}:-2:flags=lanczos" -fps_mode passthrough -enc_time_base 1/1000 \
    -c:v libwebp_anim -lossless 0 -q:v "$QUALITY" -compression_level 4 -loop 0 -an "$out"

  size="$(du -m "$out" | cut -f1)"
  printf '%-28s %s  (%sMB)\n' "$name" "$out" "$size"
  if [ "$size" -gt "$MAX_MB" ]; then
    echo "  ^ over ${MAX_MB}MB — trim the script's pauses or lower QUALITY" >&2
  fi
done

[ "$found" = 1 ] || { echo "no .webm files under $REC_DIR" >&2; exit 1; }
