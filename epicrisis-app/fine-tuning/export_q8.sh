#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TJS_REPO="$SCRIPT_DIR/transformers-js-repo"

MODEL_DIR="${MODEL_DIR:-$APP_DIR/models/epicrisis-merged}"
OUTPUT_DIR="${OUTPUT_DIR:-$SCRIPT_DIR/app/public/models/epicrisis-q8-finetuned-tjs}"
EXPORT_PARENT="${EXPORT_PARENT:-$SCRIPT_DIR/.tjs-export-output-q8}"
VENV_DIR="${VENV_DIR:-$SCRIPT_DIR/.venv-transformersjs-export}"

if [[ ! -d "$MODEL_DIR" ]]; then
  echo "ERROR: MODEL_DIR no existe: $MODEL_DIR" >&2
  exit 1
fi
if [[ ! -d "$TJS_REPO" ]]; then
  echo "ERROR: No se encuentra transformers-js-repo en $TJS_REPO" >&2
  exit 1
fi

# Reusar venv existente o crear uno nuevo
if [[ ! -d "$VENV_DIR" ]]; then
  python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

rm -rf "$EXPORT_PARENT"
mkdir -p "$EXPORT_PARENT"

# Symlink local para evitar model_id absoluto
if [[ -e "$TJS_REPO/epicrisis-merged" ]]; then
  rm -rf "$TJS_REPO/epicrisis-merged"
fi
ln -s "$MODEL_DIR" "$TJS_REPO/epicrisis-merged"

pushd "$TJS_REPO" >/dev/null
python -m scripts.convert \
  --model_id epicrisis-merged \
  --task text-generation-with-past \
  --device cpu \
  --opset 18 \
  --skip_validation \
  --skip_onnxslim \
  --quantize \
  --modes q8 \
  --output_parent_dir "$EXPORT_PARENT"
popd >/dev/null

rm -f "$TJS_REPO/epicrisis-merged"

# Mover salida
rm -rf "$OUTPUT_DIR"
mv "$EXPORT_PARENT/epicrisis-merged" "$OUTPUT_DIR"

# Actualizar config.json
OUTPUT_DIR="$OUTPUT_DIR" python - <<'PY'
import json
import os
from pathlib import Path

out_dir = Path(os.environ["OUTPUT_DIR"])
onnx_dir = out_dir / "onnx"

cfg_path = out_dir / "config.json"
cfg = json.loads(cfg_path.read_text())
cfg.setdefault("transformers.js_config", {})
cfg["transformers.js_config"]["dtype"] = "q8"
cfg_path.write_text(json.dumps(cfg, indent=2))

print("OUTPUT_DIR:", out_dir)
print("ONNX files:")
for f in sorted(onnx_dir.iterdir()):
    size_mb = f.stat().st_size / (1024 * 1024)
    print(f" - {f.name} ({size_mb:.1f} MB)")
PY

echo "OK: export Q8 finalizado en $OUTPUT_DIR"
