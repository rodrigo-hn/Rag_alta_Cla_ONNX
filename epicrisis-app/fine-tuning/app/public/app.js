import { generateEpicrisis } from "/generate.js";

const promptInput = document.querySelector("#prompt");
const output = document.querySelector("#output");
const status = document.querySelector("#status");
const button = document.querySelector("#generate");

const starter =
  "Paciente masculino de 62 anos con dolor toracico, hipertension y diabetes. " +
  "Redacta una epicrisis breve con diagnostico, tratamiento y recomendaciones.";

promptInput.value = starter;

async function handleGenerate() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    output.textContent = "Ingresa un prompt para generar la epicrisis.";
    return;
  }

  const formattedPrompt =
    "Responde en un solo parrafo, sin saltos de linea ni bullets. " +
    "No uses JSON en la respuesta. " +
    "Incluye un diagnostico de ingreso claro.\n\n" +
    prompt;

  button.disabled = true;
  status.textContent = "Generando...";
  output.textContent = "";

  try {
    const text = await generateEpicrisis(formattedPrompt, { maxNewTokens: 96 });
    output.textContent = text;
    status.textContent = "Listo";
  } catch (error) {
    output.textContent = `Error: ${error.message || error}`;
    status.textContent = "Fallo la generacion";
  } finally {
    button.disabled = false;
  }
}

button.addEventListener("click", handleGenerate);
