"""
Minimal ONNX Runtime inference for the q4f16 fine-tuned model.

Usage:
  python3 epicrisis-app/fine-tuning/onnx_min_infer.py \
    --model epicrisis-app/models/epicrisis-q4f16-finetuned/onnx/model_q4f16.onnx \
    --steps 1

  python3 epicrisis-app/fine-tuning/onnx_min_infer.py \
    --model epicrisis-app/models/epicrisis-q4f16-finetuned/onnx/model_q4f16.onnx \
    --user "Epicrisis: {\\\"dx\\\":[\\\"J18.9\\\"]}" \
    --steps 5 \
    --decode \
    --use-chat-template

Notes:
- Disables graph optimizations to avoid SimplifiedLayerNormFusion error in ORT.
- past_key_values inputs are float32 (per model input types).
- If --decode is set or --prompt is used, requires transformers to be installed.
"""

import argparse
from pathlib import Path
import numpy as np
import onnxruntime as ort


def main() -> int:
    parser = argparse.ArgumentParser(description="Run minimal ONNXRuntime inference.")
    parser.add_argument(
        "--model",
        default="epicrisis-app/models/epicrisis-q4f16-finetuned/onnx/model_q4f16.onnx",
        help="Path to ONNX model",
    )
    parser.add_argument(
        "--tokenizer",
        default=None,
        help="Path to tokenizer directory (defaults to model's parent directory)",
    )
    parser.add_argument("--seq-len", type=int, default=1, help="Current sequence length")
    parser.add_argument("--past-seq", type=int, default=0, help="Past sequence length")
    parser.add_argument("--steps", type=int, default=1, help="Autoregressive steps to run")
    parser.add_argument("--prompt", default=None, help="Optional plain text prompt")
    parser.add_argument("--system", default=None, help="System message (chat template)")
    parser.add_argument("--user", default=None, help="User message (chat template)")
    parser.add_argument(
        "--use-chat-template",
        action="store_true",
        help="Use tokenizer chat template when --system/--user are provided",
    )
    parser.add_argument(
        "--qwen-template",
        action="store_true",
        help="Use built-in Qwen chat template format",
    )
    parser.add_argument(
        "--chat-template",
        default=None,
        help="Optional chat template override (Jinja-like string)",
    )
    parser.add_argument(
        "--print-prompt",
        action="store_true",
        help="Print the final prompt text used for tokenization",
    )
    parser.add_argument(
        "--no-eos",
        action="store_true",
        help="Prevent eos_token_id from being selected",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.0,
        help="Sampling temperature (0 = greedy)",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=0,
        help="Top-k sampling (0 = disabled)",
    )
    parser.add_argument(
        "--top-p",
        type=float,
        default=0.0,
        help="Top-p (nucleus) sampling (0 = disabled)",
    )
    parser.add_argument(
        "--repetition-penalty",
        type=float,
        default=1.0,
        help="Penalize repeated tokens (>1.0 applies penalty)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for sampling",
    )
    parser.add_argument("--decode", action="store_true", help="Decode tokens to text")
    args = parser.parse_args()

    tokenizer = None
    if args.decode or args.prompt is not None:
        try:
            from transformers import AutoTokenizer
        except Exception as exc:
            raise RuntimeError("transformers is required for --decode/--prompt") from exc

        if args.tokenizer:
            tokenizer_dir = args.tokenizer
        else:
            model_path = Path(args.model)
            tokenizer_dir = model_path.parent.parent
        tokenizer = AutoTokenizer.from_pretrained(tokenizer_dir)
        if tokenizer.__class__.__name__ not in ("Qwen2Tokenizer", "Qwen2TokenizerFast"):
            raise RuntimeError(f"Unexpected tokenizer class: {tokenizer.__class__.__name__}")
        if tokenizer.eos_token_id is not None and tokenizer.eos_token_id != 151645:
            raise RuntimeError(f"Unexpected eos_token_id: {tokenizer.eos_token_id}")

    so = ort.SessionOptions()
    so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_DISABLE_ALL

    sess = ort.InferenceSession(args.model, sess_options=so, providers=["CPUExecutionProvider"])

    batch = 1
    seq_len = args.seq_len
    past_seq = args.past_seq
    num_kv_heads = 2
    head_dim = 128

    if args.use_chat_template and (args.system or args.user):
        if not tokenizer:
            raise RuntimeError("Tokenizer is required for chat template.")
        messages = []
        if args.system:
            messages.append({"role": "system", "content": args.system})
        if args.user:
            messages.append({"role": "user", "content": args.user})
        if not messages:
            raise ValueError("No chat messages provided.")
        system_text = args.system or ""
        user_text = args.user or ""
        if args.qwen_template:
            prompt_text = (
                "<|im_start|>system\n"
                f"{system_text}<|im_end|>\n"
                "<|im_start|>user\n"
                f"{user_text}<|im_end|>\n"
                "<|im_start|>assistant\n"
            )
        elif args.chat_template and ("{{system}}" in args.chat_template or "{{user}}" in args.chat_template):
            prompt_text = args.chat_template
            prompt_text = prompt_text.replace("{{system}}", system_text)
            prompt_text = prompt_text.replace("{{user}}", user_text)
            prompt_text = prompt_text.replace("{{assistant}}", "")
        else:
            try:
                prompt_text = tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=True,
                    chat_template=args.chat_template,
                )
            except ValueError:
                # Fallback to Qwen-style template if tokenizer lacks one.
                prompt_text = (
                    "<|im_start|>system\n"
                    f"{system_text}<|im_end|>\n"
                    "<|im_start|>user\n"
                    f"{user_text}<|im_end|>\n"
                    "<|im_start|>assistant\n"
                )
        if args.print_prompt:
            print(f"prompt_text: {prompt_text}")
        encoded = tokenizer.encode(prompt_text, add_special_tokens=False)
        if not encoded:
            raise ValueError("Chat template produced no tokens; check messages.")
        input_ids = np.array([encoded], dtype=np.int64)
        seq_len = input_ids.shape[1]
    elif args.prompt is not None:
        encoded = tokenizer.encode(args.prompt, add_special_tokens=False)
        if not encoded:
            raise ValueError("Prompt produced no tokens; try a different prompt.")
        if args.print_prompt:
            print(f"prompt_text: {args.prompt}")
        input_ids = np.array([encoded], dtype=np.int64)
        seq_len = input_ids.shape[1]
    else:
        input_ids = np.array([[1] * seq_len], dtype=np.int64)

    outputs_meta = {o.name: o for o in sess.get_outputs()}
    logits_name = next((name for name in outputs_meta if "logits" in name), None)
    if not logits_name:
        raise RuntimeError("No logits output found in ONNX graph.")

    past_kv = {}

    generated_tokens = []

    eos_token_id = tokenizer.eos_token_id if tokenizer else None

    if args.seed is not None:
        np.random.seed(args.seed)

    for step in range(args.steps):
        position_ids = np.arange(past_seq, past_seq + seq_len, dtype=np.int64)
        feeds = {
            "input_ids": input_ids,
            "attention_mask": np.ones((batch, past_seq + seq_len), dtype=np.int64),
            "position_ids": position_ids.reshape(1, -1),
        }

        for layer in range(28):
            k_name = f"past_key_values.{layer}.key"
            v_name = f"past_key_values.{layer}.value"
            if past_kv:
                feeds[k_name] = past_kv[k_name]
                feeds[v_name] = past_kv[v_name]
            else:
                feeds[k_name] = np.zeros((batch, num_kv_heads, past_seq, head_dim), dtype=np.float32)
                feeds[v_name] = np.zeros((batch, num_kv_heads, past_seq, head_dim), dtype=np.float32)

        outputs = sess.run(None, feeds)
        output_map = dict(zip(outputs_meta.keys(), outputs))
        logits = output_map[logits_name]

        last_logits = logits[0, -1].copy()
        if args.no_eos and eos_token_id is not None:
            last_logits[eos_token_id] = -1e9
        if args.repetition_penalty and args.repetition_penalty > 1.0:
            for token_id in set(generated_tokens):
                if last_logits[token_id] > 0:
                    last_logits[token_id] /= args.repetition_penalty
                else:
                    last_logits[token_id] *= args.repetition_penalty
        if args.temperature and args.temperature > 0:
            last_logits = last_logits / float(args.temperature)
            if args.top_k and args.top_k > 0:
                top_k = min(args.top_k, last_logits.shape[0])
                top_indices = np.argpartition(last_logits, -top_k)[-top_k:]
                mask = np.full_like(last_logits, -1e9)
                mask[top_indices] = last_logits[top_indices]
                last_logits = mask
            probs = np.exp(last_logits - np.max(last_logits))
            probs = probs / probs.sum()
            if args.top_p and args.top_p > 0.0:
                sorted_idx = np.argsort(probs)[::-1]
                sorted_probs = probs[sorted_idx]
                cum_probs = np.cumsum(sorted_probs)
                cutoff = cum_probs <= args.top_p
                if not np.any(cutoff):
                    cutoff[0] = True
                keep_idx = sorted_idx[cutoff]
                filtered = np.zeros_like(probs)
                filtered[keep_idx] = probs[keep_idx]
                probs = filtered / filtered.sum()
            next_token = int(np.random.choice(len(probs), p=probs))
        else:
            next_token = int(np.argmax(last_logits))
        generated_tokens.append(next_token)
        print(f"step {step + 1}: next_token_id={next_token} logits_shape={logits.shape}")

        present = {
            name: value
            for name, value in output_map.items()
            if ("present" in name or "past_key_values" in name)
            and (name.endswith(".key") or name.endswith(".value"))
        }
        past_kv = {}
        for name, value in present.items():
            past_name = name.replace("present", "past_key_values")
            past_kv[past_name] = value

        past_seq += seq_len
        input_ids = np.array([[next_token]], dtype=np.int64)
        seq_len = 1

    if tokenizer:
        text = tokenizer.decode(generated_tokens, skip_special_tokens=True)
        print(f"decoded_text: {text}")

    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
