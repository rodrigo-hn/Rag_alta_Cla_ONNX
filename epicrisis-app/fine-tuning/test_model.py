"""
Test del modelo fine-tuned para epicrisis
Usa transformers + peft directamente (sin unsloth)
"""

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import json

print("=" * 60)
print("TEST DEL MODELO FINE-TUNED PARA EPICRISIS")
print("=" * 60)

# Configuración
MODEL_PATH = "./epicrisis-model-finetuned"
BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"

# Detectar dispositivo
if torch.cuda.is_available():
    device = "cuda"
    print(f"\n🖥️  Usando GPU: {torch.cuda.get_device_name(0)}")
elif torch.backends.mps.is_available():
    device = "mps"
    print("\n🖥️  Usando Apple Silicon (MPS)")
else:
    device = "cpu"
    print("\n🖥️  Usando CPU")

# Cargar modelo
print("\n[1] Cargando modelo fine-tuned...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)

# Cargar modelo base
print("   Cargando modelo base...")
base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    torch_dtype=torch.float16 if device != "cpu" else torch.float32,
    device_map="auto" if device == "cuda" else None,
    trust_remote_code=True
)

# Aplicar adaptadores LoRA
print("   Aplicando adaptadores LoRA...")
model = PeftModel.from_pretrained(base_model, MODEL_PATH)
model.eval()

if device == "mps":
    model = model.to(device)

print("✓ Modelo cargado!")

# Función de generación
def generate_epicrisis(input_data: dict, max_tokens: int = 300) -> str:
    prompt = f"Epicrisis:\n{json.dumps(input_data, ensure_ascii=False)}\n"

    messages = [
        {"role": "system", "content": "Eres un asistente médico experto en redacción de epicrisis clínicas en español. Genera texto clínico preciso basado en los datos proporcionados."},
        {"role": "user", "content": prompt}
    ]

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = tokenizer(text, return_tensors="pt")
    if device != "cpu":
        inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            temperature=0.3,
            do_sample=True,
            top_p=0.9,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id
        )

    # Decodificar solo los tokens nuevos
    response = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
    return response.strip()

# ============================================
# CASOS DE PRUEBA
# ============================================

test_cases = [
    {
        "name": "Neumonía simple",
        "input": {
            "dx": ["Neumonia (J18.9)"],
            "proc": [],
            "tto": ["Ceftriaxona EV 7d (J01DD04)"],
            "evo": "Favorable, afebril 3er dia",
            "dx_alta": ["Neumonia resuelta (J18.9)"],
            "med": ["Amoxicilina 500mg VO c/8h 5d (J01CA04)"]
        },
        "expected_codes": ["J18.9", "J01DD04", "J01CA04"]
    },
    {
        "name": "Colecistitis con cirugía",
        "input": {
            "dx": ["Colecistitis aguda (K80.0)"],
            "proc": ["Colecistectomia laparoscopica (51.23)"],
            "tto": ["Cefazolina 2g EV profilaxis (J01DB04)", "Paracetamol 1g EV c/8h (N02BE01)"],
            "evo": "Post op sin complicaciones",
            "dx_alta": ["Colecistitis operada (K80.0)"],
            "med": ["Paracetamol 1g VO c/8h SOS (N02BE01)"]
        },
        "expected_codes": ["K80.0", "51.23"]
    },
    {
        "name": "IC descompensada compleja",
        "input": {
            "dx": ["IC descompensada (I50.9)", "HTA (I10)", "FA (I48.9)"],
            "proc": ["Ecocardiograma (88.72)"],
            "tto": ["Furosemida 40mg EV c/8h (C03CA01)", "Digoxina 0.25mg VO c/24h (C01AA05)"],
            "evo": "Balance -3L, FEVI 35%",
            "dx_alta": ["IC compensada (I50.9)", "HTA (I10)", "FA (I48.9)"],
            "med": ["Furosemida 40mg VO c/12h (C03CA01)", "Bisoprolol 2.5mg VO c/24h (C07AB07)", "Enalapril 10mg VO c/12h (C09AA02)"]
        },
        "expected_codes": ["I50.9", "I10", "C03CA01"]
    },
    {
        "name": "Fractura cadera",
        "input": {
            "dx": ["Fractura cuello femur (S72.0)"],
            "proc": ["Artroplastia parcial cadera (81.52)"],
            "tto": ["Enoxaparina 40mg SC c/24h (B01AB01)", "Tramadol 50mg EV c/8h (N02AX02)"],
            "evo": "Inicia KNT 2do dia, marcha con andador",
            "dx_alta": ["Fractura operada (S72.0)"],
            "med": ["Enoxaparina 40mg SC c/24h 21d (B01AB01)", "Paracetamol 1g VO c/8h SOS (N02BE01)"]
        },
        "expected_codes": ["S72.0", "81.52", "B01AB01"]
    },
    {
        "name": "IAM con stent",
        "input": {
            "dx": ["IAMCEST anterior (I21.0)", "HTA (I10)"],
            "proc": ["Coronariografia (88.56)", "Angioplastia con stent DA (36.06)"],
            "tto": ["Heparina EV 48h (B01AB01)", "Clopidogrel 75mg VO c/24h (B01AC04)", "Aspirina 100mg VO c/24h (B01AC06)"],
            "evo": "Killip I, FEVI 45%, sin arritmias",
            "dx_alta": ["IAM anterior con stent DA (I21.0)", "HTA (I10)"],
            "med": ["Clopidogrel 75mg VO c/24h 12m (B01AC04)", "Aspirina 100mg VO c/24h (B01AC06)", "Atorvastatina 80mg VO c/noche (C10AA05)", "Bisoprolol 2.5mg VO c/24h (C07AB07)"]
        },
        "expected_codes": ["I21.0", "36.06", "B01AC04"]
    }
]

# ============================================
# EJECUTAR TESTS
# ============================================

print("\n[2] Ejecutando tests...\n")

results = []
for i, test in enumerate(test_cases, 1):
    print(f"{'='*60}")
    print(f"TEST {i}: {test['name']}")
    print(f"{'='*60}")

    print(f"\n📥 INPUT:")
    print(f"   Dx: {test['input']['dx']}")
    print(f"   Proc: {test['input']['proc']}")

    output = generate_epicrisis(test['input'])

    print(f"\n📤 OUTPUT:")
    print(f"   {output[:250]}{'...' if len(output) > 250 else ''}")

    # Validaciones
    checks = {
        "starts_with_ingresa": output.lower().startswith("ingresa"),
        "has_expected_codes": sum(1 for code in test['expected_codes'] if code in output) >= len(test['expected_codes']) // 2,
        "no_markdown": "**" not in output and "[[" not in output,
        "reasonable_length": 50 < len(output) < 800
    }

    print(f"\n✓ Validaciones:")
    for check, passed in checks.items():
        status = "✅" if passed else "❌"
        print(f"   {status} {check}")

    results.append({
        "test": test['name'],
        "output": output,
        "checks": checks,
        "all_passed": all(checks.values())
    })
    print()

# ============================================
# RESUMEN
# ============================================

print("=" * 60)
print("RESUMEN DE TESTS")
print("=" * 60)

passed = sum(1 for r in results if r['all_passed'])
total = len(results)

print(f"\n✅ Tests exitosos: {passed}/{total}")

if passed < total:
    print("\n❌ Tests con problemas:")
    for r in results:
        if not r['all_passed']:
            failed_checks = [k for k, v in r['checks'].items() if not v]
            print(f"   - {r['test']}: {failed_checks}")

# Mostrar ejemplo completo del mejor resultado
print("\n" + "=" * 60)
print("EJEMPLO DE OUTPUT COMPLETO (Neumonía):")
print("=" * 60)
print(results[0]['output'])

print("\n" + "=" * 60)
print("TEST COMPLETADO")
print("=" * 60)
