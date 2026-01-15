import * as ort from "/vendor/onnxruntime-web.mjs";
import { Tokenizer } from "/vendor/tokenizers.mjs";
import { loadEpicrisisModel } from "/modelLoader.js";

const MODEL_LAYERS = 24;
const KV_HEADS = 2;
const HEAD_SIZE = 64;
const DEFAULT_EOS_TOKEN_IDS = new Set([151645, 151643]);

let cachedRuntime = null;

async function loadTokenizer(base) {
  const [tokenizerJson, tokenizerConfig] = await Promise.all([
    fetch(`${base}/tokenizer.json`).then((res) => res.json()),
    fetch(`${base}/tokenizer_config.json`).then((res) => res.json()),
  ]);

  return new Tokenizer(tokenizerJson, tokenizerConfig);
}

function buildEmptyPastFeeds() {
  const useFloat16 =
    typeof Float16Array !== "undefined" ? Float16Array : Uint16Array;
  const feeds = {};
  for (let i = 0; i < MODEL_LAYERS; i += 1) {
    feeds[`past_key_values.${i}.key`] = new ort.Tensor(
      "float16",
      new useFloat16(0),
      [1, KV_HEADS, 0, HEAD_SIZE]
    );
    feeds[`past_key_values.${i}.value`] = new ort.Tensor(
      "float16",
      new useFloat16(0),
      [1, KV_HEADS, 0, HEAD_SIZE]
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

async function getRuntime() {
  if (cachedRuntime) {
    return cachedRuntime;
  }

  const runtime = await loadEpicrisisModel();
  const tokenizer = await loadTokenizer(runtime.base);
  cachedRuntime = { ...runtime, tokenizer };
  return cachedRuntime;
}

export async function generateEpicrisis(prompt, options = {}) {
  const {
    maxNewTokens = 64,
    eosTokenIds = DEFAULT_EOS_TOKEN_IDS,
    temperature = 0.7,
    topP = 0.9,
  } = options;
  const { session, tokenizer } = await getRuntime();
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
      ...buildEmptyPastFeeds(),
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
    if (stopTokenIds.has(nextTokenId)) {
      break;
    }
  }

  const decoded = tokenizer.decode(tokenIds);
  return decoded.split("<|im_end|>")[0];
}
