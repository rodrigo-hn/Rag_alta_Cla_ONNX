import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline, env } from '@xenova/transformers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use local model files only.
env.allowLocalModels = true;
env.allowRemoteModels = false;
// Models live at epicrisis-app/models
const localModelsDir = path.resolve(__dirname, '../models');
env.localModelPath = localModelsDir;

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i];
  if (!key.startsWith('--')) continue;
  const next = process.argv[i + 1];
  if (!next || next.startsWith('--')) {
    args.set(key, true);
  } else {
    args.set(key, next);
    i += 1;
  }
}

const modelId = args.get('--model-id') ?? 'epicrisis-finetuned-onnx-1';
const modelFileName = args.get('--model-file-name');
const dtype = args.get('--dtype') ?? 'fp16';
const useQwenTemplate = args.has('--qwen-template');
const promptOverride = args.get('--prompt');
const systemOverride = args.get('--system');
const userOverride = args.get('--user');
const quantized = args.has('--quantized') ? true : args.has('--no-quantized') ? false : false;

const generatorOpts = {
  dtype,
  quantized,
};
if (modelFileName) {
  generatorOpts.model_file_name = modelFileName;
}
const generator = await pipeline('text-generation', modelId, generatorOpts);

const messages = [
  {
    role: 'system',
    content:
      systemOverride ??
      'Eres un asistente medico experto en epicrisis clinicas en espanol. No traduzcas.',
  },
  {
    role: 'user',
    content: userOverride ?? 'Epicrisis: {"dx":["J18.9"]}',
  },
];

let prompt = '';
if (promptOverride) {
  prompt = promptOverride;
} else if (useQwenTemplate) {
  prompt =
    '<|im_start|>system\n' +
    `${messages[0].content}<|im_end|>\n` +
    '<|im_start|>user\n' +
    `${messages[1].content}<|im_end|>\n` +
    '<|im_start|>assistant\n';
} else {
  prompt = generator.tokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    tokenize: false,
  });
}

const out = await generator(prompt, {
  max_new_tokens: 80,
  temperature: 0.5,
  top_p: 0.9,
  repetition_penalty: 1.1,
});

console.log(out[0].generated_text);
