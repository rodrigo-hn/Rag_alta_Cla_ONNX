import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm';

const output = document.getElementById('output');
const runBtn = document.getElementById('run');
const systemEl = document.getElementById('system');
const userEl = document.getElementById('user');

// Local model path served by your HTTP server.
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = '/models';
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;

aSyncInit();

let generator = null;
async function aSyncInit() {
  output.textContent = 'Loading model...';
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const deviceParam = urlParams.get('device');
    const dtypeParam = urlParams.get('dtype');
    const modelFileParam = urlParams.get('model');
    const hasWebGPU = 'gpu' in navigator;
    const device = deviceParam ?? (hasWebGPU ? 'webgpu' : 'wasm');
    const dtype = dtypeParam ?? 'q4f16';
    const modelFileName = modelFileParam ?? 'decoder_with_past_model';
    if (dtype === 'fp16' && device !== 'webgpu') {
      output.textContent = 'fp16 requiere WebGPU. Usa ?device=webgpu&dtype=fp16';
      return;
    }
    generator = await pipeline('text-generation', 'epicrisis-q4f16-finetuned-tjs', {
      dtype,
      quantized: false,
      model_file_name: modelFileName,
      device,
    });
    output.textContent = `Model loaded. Ready. (${device})`;
  } catch (err) {
    console.error(err);
    if (typeof err === 'number') {
      output.textContent = `Error loading model: ${err} (0x${err.toString(16)})`;
    } else if (err && typeof err === 'object' && 'message' in err) {
      output.textContent = `Error loading model: ${err.message}`;
    } else {
      output.textContent = `Error loading model: ${String(err)}`;
    }
  }
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
