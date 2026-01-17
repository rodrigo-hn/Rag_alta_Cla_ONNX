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


def main() -> None:
    parser = argparse.ArgumentParser(description="Epicrisis ONNX runner (ORT GenAI)")
    default_model_dir = (
        Path(__file__).resolve().parent
        / "app"
        / "public"
        / "models"
        / "onnx-cpu-fp32"
    )
    parser.add_argument(
        "--model-dir",
        default=str(default_model_dir),
        help="Ruta a la carpeta del modelo ORT GenAI",
    )
    parser.add_argument(
        "--input-json",
        required=True,
        help="JSON optimizado como string (ej: '{\"dx\":[...],...}')",
    )
    parser.add_argument("--max-new-tokens", type=int, default=200)
    parser.add_argument("--temperature", type=float, default=0.2)
    parser.add_argument("--top-p", type=float, default=0.8)

    args = parser.parse_args()

    payload = json.loads(args.input_json)
    prompt = build_prompt(payload)

    model = og.Model(args.model_dir)
    tokenizer = og.Tokenizer(model)

    tokens = tokenizer.encode(prompt)
    params = og.GeneratorParams(model)
    params.set_search_options(
        max_length=len(tokens) + args.max_new_tokens,
        temperature=args.temperature,
        top_p=args.top_p,
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
    sentences = [s.strip() for s in output.split(".") if s.strip()]
    deduped = []
    seen = set()
    for sentence in sentences:
        key = sentence.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(sentence)
    output = ". ".join(deduped)
    if output and not output.endswith("."):
        output += "."
    print(output)


if __name__ == "__main__":
    main()
