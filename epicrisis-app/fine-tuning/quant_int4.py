from pathlib import Path
from onnxruntime.quantization import matmul_4bits_quantizer, quant_utils

INPUT = Path("onnx/model.onnx")
OUTPUT = Path("onnx/model_int4.onnx")

model = quant_utils.load_model_with_shape_infer(INPUT)

config = matmul_4bits_quantizer.DefaultWeightOnlyQuantConfig(
    block_size=128,
    is_symmetric=True,              # True = INT4
    accuracy_level=4,
    quant_format=quant_utils.QuantFormat.QOperator,
    op_types_to_quantize=("MatMul","Gather"),
    quant_axes=(("MatMul",0),("Gather",1)),
)

quant = matmul_4bits_quantizer.MatMul4BitsQuantizer(model, algo_config=config)
quant.process()

quant.model.save_model_to_file(OUTPUT, use_external_data_format=True)
print("INT4 listo:", OUTPUT)
