import * as ort from "/vendor/onnxruntime-web.mjs";

async function hasWebGPU() {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) {
    return false;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (error) {
    return false;
  }
}

export async function loadEpicrisisModel() {
  const useWebGPU = await hasWebGPU();
  const base = useWebGPU
    ? "/models/onnx-webgpu-int4"
    : "/models/onnx-cpu-int4";

  ort.env.wasm.wasmPaths = "/ort/";

  const session = await ort.InferenceSession.create(`${base}/model.onnx`, {
    executionProviders: useWebGPU ? ["webgpu"] : ["wasm"],
    externalData: [
      {
        path: "model.onnx.data",
        data: `${base}/model.onnx.data`,
      },
    ],
  });

  return { session, base, useWebGPU };
}
