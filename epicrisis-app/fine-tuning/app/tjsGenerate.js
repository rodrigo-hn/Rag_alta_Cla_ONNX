const tjsCache = new Map();
let tjsLoader = null;

function loadTransformers() {
  if (tjsLoader) {
    return tjsLoader;
  }

  tjsLoader = import(
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js"
  );
  return tjsLoader;
}

function stripPromptEcho(prompt, text) {
  if (text.startsWith(prompt)) {
    return text.slice(prompt.length).trimStart();
  }
  return text;
}

function stripSpecialTokens(text) {
  return text
    .replace(/<\|im_end\|>/g, "")
    .replace(/<\|im_start\|>/g, "")
    .replace(/<\|endoftext\|>/g, "")
    .replace(/<\/?s>/g, "");
}

function normalizeOutput(text) {
  return stripSpecialTokens(text).replace(/\s+/g, " ").trim();
}

// Configuracion por tipo de cuantizacion
// Ambos modelos usan decoder_with_past_model.onnx como nombre base
// (los archivos cuantizados fueron renombrados al nombre base)
const QUANT_CONFIG = {
  q4f16: {
    model_file_name: "decoder_with_past_model",
  },
  q8: {
    model_file_name: "decoder_with_past_model",
  },
};

async function getGenerator(modelId, quantType = "q4f16") {
  const cacheKey = `${modelId}:${quantType}`;
  if (tjsCache.has(cacheKey)) {
    return tjsCache.get(cacheKey);
  }

  const { pipeline, env } = await loadTransformers();

  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.localModelPath = "/models";
  const wasmBase = new URL("/ort/", window.location.href).toString();
  env.backends.onnx.wasm.wasmPaths = {
    "ort-wasm-simd-threaded.jsep.mjs": `${wasmBase}ort-wasm-simd-threaded.jsep.mjs`,
    "ort-wasm-simd-threaded.jsep.wasm": `${wasmBase}ort-wasm-simd-threaded.jsep.wasm`,
    "ort-wasm-simd-threaded.asyncify.mjs": `${wasmBase}ort-wasm-simd-threaded.asyncify.mjs`,
    "ort-wasm-simd-threaded.asyncify.wasm": `${wasmBase}ort-wasm-simd-threaded.asyncify.wasm`,
    "ort-wasm-simd-threaded.wasm": `${wasmBase}ort-wasm-simd-threaded.wasm`,
    "ort-wasm-simd.wasm": `${wasmBase}ort-wasm-simd.wasm`,
    "ort-wasm-threaded.wasm": `${wasmBase}ort-wasm-threaded.wasm`,
    "ort-wasm.wasm": `${wasmBase}ort-wasm.wasm`,
  };
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.numThreads = 1;

  const config = QUANT_CONFIG[quantType] || QUANT_CONFIG.q4f16;
  const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
  const devices = hasWebGPU ? ["webgpu", "wasm"] : ["wasm"];
  let lastError = null;

  console.log(`[tjs] Cargando modelo ${modelId} con file=${config.model_file_name}`);

  for (const device of devices) {
    try {
      const generator = await pipeline("text-generation", modelId, {
        quantized: false,
        model_file_name: config.model_file_name,
        device,
      });
      const info = { generator, device, quantType };
      tjsCache.set(cacheKey, info);
      console.log(`[tjs] Modelo cargado exitosamente con ${device}`);
      return info;
    } catch (err) {
      lastError = err;
      if (device === "webgpu") {
        console.warn("[tjs] WebGPU fallo, usando WASM.", err);
      }
    }
  }

  throw lastError || new Error("No se pudo inicializar Transformers.js.");
}

export async function generateEpicrisisTjs(prompt, options = {}) {
  const modelId = options.modelId || "epicrisis-q4f16-finetuned-tjs";
  const quantType = options.quantType || "q4f16";
  const { generator } = await getGenerator(modelId, quantType);
  const maxNewTokens = options.maxNewTokens ?? 200;

  let out;
  try {
    out = await generator(prompt, {
      max_new_tokens: maxNewTokens,
      temperature: 0.2,
      top_p: 0.9,
      repetition_penalty: 1.05,
    });
  } catch (err) {
    if (typeof err === "number") {
      const hex = `0x${err.toString(16)}`;
      throw new Error(`Transformers.js error ${err} (${hex})`);
    }
    throw err;
  }

  const text = Array.isArray(out) ? out[0]?.generated_text ?? "" : out;
  return normalizeOutput(stripPromptEcho(prompt, text));
}

export async function getTjsBackend(modelId, quantType = "q4f16") {
  const { device } = await getGenerator(modelId, quantType);
  return `Transformers.js ${device} (${quantType})`;
}
