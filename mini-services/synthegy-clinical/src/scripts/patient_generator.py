#!/usr/bin/env python3.13
"""
Synthegy synthetic patient generator — Rheumatoid Arthritis cohort.

Generates 50 synthetic RA patients reflecting 30 years of epidemiological
reality (1995-2025), with ~5 outliers. The data is COMPLETELY SYNTHETIC —
no real patient data is used. Disease characteristics, treatment patterns,
and outcomes are drawn from published RA epidemiology:

  - Mean age at onset: 55 (range 25-80)
  - Female predominance: ~70%
  - ACPA positivity: ~70%
  - RF positivity: ~70-80%
  - Treatment evolution:
      1995-2000: NSAIDs + steroids, methotrexate emerging
      2000-2010: Methotrexate standard, biologics (anti-TNF) emerging
      2010-2020: Biologics widespread, JAK inhibitors emerging
      2020-2025: JAK inhibitors established, biosimilars
  - ACR50 response rates: ~50-60% for biologics, ~30-40% for MTX
  - Remission rates (modern era): ~30-40%
  - Outliers: exceptional responders, non-responders, severe AEs, juvenile onset

When real data becomes available, replace the generator output with a CSV/DB
import — the downstream analysis pipeline stays the same.
"""

import json
import sys
import random
import hashlib
from datetime import datetime, date

random.seed(42)  # reproducible

# --- Epidemiological parameters -------------------------------------------

DISEASE = "Rheumatoid Arthritis"
ICD10 = "M06.9"

# Treatment eras — reflects how RA treatment evolved over 30 years
TREATMENT_ERAS = [
    {"years": (1995, 2000), "first_line": ["NSAIDs", "Prednisone"], "dmard": ["Methotrexate", "Sulfasalazine"], "biologic": [], "jak": []},
    {"years": (2000, 2005), "first_line": ["NSAIDs", "Prednisone"], "dmard": ["Methotrexate", "Leflunomide", "Sulfasalazine"], "biologic": ["Infliximab", "Etanercept"], "jak": []},
    {"years": (2005, 2010), "first_line": ["NSAIDs"], "dmard": ["Methotrexate", "Leflunomide", "Hydroxychloroquine"], "biologic": ["Infliximab", "Etanercept", "Adalimumab", "Rituximab"], "jak": []},
    {"years": (2010, 2015), "first_line": ["NSAIDs"], "dmard": ["Methotrexate", "Leflunomide", "Hydroxychloroquine"], "biologic": ["Adalimumab", "Etanercept", "Infliximab", "Tocilizumab", "Rituximab", "Certolizumab"], "jak": ["Tofacitinib"]},
    {"years": (2015, 2020), "first_line": ["NSAIDs"], "dmard": ["Methotrexate"], "biologic": ["Adalimumab", "Etanercept", "Tocilizumab", "Rituximab", "Certolizumab", "Golimumab"], "jak": ["Tofacitinib", "Baricitinib"]},
    {"years": (2020, 2025), "first_line": ["NSAIDs"], "dmard": ["Methotrexate"], "biologic": ["Adalimumab", "Etanercept", "Tocilizumab", "Rituximab", "Upadacitinib-biosimilar"], "jak": ["Tofacitinib", "Baricitinib", "Upadacitinib"]},
]

# Biomarker distributions
ACPA_POSITIVITY_RATE = 0.70
RF_POSITIVITY_RATE = 0.75
SMOKING_RATE = 0.25  # RA risk factor

# Outcome probabilities (modern era)
REMISSION_RATE = 0.35
LDA_RATE = 0.25  # low disease activity
MODERATE_RATE = 0.30
HIGH_RATE = 0.10

# Response to first DMARD (methotrexate)
MTX_ACR50_RATE = 0.35
# Response to biologics
BIOLOGIC_ACR50_RATE = 0.55

# Adverse event rates
AE_RATE = 0.20
SERIOUS_AE_RATE = 0.05

# --- Generator ------------------------------------------------------------

def generate_patient(patient_id: int, is_outlier: bool = False) -> dict:
    """Generate one synthetic RA patient."""
    # Diagnosis year — spread across 30 years
    if is_outlier:
        # Outliers: extreme cases
        outlier_type = random.choice(["juvenile", "elderly_severe", "exceptional_responder", "non_responder", "severe_ae"])
        if outlier_type == "juvenile":
            age_at_onset = random.randint(16, 25)
            diagnosis_year = random.randint(2005, 2020)
        elif outlier_type == "elderly_severe":
            age_at_onset = random.randint(70, 82)
            diagnosis_year = random.randint(2010, 2023)
        elif outlier_type == "exceptional_responder":
            age_at_onset = random.randint(40, 60)
            diagnosis_year = random.randint(2015, 2023)
        elif outlier_type == "non_responder":
            age_at_onset = random.randint(45, 65)
            diagnosis_year = random.randint(2008, 2020)
        elif outlier_type == "severe_ae":
            age_at_onset = random.randint(50, 70)
            diagnosis_year = random.randint(2012, 2022)
    else:
        age_at_onset = max(22, min(80, int(random.gauss(55, 12))))
        diagnosis_year = random.randint(1995, 2024)

    # Demographics
    sex = "F" if random.random() < 0.70 else "M"
    ethnicity = random.choices(
        ["White", "Black", "Asian", "Hispanic", "Other"],
        weights=[0.60, 0.15, 0.10, 0.10, 0.05]
    )[0]
    bmi = round(random.gauss(27, 5), 1)
    smoker = random.random() < SMOKING_RATE

    # Disease characteristics at diagnosis
    acpa_positive = random.random() < ACPA_POSITIVITY_RATE
    rf_positive = random.random() < RF_POSITIVITY_RATE
    crp_at_dx = round(max(1, random.gauss(25, 15)), 1)  # mg/L, elevated
    esr_at_dx = round(max(5, random.gauss(35, 18)), 1)  # mm/hr
    das28_at_dx = round(max(2.5, min(8.5, random.gauss(5.5, 1.0))), 2)
    tender_joints = max(1, int(random.gauss(12, 6)))
    swollen_joints = max(1, int(random.gauss(10, 5)))

    # Determine treatment era
    era = None
    for e in TREATMENT_ERAS:
        if e["years"][0] <= diagnosis_year < e["years"][1]:
            era = e
            break
    if not era:
        era = TREATMENT_ERAS[-1]

    # Treatment sequence
    treatments = []
    # First-line
    first_line = random.choice(era["first_line"])
    treatments.append({
        "drug": first_line,
        "class": "NSAID" if "NSAID" in first_line else "Corticosteroid",
        "startMonth": 0,
        "durationMonths": random.randint(3, 12),
        "response": "partial" if first_line == "NSAIDs" else "good",
    })
    # DMARD (standard of care)
    if era["dmard"]:
        dmard = random.choice(era["dmard"])
        mtx_response = random.random()
        treatments.append({
            "drug": dmard,
            "class": "DMARD",
            "startMonth": random.randint(1, 3),
            "durationMonths": random.randint(12, 60),
            "response": "ACR50" if mtx_response < MTX_ACR50_RATE else ("ACR20" if mtx_response < 0.65 else "none"),
        })
    # Biologic (if DMARD insufficient and available in era)
    if era["biologic"] and treatments[-1]["response"] != "ACR50":
        if random.random() < 0.60:  # 60% of insufficient responders get biologic
            biologic = random.choice(era["biologic"])
            bio_response = random.random()
            treatments.append({
                "drug": biologic,
                "class": "Biologic",
                "startMonth": random.randint(6, 18),
                "durationMonths": random.randint(12, 48),
                "response": "ACR50" if bio_response < BIOLOGIC_ACR50_RATE else ("ACR20" if bio_response < 0.80 else "none"),
            })
    # JAK inhibitor (if biologic insufficient and available)
    if era["jak"] and len(treatments) >= 3 and treatments[-1]["response"] != "ACR50":
        if random.random() < 0.40:
            jak = random.choice(era["jak"])
            treatments.append({
                "drug": jak,
                "class": "JAK inhibitor",
                "startMonth": random.randint(18, 36),
                "durationMonths": random.randint(6, 24),
                "response": "ACR50" if random.random() < 0.50 else "ACR20",
            })

    # Override for outlier types
    if is_outlier:
        if outlier_type == "exceptional_responder":
            treatments[-1]["response"] = "ACR70"
        elif outlier_type == "non_responder":
            for t in treatments:
                t["response"] = "none"
        elif outlier_type == "severe_ae":
            treatments[-1]["adverseEvent"] = random.choice(["serious infection", "malignancy", "cardiovascular event", "hepatotoxicity"])

    # Outcomes at 24 months
    if is_outlier and outlier_type == "exceptional_responder":
        outcome_24m = "remission"
        das28_24m = round(random.uniform(1.5, 2.3), 2)
    elif is_outlier and outlier_type == "non_responder":
        outcome_24m = "high_activity"
        das28_24m = round(random.uniform(5.5, 7.5), 2)
    else:
        r = random.random()
        if r < REMISSION_RATE:
            outcome_24m = "remission"
            das28_24m = round(random.uniform(1.5, 2.6), 2)
        elif r < REMISSION_RATE + LDA_RATE:
            outcome_24m = "low_disease_activity"
            das28_24m = round(random.uniform(2.7, 3.2), 2)
        elif r < REMISSION_RATE + LDA_RATE + MODERATE_RATE:
            outcome_24m = "moderate_activity"
            das28_24m = round(random.uniform(3.3, 5.1), 2)
        else:
            outcome_24m = "high_activity"
            das28_24m = round(random.uniform(5.2, 7.0), 2)

    crp_24m = round(max(1, random.gauss(8 if outcome_24m == "remission" else 20, 8)), 1)

    # Adverse events
    has_ae = random.random() < AE_RATE
    has_serious_ae = random.random() < SERIOUS_AE_RATE
    if is_outlier and outlier_type == "severe_ae":
        has_serious_ae = True
        has_ae = True

    ae_list = []
    if has_ae:
        ae_list.append(random.choice(["nausea", "headache", "mild infection", "elevated LFTs", "rash"]))
    if has_serious_ae:
        ae_list.append(random.choice(["serious infection", "malignancy", "cardiovascular event", "hepatotoxicity", "TB reactivation"]))

    # Generate a stable anonymized patient ID
    anon_id = "RA-" + hashlib.sha256(f"patient-{patient_id}".encode()).hexdigest()[:8].upper()

    current_year = 2025
    current_age = age_at_onset + (current_year - diagnosis_year)

    return {
        "patientId": anon_id,
        "synthetic": True,  # ALWAYS flag as synthetic
        "disease": DISEASE,
        "icd10": ICD10,
        "diagnosisYear": diagnosis_year,
        "ageAtOnset": age_at_onset,
        "currentAge": current_age,
        "sex": sex,
        "ethnicity": ethnicity,
        "bmi": bmi,
        "smoker": smoker,
        "biomarkers": {
            "acpaPositive": acpa_positive,
            "rfPositive": rf_positive,
            "crpAtDiagnosis": crp_at_dx,
            "esrAtDiagnosis": esr_at_dx,
            "das28AtDiagnosis": das28_at_dx,
            "tenderJointCount": tender_joints,
            "swollenJointCount": swollen_joints,
        },
        "treatments": treatments,
        "outcomeAt24Months": {
            "das28": das28_24m,
            "crp": crp_24m,
            "status": outcome_24m,
        },
        "adverseEvents": ae_list,
        "isOutlier": is_outlier,
        "outlierType": outlier_type if is_outlier else None,
    }


def generate_cohort(n: int = 50, outlier_fraction: float = 0.10) -> list:
    """Generate a full synthetic cohort."""
    n_outliers = max(1, int(n * outlier_fraction))
    n_normal = n - n_outliers
    patients = []
    # Generate outliers first
    for i in range(n_outliers):
        patients.append(generate_patient(i + 1, is_outlier=True))
    # Then normal patients
    for i in range(n_normal):
        patients.append(generate_patient(n_outliers + i + 1, is_outlier=False))
    random.shuffle(patients)
    return patients


def cohort_analysis(patients: list) -> dict:
    """Compute aggregate cohort statistics."""
    total = len(patients)
    outcomes = [p["outcomeAt24Months"]["status"] for p in patients]
    remission_count = outcomes.count("remission")
    lda_count = outcomes.count("low_disease_activity")
    moderate_count = outcomes.count("moderate_activity")
    high_count = outcomes.count("high_activity")

    # Treatment response rates
    biologic_treated = [p for p in patients if any(t["class"] == "Biologic" for t in p["treatments"])]
    biologic_acr50 = sum(1 for p in biologic_treated if any(t["class"] == "Biologic" and t["response"] == "ACR50" for t in p["treatments"]))

    mtx_treated = [p for p in patients if any(t["class"] == "DMARD" for t in p["treatments"])]
    mtx_acr50 = sum(1 for p in mtx_treated if any(t["class"] == "DMARD" and t["response"] == "ACR50" for t in p["treatments"]))

    # Biomarker correlations
    acpa_pos = [p for p in patients if p["biomarkers"]["acpaPositive"]]
    acpa_pos_remission = sum(1 for p in acpa_pos if p["outcomeAt24Months"]["status"] == "remission")

    return {
        "totalPatients": total,
        "demographics": {
            "femalePct": round(sum(1 for p in patients if p["sex"] == "F") / total * 100, 1),
            "meanAgeAtOnset": round(sum(p["ageAtOnset"] for p in patients) / total, 1),
            "smokerPct": round(sum(1 for p in patients if p["smoker"]) / total * 100, 1),
        },
        "biomarkers": {
            "acpaPositivePct": round(len(acpa_pos) / total * 100, 1),
            "rfPositivePct": round(sum(1 for p in patients if p["biomarkers"]["rfPositive"]) / total * 100, 1),
            "meanDas28AtDx": round(sum(p["biomarkers"]["das28AtDiagnosis"] for p in patients) / total, 2),
        },
        "outcomes": {
            "remissionRate": round(remission_count / total * 100, 1),
            "ldaRate": round(lda_count / total * 100, 1),
            "moderateRate": round(moderate_count / total * 100, 1),
            "highRate": round(high_count / total * 100, 1),
        },
        "treatmentResponse": {
            "mtxTreatedCount": len(mtx_treated),
            "mtxAcr50Rate": round(mtx_acr50 / max(1, len(mtx_treated)) * 100, 1),
            "biologicTreatedCount": len(biologic_treated),
            "biologicAcr50Rate": round(biologic_acr50 / max(1, len(biologic_treated)) * 100, 1),
        },
        "adverseEvents": {
            "anyAePct": round(sum(1 for p in patients if p["adverseEvents"]) / total * 100, 1),
            "seriousAeCount": sum(1 for p in patients if any("serious" in ae.lower() or "malignancy" in ae.lower() or "cardiovascular" in ae.lower() or "hepatotoxicity" in ae.lower() or "tb" in ae.lower() for ae in p["adverseEvents"])),
        },
        "outliers": sum(1 for p in patients if p["isOutlier"]),
        "diagnosisYearRange": [min(p["diagnosisYear"] for p in patients), max(p["diagnosisYear"] for p in patients)],
    }


# --- CLI entry point ------------------------------------------------------

def main():
    cmd = json.loads(sys.stdin.read())
    mode = cmd.get("mode")
    if mode == "generate":
        n = cmd.get("n", 50)
        patients = generate_cohort(n, outlier_fraction=0.10)
        result = {"patients": patients, "analysis": cohort_analysis(patients)}
    elif mode == "analyze":
        patients = cmd.get("patients", [])
        result = {"analysis": cohort_analysis(patients)}
    else:
        result = {"error": f"unknown mode: {mode}"}
    sys.stdout.write(json.dumps(result, default=str))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
