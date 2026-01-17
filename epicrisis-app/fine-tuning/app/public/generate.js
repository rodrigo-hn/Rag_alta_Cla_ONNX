import * as ort from "/vendor/onnxruntime-web.mjs";
import { Tokenizer } from "/vendor/tokenizers.mjs";
import { loadEpicrisisModel } from "/modelLoader.js";

const DEFAULT_MODEL_LAYERS = 24;
const DEFAULT_KV_HEADS = 2;
const DEFAULT_HEAD_SIZE = 64;
const DEFAULT_EOS_TOKEN_IDS = new Set([151645, 151643]);

const runtimeCache = new Map();

async function loadTokenizer(base) {
  const [tokenizerJson, tokenizerConfig] = await Promise.all([
    fetch(`${base}/tokenizer.json`).then((res) => res.json()),
    fetch(`${base}/tokenizer_config.json`).then((res) => res.json()),
  ]);

  return new Tokenizer(tokenizerJson, tokenizerConfig);
}

function buildEmptyPastFeeds(layerCount, pastType, kvHeads, headSize) {
  const useFloat16 =
    typeof Float16Array !== "undefined" ? Float16Array : Uint16Array;
  const type = pastType === "float" ? "float32" : "float16";
  const arrayCtor = pastType === "float" ? Float32Array : useFloat16;
  const feeds = {};
  for (let i = 0; i < layerCount; i += 1) {
    feeds[`past_key_values.${i}.key`] = new ort.Tensor(
      type,
      new arrayCtor(0),
      [1, kvHeads, 0, headSize]
    );
    feeds[`past_key_values.${i}.value`] = new ort.Tensor(
      type,
      new arrayCtor(0),
      [1, kvHeads, 0, headSize]
    );
  }
  return feeds;
}

function argMax(values, offset, size) {
  let maxValue = -Infinity;
  let maxIndex = 0;
  for (let i = 0; i < size; i += 1) {
    const value = values[offset + i];
    if (value > maxValue) {
      maxValue = value;
      maxIndex = i;
    }
  }
  return maxIndex;
}

function sampleTopP(values, offset, size, temperature, topP, recentTokens = [], repetitionPenalty = 1.1) {
  const logits = new Array(size);
  let maxLogit = -Infinity;
  for (let i = 0; i < size; i += 1) {
    let value = values[offset + i];
    // Aplicar repetition penalty a tokens recientes
    if (recentTokens.includes(i) && repetitionPenalty !== 1.0) {
      value = value < 0 ? value * repetitionPenalty : value / repetitionPenalty;
    }
    logits[i] = value;
    if (value > maxLogit) {
      maxLogit = value;
    }
  }

  const adjusted = new Array(size);
  let sum = 0;
  const invTemp = 1 / temperature;
  for (let i = 0; i < size; i += 1) {
    const expValue = Math.exp((logits[i] - maxLogit) * invTemp);
    adjusted[i] = expValue;
    sum += expValue;
  }

  const probs = adjusted.map((value, index) => ({
    index,
    prob: value / sum,
  }));
  probs.sort((a, b) => b.prob - a.prob);

  let cumulative = 0;
  const filtered = [];
  for (const item of probs) {
    filtered.push(item);
    cumulative += item.prob;
    if (cumulative >= topP) {
      break;
    }
  }

  let sample = Math.random();
  for (const item of filtered) {
    sample -= item.prob;
    if (sample <= 0) {
      return item.index;
    }
  }

  return filtered[filtered.length - 1].index;
}

function normalizeSingleParagraph(text) {
  return text
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripSpecialTokens(text) {
  return text.replace(/<\|endoftext\|>/g, "").trim();
}

function stripHtml(text) {
  return text.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
}

function stripPromptEcho(output, prompt) {
  const trimmedOutput = output.trim();
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    return trimmedOutput;
  }

  if (trimmedOutput.startsWith(trimmedPrompt)) {
    return trimmedOutput.slice(trimmedPrompt.length).trim();
  }

  return trimmedOutput;
}

/**
 * Aplica el template ChatML para modelos Qwen2.5-Instruct.
 * @param {string} systemPrompt - Instrucción del sistema
 * @param {string} userContent - Contenido del usuario (JSON)
 * @returns {string} Prompt formateado con ChatML
 */
function applyChatTemplate(systemPrompt, userContent) {
  return (
    `<|im_start|>system\n${systemPrompt}<|im_end|>\n` +
    `<|im_start|>user\n${userContent}<|im_end|>\n` +
    `<|im_start|>assistant\n`
  );
}

/**
 * Extrae la respuesta del assistant del output ChatML.
 * @param {string} output - Output completo del modelo
 * @returns {string} Solo la respuesta del assistant
 */
function extractAssistantResponse(output) {
  // Buscar el contenido después de <|im_start|>assistant
  const assistantMarker = "<|im_start|>assistant\n";
  const assistantIdx = output.lastIndexOf(assistantMarker);
  if (assistantIdx !== -1) {
    output = output.slice(assistantIdx + assistantMarker.length);
  }

  // Remover el token de fin si existe
  const endMarker = "<|im_end|>";
  const endIdx = output.indexOf(endMarker);
  if (endIdx !== -1) {
    output = output.slice(0, endIdx);
  }

  return output.trim();
}

async function getRuntime(modelBase) {
  if (runtimeCache.has(modelBase)) {
    return runtimeCache.get(modelBase);
  }

  const runtime = await loadEpicrisisModel(modelBase);
  const tokenizer = await loadTokenizer(runtime.base);
  let modelLayers = DEFAULT_MODEL_LAYERS;
  let kvHeads = DEFAULT_KV_HEADS;
  let headSize = DEFAULT_HEAD_SIZE;
  let pastType = "float16";
  let requiresPositionIds = false;
  try {
    const genaiConfig = await fetch(`${runtime.base}/genai_config.json`).then(
      (res) => res.json()
    );
    modelLayers = genaiConfig?.model?.decoder?.num_hidden_layers ?? modelLayers;
    kvHeads = genaiConfig?.model?.decoder?.num_key_value_heads ?? kvHeads;
    headSize = genaiConfig?.model?.decoder?.head_size ?? headSize;
    // Check if model requires position_ids
    requiresPositionIds = !!genaiConfig?.model?.decoder?.inputs?.position_ids;
  } catch (error) {
    modelLayers = DEFAULT_MODEL_LAYERS;
  }
  if (runtime.base.includes("onnx-cpu-int4-qmix")) {
    pastType = "float";
  }
  const cachedRuntime = {
    ...runtime,
    tokenizer,
    modelLayers,
    kvHeads,
    headSize,
    pastType,
    requiresPositionIds,
  };
  runtimeCache.set(modelBase ?? runtime.base, cachedRuntime);
  return cachedRuntime;
}

export async function generateEpicrisis(prompt, options = {}) {
  const {
    maxNewTokens = 200,
    minNewTokens = 32,
    eosTokenIds = DEFAULT_EOS_TOKEN_IDS,
    temperature = 0.2,  // Reducido para menos alucinaciones
    topP = 0.8,         // Reducido para respuestas más determinísticas
    repetitionPenalty = 1.15,  // Penaliza tokens repetidos
    modelBase,
    useChatML = false,  // Usar formato ChatML para modelos fine-tuneados
    systemPrompt = "",  // System prompt para ChatML
  } = options;
  const { session, tokenizer, modelLayers, kvHeads, headSize, pastType, requiresPositionIds } =
    await getRuntime(modelBase);
  const imEndTokenId = tokenizer.token_to_id("<|im_end|>");
  const stopTokenIds = new Set(eosTokenIds);
  if (typeof imEndTokenId === "number") {
    stopTokenIds.add(imEndTokenId);
  }

  // Aplicar ChatML si está habilitado
  let finalPrompt = prompt;
  if (useChatML && systemPrompt) {
    // Extraer solo el JSON del prompt (después de "Epicrisis:")
    let userContent = prompt;
    const epicrisisIdx = prompt.indexOf("Epicrisis:");
    if (epicrisisIdx !== -1) {
      userContent = prompt.slice(epicrisisIdx + "Epicrisis:".length).trim();
    }
    // Formatear el JSON con indentación para que coincida con el entrenamiento
    try {
      const jsonObj = JSON.parse(userContent);
      userContent = JSON.stringify(jsonObj, null, 2);
    } catch (e) {
      // Si no es JSON válido, usar como está
      console.warn("ChatML: userContent is not valid JSON, using as-is");
    }
    finalPrompt = applyChatTemplate(systemPrompt, userContent);
    console.log("ChatML finalPrompt:", finalPrompt.slice(0, 500));
  }

  const encoded = tokenizer.encode(finalPrompt);
  const tokenIds = [...encoded.ids];
  const promptLength = tokenIds.length;

  for (let step = 0; step < maxNewTokens; step += 1) {
    const attentionMask = new Array(tokenIds.length).fill(1);
    const feeds = {
      input_ids: new ort.Tensor(
        "int64",
        BigInt64Array.from(tokenIds, BigInt),
        [1, tokenIds.length]
      ),
      attention_mask: new ort.Tensor(
        "int64",
        BigInt64Array.from(attentionMask, BigInt),
        [1, attentionMask.length]
      ),
      ...buildEmptyPastFeeds(modelLayers, pastType, kvHeads, headSize),
    };

    // Add position_ids if required by the model
    if (requiresPositionIds) {
      const positionIds = new Array(tokenIds.length).fill(0).map((_, i) => i);
      feeds.position_ids = new ort.Tensor(
        "int64",
        BigInt64Array.from(positionIds, BigInt),
        [1, positionIds.length]
      );
    }

    const results = await session.run(feeds);
    const logits = results.logits;
    const vocabSize = logits.dims[2];
    const lastOffset = (tokenIds.length - 1) * vocabSize;

    // Tokens generados hasta ahora (sin el prompt)
    const generatedTokens = tokenIds.slice(promptLength);

    let nextTokenId = 0;
    if (temperature === 0 || topP === 0 || topP >= 1) {
      nextTokenId = argMax(logits.data, lastOffset, vocabSize);
    } else {
      nextTokenId = sampleTopP(
        logits.data,
        lastOffset,
        vocabSize,
        temperature,
        topP,
        generatedTokens,
        repetitionPenalty
      );
    }

    tokenIds.push(nextTokenId);
    if (stopTokenIds.has(nextTokenId) && step + 1 >= minNewTokens) {
      break;
    }
  }

  const decoded = tokenizer.decode(tokenIds);

  // Procesar output según el formato usado
  let response;
  if (useChatML) {
    console.log("ChatML decoded (first 800 chars):", decoded.slice(-800));
    response = extractAssistantResponse(decoded);
    console.log("ChatML extracted response:", response);
  } else {
    const cleaned = decoded.split("<|im_end|>")[0];
    response = stripPromptEcho(cleaned, finalPrompt);
  }

  const withoutTokens = stripSpecialTokens(response);
  const withoutHtml = stripHtml(withoutTokens);
  return normalizeSingleParagraph(withoutHtml);
}

export async function getEpicrisisBackend(modelBase) {
  const runtime = await getRuntime(modelBase);
  return runtime.useWebGPU ? "WebGPU" : "WASM";
}
