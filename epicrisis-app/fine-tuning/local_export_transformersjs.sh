#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TJS_REPO="$SCRIPT_DIR/transformers-js-repo"

MODEL_DIR="${MODEL_DIR:-$APP_DIR/models/epicrisis-merged}"
OUTPUT_DIR="${OUTPUT_DIR:-$APP_DIR/models/epicrisis-q4f16-finetuned-tjs}"
WORK_DIR="${WORK_DIR:-$SCRIPT_DIR/.tjs-export-work}"
EXPORT_PARENT="${EXPORT_PARENT:-$SCRIPT_DIR/.tjs-export-output}"
VENV_DIR="${VENV_DIR:-$SCRIPT_DIR/.venv-transformersjs-export}"

if [[ ! -d "$MODEL_DIR" ]]; then
  echo "ERROR: MODEL_DIR no existe: $MODEL_DIR" >&2
  exit 1
fi
if [[ ! -d "$TJS_REPO" ]]; then
  echo "ERROR: No se encuentra transformers-js-repo en $TJS_REPO" >&2
  exit 1
fi

python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"
python -m pip install --upgrade pip >/dev/null

# Dependencias en versiones conocidas
python -m pip install -q \
  "torch>=2.2" \
  "optimum[exporters]==1.23.3" \
  "transformers==4.45.2" \
  "onnx" \
  "onnxruntime==1.20.1" \
  "onnxslim" \
  "onnxscript" \
  "protobuf<5" \
  "accelerate"

# Parchear cleanup en Optimum para evitar FileNotFoundError de .onnx.data
python - <<'PY'
import site
from pathlib import Path

site_packages = next(p for p in site.getsitepackages() if p.endswith("site-packages"))
convert_py = Path(site_packages) / "optimum" / "exporters" / "onnx" / "convert.py"
text = convert_py.read_text()
old = "os.remove(output.parent / tensor)"
new = "path = output.parent / tensor\n            if path.exists():\n                os.remove(path)"
if old in text and new not in text:
    text = text.replace(old, new, 1)
    convert_py.write_text(text)
    print("patched optimum cleanup:", convert_py)
else:
    print("optimum cleanup already patched:", convert_py)
PY

# Asegurar model_type en config.json
MODEL_DIR="$MODEL_DIR" python - <<'PY'
import json
import os
from pathlib import Path

path = Path(os.environ["MODEL_DIR"]) / "config.json"
cfg = json.loads(path.read_text())
cfg.setdefault("model_type", "qwen2")
cfg.setdefault("architectures", ["Qwen2ForCausalLM"])
path.write_text(json.dumps(cfg, indent=2))
print("updated:", path)
PY

# Parche para legacy + no_dynamic_axes (evita torch.export constraints)
TJS_REPO="$TJS_REPO" python - <<'PY'
from pathlib import Path
import os

p = Path(os.environ["TJS_REPO"]) / "scripts" / "convert.py"
lines = p.read_text().splitlines()
out = []
in_core = False
inserted = False
skip_keys = {
    "legacy=",
    "no_dynamic_axes=",
    "no_post_process=",
    "batch_size=",
    "sequence_length=",
}

for line in lines:
    stripped = line.strip()
    if stripped.startswith("core_export_kwargs = dict("):
        in_core = True
        out.append(line)
        if not inserted:
            out.append("        legacy=True,")
            out.append("        no_dynamic_axes=True,")
            out.append("        no_post_process=True,")
            out.append("        batch_size=1,")
            out.append("        sequence_length=2,")
            inserted = True
        continue
    if in_core:
        if any(stripped.startswith(k) for k in skip_keys):
            continue
        if stripped == ")":
            in_core = False
    out.append(line)

p.write_text("\n".join(out) + "\n")
print("patched core_export_kwargs:", p)
PY

# Evitar fallo si falta un archivo externo previo
TJS_REPO="$TJS_REPO" python - <<'PY'
from pathlib import Path
import os

p = Path(os.environ["TJS_REPO"]) / "scripts" / "convert.py"
text = p.read_text()
old = "os.remove(output.parent / tensor)"
new = "path = output.parent / tensor\n            if path.exists():\n                os.remove(path)"
if old in text and new not in text:
    text = text.replace(old, new, 1)
    p.write_text(text)
    print("patched cleanup:", p)
else:
    print("cleanup already patched:", p)
PY

rm -rf "$WORK_DIR" "$EXPORT_PARENT"
mkdir -p "$WORK_DIR" "$EXPORT_PARENT"

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
  --modes q4f16 \
  --output_parent_dir "$EXPORT_PARENT"
popd >/dev/null

rm -f "$TJS_REPO/epicrisis-merged"

# Mover salida y actualizar config.json
rm -rf "$OUTPUT_DIR"
mv "$EXPORT_PARENT/epicrisis-merged" "$OUTPUT_DIR"

OUTPUT_DIR="$OUTPUT_DIR" python - <<'PY'
import json
import os
from pathlib import Path

out_dir = Path(os.environ["OUTPUT_DIR"])
onnx_dir = out_dir / "onnx"
use_ext = {}
for f in onnx_dir.glob("*.onnx"):
    if (onnx_dir / f"{f.name}_data").exists():
        use_ext[f.name] = 1

cfg_path = out_dir / "config.json"
cfg = json.loads(cfg_path.read_text())
cfg.setdefault("transformers.js_config", {})
cfg["transformers.js_config"]["dtype"] = "q4f16"
cfg["transformers.js_config"]["kv_cache_dtype"] = {
    "q4f16": "float16",
    "fp16": "float16",
}
if use_ext:
    cfg["transformers.js_config"]["use_external_data_format"] = use_ext
cfg_path.write_text(json.dumps(cfg, indent=2))

print("OUTPUT_DIR:", out_dir)
print("ONNX files:")
for f in sorted(onnx_dir.iterdir()):
    print(" -", f.name)
PY

echo "OK: export finalizado en $OUTPUT_DIR"
