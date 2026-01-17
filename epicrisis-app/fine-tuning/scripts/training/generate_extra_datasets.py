#!/usr/bin/env python3
"""
Genera 750 ejemplos adicionales para fine-tuning de epicrisis.
Divididos en 3 archivos de 250 ejemplos cada uno.
"""

import json
import random
from pathlib import Path

# Diagnósticos de ingreso con códigos CIE-10
DIAGNOSTICOS_INGRESO = [
    ("IAMCEST anterior", "I21.0"),
    ("IAMCEST inferior", "I21.1"),
    ("IAMCEST lateral", "I21.2"),
    ("IAMCEST posterior", "I21.2"),
    ("IAMCEST anteroseptal", "I21.0"),
    ("IAMCEST inferolateral", "I21.1"),
    ("IAMCEST anterolateral", "I21.0"),
    ("IAMSEST", "I21.4"),
    ("IAMSEST alto riesgo", "I21.4"),
    ("Angina inestable", "I20.0"),
    ("Angina inestable alto riesgo", "I20.0"),
    ("Angina estable", "I20.8"),
    ("Enfermedad coronaria de 2 vasos", "I25.1"),
    ("Enfermedad coronaria de 3 vasos", "I25.1"),
    ("Enfermedad de TCI", "I25.1"),
    ("Reestenosis intra-stent", "I25.5"),
    ("Trombosis de stent", "I21.0"),
    ("Insuficiencia cardiaca aguda", "I50.9"),
    ("Edema pulmonar agudo", "J81"),
    ("Shock cardiogenico", "R57.0"),
    ("Fibrilacion auricular", "I48.9"),
    ("Flutter auricular", "I48.0"),
    ("Taquicardia ventricular", "I47.2"),
    ("Bloqueo AV completo", "I44.2"),
    ("Sincope", "R55"),
    ("Pericarditis aguda", "I30.9"),
    ("Miocarditis", "I40.9"),
    ("Endocarditis infecciosa", "I33.0"),
    ("Estenosis aortica severa", "I35.0"),
    ("Insuficiencia mitral severa", "I34.0"),
    ("TEP agudo", "I26.9"),
    ("Diseccion aortica", "I71.0"),
    ("Hipertension arterial severa", "I10"),
    ("Crisis hipertensiva", "I10"),
    ("Diabetes mellitus descompensada", "E11.9"),
    ("Neumonia adquirida comunidad", "J18.9"),
    ("EPOC exacerbado", "J44.1"),
    ("Asma bronquial exacerbada", "J45.9"),
    ("Insuficiencia renal aguda", "N17.9"),
    ("Hemorragia digestiva alta", "K92.2"),
    ("Colecistitis aguda", "K81.0"),
    ("Apendicitis aguda", "K35.8"),
    ("Pancreatitis aguda", "K85.9"),
    ("Obstruccion intestinal", "K56.6"),
    ("Hernia inguinal", "K40.9"),
    ("Fractura de cadera", "S72.0"),
    ("ACV isquemico", "I63.9"),
    ("ACV hemorragico", "I61.9"),
    ("Celulitis", "L03.9"),
    ("Sepsis", "A41.9"),
]

# Procedimientos con códigos
PROCEDIMIENTOS_CARDIO = [
    ("Coronariografia", "K492"),
    ("Angioplastia", "K493"),
    ("Angioplastia DA", "K493"),
    ("Angioplastia CD", "K493"),
    ("Angioplastia CX", "K493"),
    ("Angioplastia TCI", "K493"),
    ("Ecocardiograma", "88.72"),
    ("Holter ECG", "89.50"),
    ("Test de esfuerzo", "89.41"),
    ("Cardioversion electrica", "99.62"),
    ("Ablacion por radiofrecuencia", "37.34"),
    ("Implante de marcapasos", "37.80"),
    ("Implante de DAI", "37.94"),
    ("Cateterismo derecho", "89.64"),
    ("Pericardiocentesis", "37.0"),
    ("Valvuloplastia mitral", "35.04"),
    ("TAVI", "35.05"),
]

PROCEDIMIENTOS_GENERALES = [
    ("TAC de torax", "87.41"),
    ("TAC de abdomen", "88.01"),
    ("Ecografia abdominal", "88.76"),
    ("Endoscopia digestiva alta", "45.13"),
    ("Colonoscopia", "45.23"),
    ("Colecistectomia laparoscopica", "51.23"),
    ("Apendicectomia", "47.09"),
    ("Hernioplastia inguinal", "53.00"),
    ("Broncoscopia", "33.22"),
    ("Toracocentesis", "34.91"),
    ("Paracentesis", "54.91"),
    ("Hemodialisis", "39.95"),
    ("RMN cerebral", "88.91"),
    ("Angio TAC cerebral", "88.38"),
    ("Trombolisis EV", "99.10"),
    ("Trombectomia mecanica", "39.74"),
    ("Osteosintesis de cadera", "79.35"),
]

# Tratamientos con códigos ATC
TRATAMIENTOS_CARDIO = [
    ("Heparina 5000UI EV", "B01AB01"),
    ("Heparina EV infusion", "B01AB01"),
    ("Enoxaparina 60mg SC c/12h", "B01AB05"),
    ("Enoxaparina 1mg/kg SC c/12h", "B01AB05"),
    ("Aspirina 300mg carga", "B01AC06"),
    ("Aspirina 100mg", "B01AC06"),
    ("Clopidogrel 600mg carga", "B01AC04"),
    ("Clopidogrel 300mg carga", "B01AC04"),
    ("Ticagrelor 180mg carga", "B01AC24"),
    ("Prasugrel 60mg carga", "B01AC22"),
    ("Nitroglicerina EV", "C01DA02"),
    ("Morfina 3mg EV", "N02AA01"),
    ("Furosemida 40mg EV", "C03CA01"),
    ("Furosemida 80mg EV", "C03CA01"),
    ("Amiodarona 300mg EV", "C01BD01"),
    ("Metoprolol 5mg EV", "C07AB02"),
    ("Enalapril 5mg VO", "C09AA02"),
    ("Atorvastatina 80mg", "C10AA05"),
    ("Noradrenalina EV", "C01CA03"),
    ("Dobutamina EV", "C01CA07"),
    ("Levosimendan EV", "C01CX08"),
    ("Digoxina 0.25mg EV", "C01AA05"),
]

TRATAMIENTOS_GENERALES = [
    ("Omeprazol 40mg EV c/12h", "A02BC01"),
    ("Pantoprazol 40mg EV c/12h", "A02BC02"),
    ("Metoclopramida 10mg EV c/8h", "A03FA01"),
    ("Ondansetron 8mg EV c/8h", "A04AA01"),
    ("Paracetamol 1g EV c/8h", "N02BE01"),
    ("Metamizol 1g EV c/8h", "N02BB02"),
    ("Tramadol 50mg EV c/8h", "N02AX02"),
    ("Morfina 3mg EV c/4h PRN", "N02AA01"),
    ("Ceftriaxona 2g EV c/24h", "J01DD04"),
    ("Ampicilina/Sulbactam 1.5g EV c/6h", "J01CR01"),
    ("Piperacilina/Tazobactam 4.5g EV c/8h", "J01CR05"),
    ("Vancomicina 1g EV c/12h", "J01XA01"),
    ("Meropenem 1g EV c/8h", "J01DH02"),
    ("Ciprofloxacino 400mg EV c/12h", "J01MA02"),
    ("Metronidazol 500mg EV c/8h", "J01XD01"),
    ("Insulina NPH 10UI SC c/12h", "A10AC01"),
    ("Insulina cristalina segun esquema", "A10AB01"),
    ("Hidrocortisona 100mg EV c/8h", "H02AB09"),
    ("Salbutamol NBZ c/4h", "R03AC02"),
    ("Ipratropio NBZ c/6h", "R03BB01"),
    ("N-acetilcisteina NBZ c/8h", "R05CB01"),
]

# Medicación de alta
MEDICACION_ALTA_CARDIO = [
    ("Aspirina 100mg VO c/24h", "B01AC06"),
    ("Clopidogrel 75mg VO c/24h 12m", "B01AC04"),
    ("Ticagrelor 90mg VO c/12h 12m", "B01AC24"),
    ("Prasugrel 10mg VO c/24h 12m", "B01AC22"),
    ("Rivaroxaban 20mg VO c/24h", "B01AF01"),
    ("Apixaban 5mg VO c/12h", "B01AF02"),
    ("Warfarina segun INR", "B01AA03"),
    ("Atorvastatina 40mg VO c/noche", "C10AA05"),
    ("Rosuvastatina 20mg VO c/noche", "C10AA07"),
    ("Enalapril 10mg VO c/12h", "C09AA02"),
    ("Losartan 50mg VO c/24h", "C09CA01"),
    ("Carvedilol 6.25mg VO c/12h", "C07AG02"),
    ("Bisoprolol 5mg VO c/24h", "C07AB07"),
    ("Metoprolol 50mg VO c/12h", "C07AB02"),
    ("Furosemida 40mg VO c/24h", "C03CA01"),
    ("Espironolactona 25mg VO c/24h", "C03DA01"),
    ("Amlodipino 5mg VO c/24h", "C08CA01"),
    ("Nitroglicerina SL PRN", "C01DA02"),
    ("Isosorbide 20mg VO c/8h", "C01DA08"),
    ("Digoxina 0.125mg VO c/24h", "C01AA05"),
]

MEDICACION_ALTA_GENERAL = [
    ("Omeprazol 20mg VO c/24h", "A02BC01"),
    ("Paracetamol 500mg VO c/8h PRN", "N02BE01"),
    ("Tramadol 50mg VO c/8h 7d", "N02AX02"),
    ("Amoxicilina/Clavulanico 875mg VO c/12h 7d", "J01CR02"),
    ("Ciprofloxacino 500mg VO c/12h 7d", "J01MA02"),
    ("Metformina 850mg VO c/12h", "A10BA02"),
    ("Glibenclamida 5mg VO c/24h", "A10BB01"),
    ("Insulina NPH 10UI SC c/12h", "A10AC01"),
    ("Levotiroxina 50mcg VO c/24h", "H03AA01"),
    ("Prednisona 20mg VO c/24h", "H02AB07"),
    ("Salbutamol INH 2 puff c/6h PRN", "R03AC02"),
    ("Budesonide/Formoterol INH c/12h", "R03AK07"),
    ("Hierro 100mg VO c/24h", "B03AA07"),
    ("Acido folico 1mg VO c/24h", "B03BB01"),
    ("Calcio 500mg VO c/12h", "A12AA04"),
    ("Vitamina D 1000UI VO c/24h", "A11CC05"),
    ("Clonazepam 0.5mg VO c/noche", "N03AE01"),
    ("Sertralina 50mg VO c/24h", "N06AB06"),
]

# Evoluciones típicas
EVOLUCIONES_CARDIO = [
    "Oclusion aguda de {arteria}, angioplastia exitosa con stent farmacoactivo, flujo TIMI 3 final",
    "Lesion severa de {arteria}, angioplastia con implante de stent sin complicaciones",
    "Oclusion de {arteria} con trombo, trombectomia por aspiracion mas stent",
    "SDST en {derivaciones}, coronarias sin lesiones obstructivas, sindrome de Tako-Tsubo",
    "Enfermedad de multiples vasos, se deriva a cirugia cardiaca para bypass",
    "Lesion critica de {arteria}, estabilizacion hemodinamica, angioplastia diferida",
    "Fibrilacion auricular de alta respuesta, cardioversion farmacologica exitosa",
    "Bloqueo AV completo sintomatico, requirio marcapasos transitorio",
    "Taquicardia ventricular sostenida, cardioversion electrica exitosa",
    "Edema pulmonar agudo por disfuncion sistolica, respuesta favorable a diureticos",
    "Shock cardiogenico, requirio soporte con inotropicos, evolucion favorable",
    "Pericarditis aguda con derrame leve, manejo antiinflamatorio",
    "Estenosis aortica severa sintomatica, programada para TAVI",
]

EVOLUCIONES_GENERALES = [
    "Evolucion favorable con tratamiento medico, sin complicaciones",
    "Respuesta adecuada al tratamiento antibiotico, afebril desde dia 2",
    "Procedimiento sin complicaciones, buena tolerancia oral",
    "Manejo conservador exitoso, sin necesidad de cirugia",
    "Cirugia programada sin complicaciones, alta precoz",
    "Estabilizacion clinica progresiva, sin eventos adversos",
    "Control de sintomas con tratamiento medico optimizado",
    "Resolucion del cuadro agudo, alta con seguimiento ambulatorio",
    "Mejoría clínica sostenida, cumple criterios de alta",
    "Sin complicaciones postoperatorias, herida operatoria limpia",
]

ARTERIAS = ["DA proximal", "DA media", "DA distal", "CD proximal", "CD media", "CX proximal", "CX distal", "TCI", "OM1", "OM2", "diagonal", "ramus intermedio"]
DERIVACIONES = ["V1-V4", "V1-V6", "II, III, aVF", "I, aVL", "V5-V6"]


def generate_cardio_example():
    """Genera un ejemplo cardiológico."""
    dx_base = random.choice(DIAGNOSTICOS_INGRESO[:20])  # Primeros 20 son cardio
    dx = f"{dx_base[0]} ({dx_base[1]})"

    # Procedimientos
    procs = []
    if "IAM" in dx_base[0] or "Angina" in dx_base[0] or "coronaria" in dx_base[0].lower():
        procs.append("Coronariografia (K492)")
        if random.random() > 0.2:  # 80% recibe angioplastia
            arteria = random.choice(["DA", "CD", "CX", "TCI", "OM"])
            procs.append(f"Angioplastia {arteria} ({random.choice(['K493', '36.06'])})")
    else:
        procs = [random.choice(PROCEDIMIENTOS_CARDIO)[0] + f" ({random.choice(PROCEDIMIENTOS_CARDIO)[1]})"]

    # Tratamiento
    ttos = random.sample(TRATAMIENTOS_CARDIO, k=random.randint(2, 4))
    ttos = [f"{t[0]} ({t[1]})" for t in ttos]

    # Evolución
    evo_template = random.choice(EVOLUCIONES_CARDIO)
    evo = evo_template.format(
        arteria=random.choice(ARTERIAS),
        derivaciones=random.choice(DERIVACIONES)
    )

    # Diagnóstico de alta
    dx_alta = [f"{dx_base[0]} tratado ({dx_base[1]})"]

    # Medicación de alta
    meds = random.sample(MEDICACION_ALTA_CARDIO, k=random.randint(3, 5))
    meds = [f"{m[0]} ({m[1]})" for m in meds]

    # Generar output narrativo
    output = generate_narrative(dx, procs, ttos, evo, dx_alta, meds)

    return {
        "input": {
            "dx": [dx],
            "proc": procs,
            "tto": ttos,
            "evo": evo,
            "dx_alta": dx_alta,
            "med": meds
        },
        "output": output
    }


def generate_general_example():
    """Genera un ejemplo de medicina general/cirugía."""
    dx_base = random.choice(DIAGNOSTICOS_INGRESO[20:])  # Últimos son generales
    dx = f"{dx_base[0]} ({dx_base[1]})"

    # Procedimientos
    procs = random.sample(PROCEDIMIENTOS_GENERALES, k=random.randint(1, 2))
    procs = [f"{p[0]} ({p[1]})" for p in procs]

    # Tratamiento
    ttos = random.sample(TRATAMIENTOS_GENERALES, k=random.randint(2, 4))
    ttos = [f"{t[0]} ({t[1]})" for t in ttos]

    # Evolución
    evo = random.choice(EVOLUCIONES_GENERALES)

    # Diagnóstico de alta
    dx_alta = [f"{dx_base[0]} resuelto ({dx_base[1]})"]

    # Medicación de alta
    meds = random.sample(MEDICACION_ALTA_GENERAL, k=random.randint(2, 4))
    meds = [f"{m[0]} ({m[1]})" for m in meds]

    # Generar output narrativo
    output = generate_narrative(dx, procs, ttos, evo, dx_alta, meds)

    return {
        "input": {
            "dx": [dx],
            "proc": procs,
            "tto": ttos,
            "evo": evo,
            "dx_alta": dx_alta,
            "med": meds
        },
        "output": output
    }


def generate_narrative(dx, procs, ttos, evo, dx_alta, meds):
    """Genera la narrativa de la epicrisis - versión mejorada con más detalle."""
    # Extraer código del diagnóstico
    dx_text = dx.split(" (")[0].lower()
    dx_code = dx.split("(")[-1].rstrip(")")

    # Inicio con variaciones
    inicio_templates = [
        f"Ingresa por {dx_text} ({dx_code})",
        f"Paciente que ingresa con cuadro de {dx_text} ({dx_code})",
        f"Se hospitaliza por {dx_text} ({dx_code})",
        f"Ingreso por {dx_text} ({dx_code})",
    ]
    narrative = random.choice(inicio_templates) + ". "

    # Procedimientos con más detalle
    if procs:
        proc_parts = []
        for p in procs:
            proc_name = p.split(" (")[0].lower()
            proc_code = p.split("(")[-1].rstrip(")")
            proc_parts.append(f"{proc_name} ({proc_code})")

        if "coronariografia" in " ".join(proc_parts).lower():
            narrative += f"Se realiza {proc_parts[0]}"
            if len(proc_parts) > 1 and "angioplastia" in proc_parts[1].lower():
                arteria_detail = random.choice([
                    "encontrando lesion critica",
                    "evidenciando oclusion aguda",
                    "visualizando estenosis severa",
                    "con hallazgo de lesion significativa"
                ])
                narrative += f" {arteria_detail}, realizandose {proc_parts[1]} con implante de stent farmacoactivo y flujo TIMI 3 final"
            narrative += ". "
        else:
            narrative += f"Se realiza {', '.join(proc_parts)}. "

    # Evolución con transición
    evo_transitions = [
        "Durante la hospitalizacion",
        "En su evolucion",
        "Presenta",
        "Evoluciona con",
    ]
    narrative += f"{random.choice(evo_transitions)}, {evo.lower()}. "

    # Tratamiento recibido - más detallado
    tto_details = []
    for t in ttos:
        tto_name = t.split(" (")[0]
        tto_code = t.split("(")[-1].rstrip(")")
        tto_details.append(f"{tto_name} ({tto_code})")

    if len(tto_details) > 2:
        tto_text = ", ".join(tto_details[:-1]) + f" y {tto_details[-1]}"
    else:
        tto_text = " y ".join(tto_details)
    narrative += f"Recibio tratamiento con {tto_text}. "

    # Evolución favorable
    evol_favorable = random.choice([
        "Presenta evolucion favorable",
        "Evolucion clinica favorable",
        "Buena evolucion",
        "Evolucion satisfactoria",
    ])
    narrative += f"{evol_favorable}, cumpliendo criterios de alta. "

    # Alta con diagnósticos
    alta_parts = []
    for a in dx_alta:
        alta_name = a.split(" (")[0].lower()
        alta_code = a.split("(")[-1].rstrip(")")
        alta_parts.append(f"{alta_name} ({alta_code})")

    narrative += f"Alta con diagnostico de {', '.join(alta_parts)}, "

    # Medicación de alta - completa
    med_parts = []
    for m in meds:
        med_name = m.split(" (")[0]
        med_code = m.split("(")[-1].rstrip(")")
        med_parts.append(f"{med_name} ({med_code})")

    if len(med_parts) > 2:
        narrative += "indicandose " + ", ".join(med_parts[:-1]) + f" y {med_parts[-1]}"
    elif len(med_parts) == 2:
        narrative += f"indicandose {med_parts[0]} y {med_parts[1]}"
    else:
        narrative += f"indicandose {med_parts[0]}"
    narrative += "."

    return narrative


def main():
    output_dir = Path(__file__).parent / "datasets"
    output_dir.mkdir(exist_ok=True)

    random.seed(42)

    # Generar 3 archivos de 250 ejemplos cada uno
    for file_num in range(1, 4):
        examples = []

        for i in range(250):
            # 70% cardio, 30% general
            if random.random() < 0.7:
                example = generate_cardio_example()
            else:
                example = generate_general_example()

            examples.append(example)

        # Guardar archivo
        output_file = output_dir / f"dataset_extra_{file_num}.jsonl"
        with open(output_file, "w", encoding="utf-8") as f:
            for ex in examples:
                f.write(json.dumps(ex, ensure_ascii=False) + "\n")

        print(f"Generados {len(examples)} ejemplos en {output_file}")

    print(f"\nTotal: 750 ejemplos generados en 3 archivos")


if __name__ == "__main__":
    main()
