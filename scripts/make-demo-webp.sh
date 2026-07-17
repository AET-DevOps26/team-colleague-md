#!/usr/bin/env bash
# Cuts segments out of a hand-recorded screen capture and encodes them into one README clip.
#
#   ./scripts/make-demo-webp.sh -i frontend/demo_recording/digest.mp4 \
#       -c 0:03-0:11 -c 0:18-0:25 -s 1.5 -r 25 -o ai-daily-digest-1.5x.webp
#
# The segments are concatenated in the order given, then re-timed, then resampled to --fps, then
# scaled — one ffmpeg pass, no intermediate files.
#
# This is the manual counterpart to make-demo-clips.sh: that one batch-converts a whole Playwright
# run (fixed 25fps webm, whole-take, name derived from the test title), this one takes an arbitrary
# recording and the timestamps you picked out of it. Both encode animated WebP for the same reason —
# see the header of make-demo-clips.sh for why WebP over GIF.
#
# Unlike a Playwright screencast, a real capture has a true frame rate (60 here), so --fps is a real
# choice: 25-30 keeps the file small, 60 keeps the source's smoothness at roughly double the bytes.
# Never set it above the source's rate — ffmpeg can only duplicate frames to get there.
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

INPUT=""
OUT=""
OUT_DIR="${OUT_DIR:-docs/assets/demo}"
SPEED="${SPEED:-1}"
FPS="${FPS:-25}"
# Output resolution: a bare width (height follows the source's aspect) or an exact WxH. The
# recordings are 3072x1920, so the default downscales and supersamples the extra detail in. Never
# set this above the source: it only adds bytes. Lower it to 1920 for a smaller file.
SIZE="${SIZE:-${WIDTH:-2560}}"
# 0-100. Not a percentage of anything intuitive; 75 is visually lossless on flat UI.
QUALITY="${QUALITY:-75}"
# GitHub streams a README clip as it downloads, so a few MB plays fine. This is a "look at the
# pacing again" line, not a hard limit.
MAX_MB="${MAX_MB:-12}"
CLIPS=()

usage() {
  cat >&2 <<'EOF'
usage: make-demo-webp.sh -i <video> [-c <start>-<end>]... [options] -o <name.webp>

  -i, --input    PATH    source recording (required)
  -c, --clip     A-B     segment to keep, e.g. 0:12-0:34 or 1:02.5-1:20 or 75-98.
                         Repeat to concatenate several, in the order given.
                         Omit entirely to use the whole video.
  -s, --speed    N       playback multiplier (default 1; 1.5 = 50% faster)
  -r, --fps      N       output frame rate (default 25)
  -o, --out      NAME    output file. A bare name lands in --out-dir; a name with a
                         slash is used as-is. ".webp" is appended if missing.
      --out-dir  DIR     directory for a bare -o name (default docs/assets/demo)
  -w, --size     RES     output resolution: a bare width (2560) keeps the source's
                         aspect, or an exact WxH (1920x1200) forces it. Default 2560.
  -q, --quality  0-100   WebP quality (default 75)
  -n, --dry-run          print the ffmpeg command and exit

examples:
  # one continuous cut, sped up, into the README's clip directory
  ./scripts/make-demo-webp.sh -i frontend/demo_recording/digest.mp4 \
      -c 0:03-0:11 -s 1.5 -o ai-daily-digest-1.5x.webp

  # stitch three moments out of a long take, at 60fps and a smaller resolution
  ./scripts/make-demo-webp.sh -i "frontend/demo_recording/2026-07-17 11-17-12.mp4" \
      -c 0:05-0:14 -c 1:20-1:31 -c 2:47-3:02 -r 60 -w 1920 -o hero-core-loop.webp
EOF
  exit 1
}

# Accepts SS, SS.mmm, MM:SS, or HH:MM:SS and prints seconds. Exits non-zero on anything else, so a
# fat-fingered timestamp fails here rather than silently becoming a 0 and encoding the wrong cut.
parse_time() {
  awk -v t="$1" 'BEGIN {
    n = split(t, a, ":")
    if (n < 1 || n > 3) exit 1
    for (i = 1; i <= n; i++) if (a[i] !~ /^[0-9]+(\.[0-9]+)?$/) exit 1
    if (n == 1) s = a[1]
    else if (n == 2) s = a[1] * 60 + a[2]
    else s = a[1] * 3600 + a[2] * 60 + a[3]
    printf "%.3f", s
  }'
}

while [ $# -gt 0 ]; do
  case "$1" in
    -i|--input)   INPUT="${2:-}"; shift 2 ;;
    -c|--clip)    CLIPS+=("${2:-}"); shift 2 ;;
    -s|--speed)   SPEED="${2:-}"; shift 2 ;;
    -r|--fps)     FPS="${2:-}"; shift 2 ;;
    -o|--out)     OUT="${2:-}"; shift 2 ;;
    --out-dir)    OUT_DIR="${2:-}"; shift 2 ;;
    -w|--size|--width) SIZE="${2:-}"; shift 2 ;;
    -q|--quality) QUALITY="${2:-}"; shift 2 ;;
    -n|--dry-run) DRY_RUN=1; shift ;;
    -h|--help)    usage ;;
    *) echo "unknown option: $1" >&2; usage ;;
  esac
done

command -v "$FFMPEG" >/dev/null 2>&1 || { echo "ffmpeg not found (set FFMPEG=/path/to/ffmpeg)" >&2; exit 1; }
[ -n "$INPUT" ] || { echo "missing -i/--input" >&2; usage; }
[ -f "$INPUT" ] || { echo "no such file: $INPUT" >&2; exit 1; }
[ -n "$OUT" ] || { echo "missing -o/--out" >&2; usage; }
for n in "$SPEED:speed" "$FPS:fps" "$QUALITY:quality"; do
  v="${n%:*}"; label="${n#*:}"
  awk -v v="$v" 'BEGIN { exit !(v ~ /^[0-9]+(\.[0-9]+)?$/ && v + 0 > 0) }' \
    || { echo "--$label must be a positive number, got: $v" >&2; exit 1; }
done

# -2 rather than -1 for a derived height: libwebp wants even dimensions, and -1 will happily hand it
# an odd one. An explicit WxH is passed through as given — that is the point of asking for it.
case "$SIZE" in
  *[0-9]x[0-9]*) scale="scale=${SIZE%x*}:${SIZE#*x}:flags=lanczos" ;;
  *)
    awk -v v="$SIZE" 'BEGIN { exit !(v ~ /^[0-9]+$/ && v + 0 > 0) }' \
      || { echo "--size must be a width (2560) or WxH (1920x1200), got: $SIZE" >&2; exit 1; }
    scale="scale=${SIZE}:-2:flags=lanczos"
    ;;
esac

case "$OUT" in
  *.webp) ;;
  *) OUT="$OUT.webp" ;;
esac
case "$OUT" in
  */*) ;;
  *) OUT="$OUT_DIR/$OUT" ;;
esac

duration="$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$INPUT" 2>/dev/null || echo 0)"

# Build one filter graph: trim each segment to its own stream, concat them, then re-time and scale
# the result. setpts=PTS-STARTPTS per segment rebases each cut to zero, which is what lets concat
# butt them together without a gap the length of the skipped footage.
filters=()
labels=""
idx=0
kept=0
if [ "${#CLIPS[@]}" -eq 0 ]; then
  filters+=("[0:v]setpts=PTS-STARTPTS[v0]")
  labels="[v0]"
  idx=1
  kept="$duration"
else
  for clip in "${CLIPS[@]}"; do
    spec="${clip// /}"
    start_raw="${spec%%-*}"
    end_raw="${spec#*-}"
    [ -n "$start_raw" ] && [ -n "$end_raw" ] && [ "$start_raw" != "$spec" ] \
      || { echo "bad --clip '$clip' — expected <start>-<end>, e.g. 0:12-0:34" >&2; exit 1; }
    start="$(parse_time "$start_raw")" || { echo "bad --clip start '$start_raw'" >&2; exit 1; }
    end="$(parse_time "$end_raw")" || { echo "bad --clip end '$end_raw'" >&2; exit 1; }
    awk -v s="$start" -v e="$end" 'BEGIN { exit !(e > s) }' \
      || { echo "bad --clip '$clip' — end must be after start" >&2; exit 1; }
    awk -v e="$end" -v d="$duration" 'BEGIN { exit !(d > 0 && e > d + 0.05) }' \
      && echo "warning: --clip '$clip' ends past the ${duration}s source; it will stop short" >&2
    filters+=("[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[v${idx}]")
    labels="${labels}[v${idx}]"
    idx=$((idx + 1))
    kept="$(awk -v k="$kept" -v s="$start" -v e="$end" 'BEGIN { printf "%.3f", k + e - s }')"
  done
fi
filters+=("${labels}concat=n=${idx}:v=1:a=0[cat]")
filters+=("[cat]setpts=PTS/${SPEED},fps=${FPS},${scale}[out]")

graph="$(IFS=';'; echo "${filters[*]}")"

# -loop 0 means forever. Without it libwebp plays once and freezes, which reads as a broken image.
# -enc_time_base 1/1000 keeps frame delays off the source's coarse timebase, so an --fps that
# doesn't divide evenly into 1000ms (or a re-timed stream) still gets honest per-frame durations
# instead of frames rounding onto the same tick and shipping with a 0ms delay.
cmd=("$FFMPEG" -v error -y -i "$INPUT"
  -filter_complex "$graph" -map "[out]"
  -fps_mode passthrough -enc_time_base 1/1000
  -c:v libwebp_anim -lossless 0 -q:v "$QUALITY" -compression_level 4 -loop 0 -an "$OUT")

if [ -n "${DRY_RUN:-}" ]; then
  printf '%q ' "${cmd[@]}"; echo
  exit 0
fi

mkdir -p "$(dirname "$OUT")"
"${cmd[@]}"

size="$(du -m "$OUT" | cut -f1)"
# The played length, from the cuts rather than the file: ffmpeg can encode animated WebP but cannot
# decode it, so ffprobe reports N/A duration on its own output.
played="$(awk -v k="$kept" -v s="$SPEED" 'BEGIN { printf "%.1f", k / s }')"
printf '%s  (%sMB, %ss @ %sfps)\n' "$OUT" "$size" "$played" "$FPS"
if [ "$size" -gt "$MAX_MB" ]; then
  echo "  ^ over ${MAX_MB}MB — cut tighter, lower --size, or lower --quality" >&2
fi
