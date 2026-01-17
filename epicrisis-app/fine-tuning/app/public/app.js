import { generateEpicrisis, getEpicrisisBackend } from "/generate.js";
import { generateEpicrisisTjs, getTjsBackend } from "/tjsGenerate.js";

const promptInput = document.querySelector("#prompt");
const output = document.querySelector("#output");
const status = document.querySelector("#status");
const button = document.querySelector("#generate");
const modelSelect = document.querySelector("#model");

const modelOptions = [
  { label: "⭐ Unsloth FP16 GenAI (948MB) - Recomendado", value: "/models/onnx-webgpu-fp16-unsloth-genai", useChatML: true },
  { label: "ChatML v3 ORT-GenAI (959MB)", value: "/models/onnx-webgpu-fp16-chatml-v3", useChatML: true },
];

const SYSTEM_INSTRUCTION =
  "Genera una epicrisis narrativa en UN SOLO PARRAFO. " +
  "USA SOLO la informacion del JSON, NO inventes datos. " +
  "IMPORTANTE: Incluye TODOS los codigos entre parentesis: " +
  "diagnostico de ingreso con codigo CIE-10 (ej: I20.0), " +
  "procedimientos con codigo K (ej: K492, K493), " +
  "medicacion con dosis y codigo ATC (ej: B01AC06). " +
  "Estructura: dx ingreso -> procedimientos -> evolucion -> dx alta -> medicacion alta. " +
  "Abreviaturas: DA=descendente anterior, CD=coronaria derecha, CX=circunfleja, " +
  "SDST=supradesnivel ST, IAM=infarto agudo miocardio.";

const starter =
  SYSTEM_INSTRUCTION +
  "\n\nEpicrisis:\n" +
  JSON.stringify(
    {
      dx: ["Angina inestable (I20.0)"],
      proc: ["Coronariografia (K492)", "Angioplastia (K493)"],
      tto: [
        "Aspirina 300mg carga (B01AC06)",
        "Enoxaparina 60mg SC c/12h (B01AB05)",
      ],
      evo: "SDST V1-V4. Oclusion DA. Angioplastia exitosa con stent.",
      dx_alta: ["IAM pared anterior (I21.0)"],
      med: [
        "Aspirina 100mg VO c/24h (B01AC06)",
        "Clopidogrel 75mg VO c/24h 12m (B01AC04)",
      ],
    },
    null,
    2
  );

promptInput.value = starter;

modelOptions.forEach((option) => {
  const item = document.createElement("option");
  item.value = option.value;
  item.textContent = option.label;
  modelSelect.appendChild(item);
});
modelSelect.value = modelOptions[0].value;

function parseTjsModel(value) {
  // formato: tjs:modelId:quantType
  const parts = value.replace("tjs:", "").split(":");
  return {
    modelId: parts[0],
    quantType: parts[1] || "q4f16",
  };
}

function refreshBackendStatus() {
  const modelBase = modelSelect.value;
  if (modelBase.startsWith("tjs:")) {
    const { modelId, quantType } = parseTjsModel(modelBase);
    status.textContent = `Listo (Transformers.js ${quantType}) ${modelId}`;
    return;
  }

  getEpicrisisBackend(modelBase)
    .then((backend) => {
      status.textContent = `Listo (${backend}) ${modelBase}`;
    })
    .catch(() => {
      status.textContent = "Listo";
    });
}

refreshBackendStatus();
modelSelect.addEventListener("change", refreshBackendStatus);

async function handleGenerate() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    output.textContent = "Ingresa un prompt para generar la epicrisis.";
    return;
  }

  const formattedPrompt = prompt.includes("Epicrisis:")
    ? prompt
    : SYSTEM_INSTRUCTION +
      "\n\nEpicrisis:\n" +
      prompt;
  const modelBase = modelSelect.value;
  const isTjs = modelBase.startsWith("tjs:");

  // Buscar configuración del modelo seleccionado
  const modelConfig = modelOptions.find((opt) => opt.value === modelBase) || {};
  const useChatML = modelConfig.useChatML || false;

  button.disabled = true;
  status.textContent = useChatML ? "Generando (ChatML)..." : "Generando...";
  output.textContent = "";

  try {
    let text;
    let backend;
    if (isTjs) {
      const { modelId, quantType } = parseTjsModel(modelBase);
      text = await generateEpicrisisTjs(formattedPrompt, {
        maxNewTokens: 200,
        modelId,
        quantType,
      });
      backend = await getTjsBackend(modelId, quantType);
    } else {
      text = await generateEpicrisis(formattedPrompt, {
        maxNewTokens: 300,
        minNewTokens: useChatML ? 120 : 32,  // ChatML fine-tuned necesita más tokens
        modelBase,
        useChatML,
        systemPrompt: SYSTEM_INSTRUCTION,
      });
      backend = await getEpicrisisBackend(modelBase);
    }
    output.textContent = text;
    const chatMLIndicator = useChatML ? " [ChatML]" : "";
    status.textContent = `Listo (${backend})${chatMLIndicator} ${modelBase}`;
  } catch (error) {
    output.textContent = `Error: ${error.message || error}`;
    status.textContent = "Fallo la generacion";
  } finally {
    button.disabled = false;
  }
}

button.addEventListener("click", handleGenerate);
