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

function sampleTopP(values, offset, size, temperature, topP) {
  const logits = new Array(size);
  let maxLogit = -Infinity;
  for (let i = 0; i < size; i += 1) {
    const value = values[offset + i];
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
  try {
    const genaiConfig = await fetch(`${runtime.base}/genai_config.json`).then(
      (res) => res.json()
    );
    modelLayers = genaiConfig?.model?.decoder?.num_hidden_layers ?? modelLayers;
    kvHeads = genaiConfig?.model?.decoder?.num_key_value_heads ?? kvHeads;
    headSize = genaiConfig?.model?.decoder?.head_size ?? headSize;
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
  };
  runtimeCache.set(modelBase ?? runtime.base, cachedRuntime);
  return cachedRuntime;
}

export async function generateEpicrisis(prompt, options = {}) {
  const {
    maxNewTokens = 200,
    minNewTokens = 32,
    eosTokenIds = DEFAULT_EOS_TOKEN_IDS,
    temperature = 0.7,
    topP = 0.9,
    modelBase,
  } = options;
  const { session, tokenizer, modelLayers, kvHeads, headSize, pastType } =
    await getRuntime(modelBase);
  const imEndTokenId = tokenizer.token_to_id("<|im_end|>");
  const stopTokenIds = new Set(eosTokenIds);
  if (typeof imEndTokenId === "number") {
    stopTokenIds.add(imEndTokenId);
  }

  const encoded = tokenizer.encode(prompt);
  const tokenIds = [...encoded.ids];

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

    const results = await session.run(feeds);
    const logits = results.logits;
    const vocabSize = logits.dims[2];
    const lastOffset = (tokenIds.length - 1) * vocabSize;
    let nextTokenId = 0;
    if (temperature === 0 || topP === 0 || topP >= 1) {
      nextTokenId = argMax(logits.data, lastOffset, vocabSize);
    } else {
      nextTokenId = sampleTopP(
        logits.data,
        lastOffset,
        vocabSize,
        temperature,
        topP
      );
    }

    tokenIds.push(nextTokenId);
    if (stopTokenIds.has(nextTokenId) && step + 1 >= minNewTokens) {
      break;
    }
  }

  const decoded = tokenizer.decode(tokenIds);
  const cleaned = decoded.split("<|im_end|>")[0];
  const withoutEcho = stripPromptEcho(cleaned, prompt);
  const withoutTokens = stripSpecialTokens(withoutEcho);
  const withoutHtml = stripHtml(withoutTokens);
  return normalizeSingleParagraph(withoutHtml);
}

export async function getEpicrisisBackend(modelBase) {
  const runtime = await getRuntime(modelBase);
  return runtime.useWebGPU ? "WebGPU" : "WASM";
}
