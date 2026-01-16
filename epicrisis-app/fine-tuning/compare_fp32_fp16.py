import argparse
import json
from pathlib import Path

import onnxruntime_genai as og


def build_prompt(payload: dict) -> str:
    json_str = json.dumps(payload, ensure_ascii=False)
    return (
        "Genera la epicrisis en un solo parrafo, sin bullets.\n"
        "Usa SOLO los datos del JSON, no inventes.\n\n"
        "Epicrisis:\n"
        f"{json_str}\n\n"
        "Respuesta:"
    )


def run_model(model_dir: Path, prompt: str, max_new_tokens: int, temperature: float, top_p: float) -> str:
    model = og.Model(str(model_dir))
    tokenizer = og.Tokenizer(model)
    tokens = tokenizer.encode(prompt)
    params = og.GeneratorParams(model)
    params.set_search_options(
        max_length=len(tokens) + max_new_tokens,
        temperature=temperature,
        top_p=top_p,
        do_sample=True,
    )

    generator = og.Generator(model, params)
    generator.append_tokens(tokens)
    while not generator.is_done():
        generator.generate_next_token()

    output = tokenizer.decode(generator.get_sequence(0))
    if output.startswith(prompt):
        output = output[len(prompt) :].lstrip()
    if "Respuesta:" in output:
        output = output.split("Respuesta:", 1)[1].lstrip()
    output = output.replace("<|endoftext|>", "").strip()
    output = " ".join(output.split())
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Comparar outputs FP32 vs FP16 vs INT4 (ORT GenAI)")
    parser.add_argument(
        "--input-json",
        required=True,
        help="JSON optimizado como string",
    )
    parser.add_argument("--max-new-tokens", type=int, default=200)
    parser.add_argument("--temperature", type=float, default=0.2)
    parser.add_argument("--top-p", type=float, default=0.8)
    parser.add_argument(
        "--fp32-dir",
        default=str(
            Path(__file__).resolve().parent
            / "app"
            / "public"
            / "models"
            / "onnx-cpu-fp32"
        ),
    )
    parser.add_argument(
        "--fp16-dir",
        default=str(
            Path(__file__).resolve().parent
            / "app"
            / "public"
            / "models"
            / "onnx-cpu-fp16"
        ),
    )
    parser.add_argument(
        "--int4-dir",
        default=str(
            Path(__file__).resolve().parent
            / "app"
            / "public"
            / "models"
            / "onnx-cpu-int4-qmix"
        ),
    )
    parser.add_argument(
        "--out-dir",
        default=str(Path(__file__).resolve().parent / "outputs"),
    )

    args = parser.parse_args()
    payload = json.loads(args.input_json)
    prompt = build_prompt(payload)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    models = [
        ("FP32", args.fp32_dir, "epicrisis_fp32.txt"),
        ("FP16", args.fp16_dir, "epicrisis_fp16.txt"),
        ("INT4", args.int4_dir, "epicrisis_int4.txt"),
    ]

    print("=" * 60)
    print("COMPARACION DE MODELOS ONNX")
    print("=" * 60)

    for name, model_dir, out_file in models:
        out_path = out_dir / out_file
        print(f"\n[{name}] Cargando modelo desde {model_dir}...")
        try:
            text = run_model(Path(model_dir), prompt, args.max_new_tokens, args.temperature, args.top_p)
            out_path.write_text(text, encoding="utf-8")
            print(f"[{name}] OK -> {out_path}")
            print(f"[{name}] Respuesta:\n{text[:500]}{'...' if len(text) > 500 else ''}")
        except Exception as exc:  # noqa: BLE001
            print(f"[{name}] ERROR: {exc}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
