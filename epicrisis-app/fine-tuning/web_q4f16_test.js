import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

const output = document.getElementById('output');
const runBtn = document.getElementById('run');
const systemEl = document.getElementById('system');
const userEl = document.getElementById('user');

// Local model path served by your HTTP server.
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = '/models';

aSyncInit();

let generator = null;
async function aSyncInit() {
  output.textContent = 'Loading model...';
  generator = await pipeline('text-generation', 'epicrisis-q4f16-finetuned-tjs', {
    dtype: 'q4f16',
    quantized: false,
    model_file_name: 'model_q4f16',
  });
  output.textContent = 'Model loaded. Ready.';
}

runBtn.addEventListener('click', async () => {
  if (!generator) return;
  const system = systemEl.value.trim();
  const user = userEl.value.trim();
  const prompt =
    '<|im_start|>system\n' +
    system + '<|im_end|>\n' +
    '<|im_start|>user\n' +
    user + '<|im_end|>\n' +
    '<|im_start|>assistant\n';

  output.textContent = 'Generating...';
  const out = await generator(prompt, {
    max_new_tokens: 120,
    temperature: 0.5,
    top_p: 0.9,
    repetition_penalty: 1.1,
  });
  output.textContent = out[0].generated_text;
});
