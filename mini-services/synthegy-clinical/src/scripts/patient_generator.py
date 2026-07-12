#!/usr/bin/env python3.13
"""
Synthegy synthetic patient generator — multi-disease cohort.

Generates synthetic patients for multiple diseases, each reflecting 30 years
of epidemiological reality (1995-2025). ALL DATA IS SYNTHETIC.

Supported diseases (derived from the Synthegy knowledge graph for NSAID/COX
targets):
  - rheumatoid_arthritis  (ICD-10 M06.9)
  - migraine              (ICD-10 G43.909)
  - gout                  (ICD-10 M10.9)
  - osteoarthritis        (ICD-10 M19.90)
  - ulcerative_colitis    (ICD-10 K51.90)
  - asthma                (ICD-10 J45.909)

Each disease has its own epidemiological profile (age at onset, sex ratio,
biomarkers, treatment eras, outcome distributions, outlier types).

When real data becomes available, replace the generator with a CSV/DB import —
the downstream analysis pipeline stays the same.
"""

import json
import sys
import random
import hashlib

random.seed(42)

# =========================================================================
# Disease profiles
# =========================================================================

DISEASES = {
    "rheumatoid_arthritis": {
        "name": "Rheumatoid Arthritis",
        "icd10": "M06.9",
        "target": "PTGS2",
        "meanAgeOnset": 55,
        "ageStd": 12,
        "ageMin": 25,
        "ageMax": 80,
        "femalePct": 0.70,
        "biomarkers": {
            "acpa": {"rate": 0.70, "label": "ACPA"},
            "rf": {"rate": 0.75, "label": "RF"},
        },
        "treatmentEras": [
            {"years": (1975, 1980), "first_line": ["Aspirin", "Prednisone"], "dmard": ["Gold salts", "D-penicillamine"], "biologic": [], "advanced": []},
            {"years": (1980, 1985), "first_line": ["Aspirin", "NSAIDs"], "dmard": ["Gold salts", "D-penicillamine", "Sulfasalazine"], "biologic": [], "advanced": []},
            {"years": (1985, 1990), "first_line": ["NSAIDs", "Prednisone"], "dmard": ["Methotrexate", "Sulfasalazine", "Azathioprine"], "biologic": [], "advanced": []},
            {"years": (1990, 1995), "first_line": ["NSAIDs", "Prednisone"], "dmard": ["Methotrexate", "Sulfasalazine"], "biologic": [], "advanced": []},
            {"years": (1995, 2000), "first_line": ["NSAIDs", "Prednisone"], "dmard": ["Methotrexate", "Sulfasalazine"], "biologic": [], "advanced": []},
            {"years": (2000, 2005), "first_line": ["NSAIDs", "Prednisone"], "dmard": ["Methotrexate", "Leflunomide"], "biologic": ["Infliximab", "Etanercept"], "advanced": []},
            {"years": (2005, 2010), "first_line": ["NSAIDs"], "dmard": ["Methotrexate", "Leflunomide", "Hydroxychloroquine"], "biologic": ["Adalimumab", "Etanercept", "Infliximab", "Rituximab"], "advanced": []},
            {"years": (2010, 2015), "first_line": ["NSAIDs"], "dmard": ["Methotrexate"], "biologic": ["Adalimumab", "Etanercept", "Tocilizumab", "Rituximab", "Certolizumab"], "advanced": ["Tofacitinib"]},
            {"years": (2015, 2020), "first_line": ["NSAIDs"], "dmard": ["Methotrexate"], "biologic": ["Adalimumab", "Etanercept", "Tocilizumab", "Rituximab"], "advanced": ["Tofacitinib", "Baricitinib"]},
            {"years": (2020, 2025), "first_line": ["NSAIDs"], "dmard": ["Methotrexate"], "biologic": ["Adalimumab", "Etanercept", "Tocilizumab"], "advanced": ["Tofacitinib", "Baricitinib", "Upadacitinib"]},
        ],
        "outcomeMetric": "DAS28",
        "remissionRate": 0.35,
        "ldaRate": 0.25,
        "moderateRate": 0.30,
        "highRate": 0.10,
        "mtxResponseRate": 0.35,
        "biologicResponseRate": 0.55,
        "aeRate": 0.20,
        "seriousAeRate": 0.05,
        "outlierTypes": ["juvenile", "elderly_severe", "exceptional_responder", "non_responder", "severe_ae"],
        "biomarkerAtDx": {"crp": (25, 15), "esr": (35, 18), "das28": (5.5, 1.0)},
    },
    "migraine": {
        "name": "Migraine",
        "icd10": "G43.909",
        "target": "HTR1B",
        "meanAgeOnset": 25,
        "ageStd": 8,
        "ageMin": 12,
        "ageMax": 50,
        "femalePct": 0.75,
        "biomarkers": {
            "cgmp": {"rate": 0.60, "label": "Elevated cGMP"},
            "fhm": {"rate": 0.05, "label": "FHM mutation"},
        },
        "treatmentEras": [
            {"years": (1975, 1980), "first_line": ["Ergotamine", "Aspirin"], "dmard": ["Propranolol", "Amitriptyline"], "biologic": [], "advanced": []},
            {"years": (1980, 1985), "first_line": ["Ergotamine", "NSAIDs"], "dmard": ["Propranolol", "Amitriptyline"], "biologic": [], "advanced": []},
            {"years": (1985, 1990), "first_line": ["Ergotamine", "NSAIDs"], "dmard": ["Propranolol", "Amitriptyline", "Valproate"], "biologic": [], "advanced": []},
            {"years": (1990, 1995), "first_line": ["Sumatriptan-preview", "Ergotamine", "NSAIDs"], "dmard": ["Propranolol", "Amitriptyline"], "biologic": [], "advanced": []},
            {"years": (1995, 2000), "first_line": ["Sumatriptan", "NSAIDs", "Propranolol"], "dmard": ["Amitriptyline", "Topiramate"], "biologic": [], "advanced": []},
            {"years": (2000, 2005), "first_line": ["Sumatriptan", "Rizatriptan"], "dmard": ["Topiramate", "Valproate"], "biologic": [], "advanced": []},
            {"years": (2005, 2010), "first_line": ["Sumatriptan", "Rizatriptan", "Zolmitriptan"], "dmard": ["Topiramate", "Valproate", "Amitriptyline"], "biologic": [], "advanced": ["OnabotulinumtoxinA"]},
            {"years": (2010, 2015), "first_line": ["Sumatriptan", "Rizatriptan", "Eletriptan"], "dmard": ["Topiramate", "Valproate"], "biologic": ["OnabotulinumtoxinA"], "advanced": []},
            {"years": (2015, 2020), "first_line": ["Sumatriptan", "Rizatriptan"], "dmard": ["Topiramate", "CGRP-mAb-preview"], "biologic": ["OnabotulinumtoxinA"], "advanced": []},
            {"years": (2020, 2025), "first_line": ["Sumatriptan", "Rizatriptan", "Ubrogepant"], "dmard": ["Topiramate"], "biologic": ["Erenumab", "Fremanezumab", "Galcanezumab"], "advanced": ["Atogepant", "Rimegepant"]},
        ],
        "outcomeMetric": "MIDAS",
        "remissionRate": 0.30,
        "ldaRate": 0.30,
        "moderateRate": 0.30,
        "highRate": 0.10,
        "mtxResponseRate": 0.40,
        "biologicResponseRate": 0.50,
        "aeRate": 0.15,
        "seriousAeRate": 0.02,
        "outlierTypes": ["pediatric_onset", "chronic_migraine", "exceptional_responder", "medication_overuse", "status_migrainosus"],
        "biomarkerAtDx": {"mid": (20, 10), "headache_days": (8, 4), "das28": None},
    },
    "gout": {
        "name": "Gout",
        "icd10": "M10.9",
        "target": "URAT1",
        "meanAgeOnset": 50,
        "ageStd": 10,
        "ageMin": 30,
        "ageMax": 75,
        "femalePct": 0.15,
        "biomarkers": {
            "hyperuricemia": {"rate": 0.95, "label": "Hyperuricemia"},
            "msu": {"rate": 0.80, "label": "MSU crystals"},
        },
        "treatmentEras": [
            {"years": (1975, 1980), "first_line": ["Colchicine", "Aspirin"], "dmard": ["Allopurinol", "Probenecid"], "biologic": [], "advanced": []},
            {"years": (1980, 1985), "first_line": ["Colchicine", "NSAIDs"], "dmard": ["Allopurinol", "Probenecid"], "biologic": [], "advanced": []},
            {"years": (1985, 1990), "first_line": ["NSAIDs", "Colchicine"], "dmard": ["Allopurinol"], "biologic": [], "advanced": []},
            {"years": (1990, 1995), "first_line": ["NSAIDs", "Colchicine", "Prednisone"], "dmard": ["Allopurinol", "Probenecid"], "biologic": [], "advanced": []},
            {"years": (1995, 2000), "first_line": ["NSAIDs", "Colchicine", "Prednisone"], "dmard": ["Allopurinol", "Probenecid"], "biologic": [], "advanced": []},
            {"years": (2000, 2005), "first_line": ["NSAIDs", "Colchicine"], "dmard": ["Allopurinol", "Probenecid"], "biologic": [], "advanced": []},
            {"years": (2005, 2010), "first_line": ["NSAIDs", "Colchicine", "Prednisone"], "dmard": ["Allopurinol", "Febuxostat"], "biologic": [], "advanced": []},
            {"years": (2010, 2015), "first_line": ["NSAIDs", "Colchicine", "Canakinumab-preview"], "dmard": ["Allopurinol", "Febuxostat"], "biologic": ["Canakinumab"], "advanced": []},
            {"years": (2015, 2020), "first_line": ["NSAIDs", "Colchicine"], "dmard": ["Allopurinol", "Febuxostat"], "biologic": ["Canakinumab"], "advanced": ["Pegloticase"]},
            {"years": (2020, 2025), "first_line": ["NSAIDs", "Colchicine"], "dmard": ["Allopurinol", "Febuxostat"], "biologic": [], "advanced": ["Pegloticase"]},
        ],
        "outcomeMetric": "Serum urate",
        "remissionRate": 0.40,
        "ldaRate": 0.30,
        "moderateRate": 0.20,
        "highRate": 0.10,
        "mtxResponseRate": 0.50,
        "biologicResponseRate": 0.60,
        "aeRate": 0.18,
        "seriousAeRate": 0.04,
        "outlierTypes": ["young_onset", "tophaceous", "renal_impairment", "exceptional_responder", "refractory"],
        "biomarkerAtDx": {"crp": (15, 8), "esr": (25, 12), "serum_urate": (9.5, 1.5)},
    },
    "osteoarthritis": {
        "name": "Osteoarthritis",
        "icd10": "M19.90",
        "target": "PTGS2",
        "meanAgeOnset": 60,
        "ageStd": 10,
        "ageMin": 40,
        "ageMax": 85,
        "femalePct": 0.60,
        "biomarkers": {
            "ra_factor": {"rate": 0.10, "label": "Elevated CRP"},
        },
        "treatmentEras": [
            {"years": (1975, 1980), "first_line": ["Aspirin", "Phenylbutazone"], "dmard": ["Intra-articular steroids"], "biologic": [], "advanced": []},
            {"years": (1980, 1985), "first_line": ["NSAIDs", "Acetaminophen"], "dmard": ["Intra-articular steroids"], "biologic": [], "advanced": []},
            {"years": (1985, 1990), "first_line": ["NSAIDs", "Acetaminophen"], "dmard": ["Intra-articular steroids"], "biologic": [], "advanced": []},
            {"years": (1990, 1995), "first_line": ["NSAIDs", "Acetaminophen"], "dmard": ["Intra-articular steroids"], "biologic": [], "advanced": []},
            {"years": (1995, 2000), "first_line": ["NSAIDs", "Acetaminophen"], "dmard": ["Intra-articular steroids"], "biologic": [], "advanced": []},
            {"years": (2000, 2005), "first_line": ["NSAIDs", "Acetaminophen", "Topical NSAIDs"], "dmard": ["Hyaluronic acid"], "biologic": [], "advanced": []},
            {"years": (2005, 2010), "first_line": ["NSAIDs", "Acetaminophen"], "dmard": ["Intra-articular steroids", "Hyaluronic acid"], "biologic": [], "advanced": []},
            {"years": (2010, 2015), "first_line": ["NSAIDs", "Topical NSAIDs"], "dmard": ["Intra-articular steroids"], "biologic": [], "advanced": []},
            {"years": (2015, 2020), "first_line": ["NSAIDs", "Duloxetine"], "dmard": ["Intra-articular steroids", "Hyaluronic acid"], "biologic": ["NGF-mAb-preview"], "advanced": []},
            {"years": (2020, 2025), "first_line": ["NSAIDs", "Topical NSAIDs", "Duloxetine"], "dmard": ["Intra-articular steroids"], "biologic": [], "advanced": ["Tanezumab-preview"]},
        ],
        "outcomeMetric": "WOMAC",
        "remissionRate": 0.20,
        "ldaRate": 0.35,
        "moderateRate": 0.35,
        "highRate": 0.10,
        "mtxResponseRate": 0.45,
        "biologicResponseRate": 0.40,
        "aeRate": 0.12,
        "seriousAeRate": 0.03,
        "outlierTypes": ["early_onset", "rapid_progressor", "joint_replacement", "non_responder", "severe_ae"],
        "biomarkerAtDx": {"crp": (8, 5), "esr": (15, 8), "womac": (35, 12)},
    },
    "ulcerative_colitis": {
        "name": "Ulcerative Colitis",
        "icd10": "K51.90",
        "target": "TNF",
        "meanAgeOnset": 35,
        "ageStd": 12,
        "ageMin": 18,
        "ageMax": 70,
        "femalePct": 0.45,
        "biomarkers": {
            "pANCA": {"rate": 0.70, "label": "pANCA positive"},
            "calprotectin": {"rate": 0.85, "label": "Elevated calprotectin"},
        },
        "treatmentEras": [
            {"years": (1975, 1980), "first_line": ["Sulfasalazine", "Prednisone"], "dmard": ["Azathioprine"], "biologic": [], "advanced": []},
            {"years": (1980, 1985), "first_line": ["Sulfasalazine", "Prednisone"], "dmard": ["Azathioprine", "6-MP"], "biologic": [], "advanced": []},
            {"years": (1985, 1990), "first_line": ["Mesalamine", "Prednisone"], "dmard": ["Azathioprine", "6-MP"], "biologic": [], "advanced": []},
            {"years": (1990, 1995), "first_line": ["Mesalamine", "Prednisone"], "dmard": ["Azathioprine", "6-MP"], "biologic": [], "advanced": []},
            {"years": (1995, 2000), "first_line": ["Mesalamine", "Prednisone"], "dmard": ["Azathioprine", "6-MP"], "biologic": [], "advanced": []},
            {"years": (2000, 2005), "first_line": ["Mesalamine", "Budesonide"], "dmard": ["Azathioprine", "Methotrexate"], "biologic": ["Infliximab"], "advanced": []},
            {"years": (2005, 2010), "first_line": ["Mesalamine"], "dmard": ["Azathioprine", "6-MP"], "biologic": ["Infliximab", "Adalimumab"], "advanced": []},
            {"years": (2010, 2015), "first_line": ["Mesalamine"], "dmard": ["Azathioprine", "Tacrolimus"], "biologic": ["Infliximab", "Adalimumab", "Golimumab"], "advanced": ["Vedolizumab"]},
            {"years": (2015, 2020), "first_line": ["Mesalamine"], "dmard": ["Azathioprine"], "biologic": ["Infliximab", "Adalimumab", "Vedolizumab"], "advanced": ["Tofacitinib", "Ustekinumab"]},
            {"years": (2020, 2025), "first_line": ["Mesalamine"], "dmard": ["Azathioprine"], "biologic": ["Infliximab", "Adalimumab", "Vedolizumab", "Ustekinumab"], "advanced": ["Tofacitinib", "Upadacitinib", "Mirikizumab"]},
        ],
        "outcomeMetric": "Mayo score",
        "remissionRate": 0.30,
        "ldaRate": 0.25,
        "moderateRate": 0.30,
        "highRate": 0.15,
        "mtxResponseRate": 0.30,
        "biologicResponseRate": 0.50,
        "aeRate": 0.22,
        "seriousAeRate": 0.06,
        "outlierTypes": ["pediatric_onset", "fulminant", "exceptional_responder", "colectomy", "cancer_risk"],
        "biomarkerAtDx": {"crp": (20, 12), "esr": (30, 15), "mayo": (8, 3)},
    },
    "asthma": {
        "name": "Asthma",
        "icd10": "J45.909",
        "target": "PTGS2",
        "meanAgeOnset": 20,
        "ageStd": 12,
        "ageMin": 5,
        "ageMax": 65,
        "femalePct": 0.55,
        "biomarkers": {
            "eosinophilia": {"rate": 0.50, "label": "Eosinophilia"},
            "ige": {"rate": 0.60, "label": "Elevated IgE"},
        },
        "treatmentEras": [
            {"years": (1975, 1980), "first_line": ["Isoproterenol", "Epinephrine", "Theophylline"], "dmard": ["Beclomethasone"], "biologic": [], "advanced": []},
            {"years": (1980, 1985), "first_line": ["Albuterol", "Theophylline"], "dmard": ["Beclomethasone", "Cromolyn"], "biologic": [], "advanced": []},
            {"years": (1985, 1990), "first_line": ["Albuterol"], "dmard": ["Beclomethasone", "Theophylline"], "biologic": [], "advanced": []},
            {"years": (1990, 1995), "first_line": ["Albuterol", "Prednisone"], "dmard": ["Fluticasone", "Theophylline"], "biologic": [], "advanced": []},
            {"years": (1995, 2000), "first_line": ["Albuterol", "Prednisone"], "dmard": ["Fluticasone", "Montelukast"], "biologic": [], "advanced": []},
            {"years": (2000, 2005), "first_line": ["Albuterol", "Salmeterol"], "dmard": ["Budesonide", "Montelukast"], "biologic": [], "advanced": []},
            {"years": (2005, 2010), "first_line": ["Albuterol", "Formoterol"], "dmard": ["Fluticasone", "Mometasone"], "biologic": ["Omalizumab"], "advanced": []},
            {"years": (2010, 2015), "first_line": ["Albuterol"], "dmard": ["Fluticasone-salmeterol", "Budesonide-formoterol"], "biologic": ["Omalizumab", "Mepolizumab"], "advanced": []},
            {"years": (2015, 2020), "first_line": ["Albuterol"], "dmard": ["Fluticasone-vilanterol", "Budesonide-formoterol"], "biologic": ["Omalizumab", "Mepolizumab", "Benralizumab", "Dupilumab"], "advanced": []},
            {"years": (2020, 2025), "first_line": ["Albuterol"], "dmard": ["Fluticasone-vilanterol"], "biologic": ["Dupilumab", "Mepolizumab", "Benralizumab", "Tezepelumab"], "advanced": ["Dupilumab"]},
        ],
        "outcomeMetric": "FEV1",
        "remissionRate": 0.25,
        "ldaRate": 0.35,
        "moderateRate": 0.30,
        "highRate": 0.10,
        "mtxResponseRate": 0.45,
        "biologicResponseRate": 0.55,
        "aeRate": 0.15,
        "seriousAeRate": 0.04,
        "outlierTypes": ["pediatric_onset", "severe_eosinophilic", "exceptional_responder", "steroid_dependent", "near_fatal"],
        "biomarkerAtDx": {"crp": (5, 3), "esr": (10, 5), "fev1_pct": (75, 15)},
    },
}


# =========================================================================
# Generator
# =========================================================================

def _gauss(mean, std, mn, mx):
    return max(mn, min(mx, int(random.gauss(mean, std))))


def generate_patient(patient_id: int, disease_key: str, is_outlier: bool = False) -> dict:
    """Generate one synthetic patient for the given disease."""
    profile = DISEASES[disease_key]
    outlier_type = None

    if is_outlier:
        outlier_type = random.choice(profile["outlierTypes"])
        if "juvenile" in outlier_type or "pediatric" in outlier_type or "young" in outlier_type or "early" in outlier_type:
            age_at_onset = max(profile["ageMin"] - 10, random.randint(5, profile["ageMin"] + 5))
        elif "elderly" in outlier_type or "severe" in outlier_type:
            age_at_onset = random.randint(profile["ageMax"] - 10, profile["ageMax"] + 5)
        else:
            age_at_onset = _gauss(profile["meanAgeOnset"], profile["ageStd"], profile["ageMin"], profile["ageMax"])
    else:
        age_at_onset = _gauss(profile["meanAgeOnset"], profile["ageStd"], profile["ageMin"], profile["ageMax"])

    diagnosis_year = random.randint(1975, 2024)
    sex = "F" if random.random() < profile["femalePct"] else "M"
    ethnicity = random.choices(["White", "Black", "Asian", "Hispanic", "Other"], weights=[0.60, 0.15, 0.10, 0.10, 0.05])[0]
    bmi = round(random.gauss(27, 5), 1)
    smoker = random.random() < 0.25

    # Biomarkers
    biomarkers = {}
    for bk, bv in profile["biomarkers"].items():
        biomarkers[bk] = random.random() < bv["rate"]
    biomarker_labels = {bv["label"]: biomarkers[bk] for bk, bv in profile["biomarkers"].items() if bk in biomarkers}

    # Disease activity at diagnosis
    dx_vals = profile["biomarkerAtDx"]
    crp = round(max(1, random.gauss(*dx_vals.get("crp", (15, 8)))), 1)
    esr = round(max(5, random.gauss(*dx_vals.get("esr", (20, 10)))), 1)

    # Primary disease activity metric
    if "das28" in dx_vals and dx_vals["das28"]:
        primary_score = round(max(2.5, min(8.5, random.gauss(*dx_vals["das28"]))), 2)
        primary_label = "DAS28"
    elif "mid" in dx_vals:
        primary_score = round(max(0, random.gauss(*dx_vals["mid"])), 1)
        primary_label = "MIDAS"
    elif "serum_urate" in dx_vals:
        primary_score = round(max(5, random.gauss(*dx_vals["serum_urate"])), 1)
        primary_label = "Serum urate"
    elif "womac" in dx_vals:
        primary_score = round(max(0, random.gauss(*dx_vals["womac"])), 1)
        primary_label = "WOMAC"
    elif "mayo" in dx_vals:
        primary_score = round(max(0, min(12, random.gauss(*dx_vals["mayo"]))), 1)
        primary_label = "Mayo"
    elif "fev1_pct" in dx_vals:
        primary_score = round(max(30, min(100, random.gauss(*dx_vals["fev1_pct"]))), 1)
        primary_label = "FEV1 %"
    else:
        primary_score = round(random.gauss(5, 2), 2)
        primary_label = "Activity score"

    # Treatment era
    era = None
    for e in profile["treatmentEras"]:
        if e["years"][0] <= diagnosis_year < e["years"][1]:
            era = e
            break
    if not era:
        era = profile["treatmentEras"][-1]

    # Treatment sequence
    treatments = []
    first_line = random.choice(era["first_line"])
    treatments.append({"drug": first_line, "class": "Symptomatic", "startMonth": 0, "durationMonths": random.randint(3, 12), "response": "partial"})
    if era["dmard"]:
        dmard = random.choice(era["dmard"])
        mtx_r = random.random()
        treatments.append({"drug": dmard, "class": "Standard", "startMonth": random.randint(1, 3), "durationMonths": random.randint(12, 60), "response": "ACR50" if mtx_r < profile["mtxResponseRate"] else ("ACR20" if mtx_r < 0.65 else "none")})
    if era["biologic"] and treatments[-1]["response"] != "ACR50":
        if random.random() < 0.60:
            biologic = random.choice(era["biologic"])
            bio_r = random.random()
            treatments.append({"drug": biologic, "class": "Biologic", "startMonth": random.randint(6, 18), "durationMonths": random.randint(12, 48), "response": "ACR50" if bio_r < profile["biologicResponseRate"] else ("ACR20" if bio_r < 0.80 else "none")})
    if era.get("advanced") and len(treatments) >= 3 and treatments[-1]["response"] != "ACR50":
        if random.random() < 0.40:
            adv = random.choice(era["advanced"])
            treatments.append({"drug": adv, "class": "Advanced", "startMonth": random.randint(18, 36), "durationMonths": random.randint(6, 24), "response": "ACR50" if random.random() < 0.50 else "ACR20"})

    # Outlier overrides
    if is_outlier:
        if "exceptional" in outlier_type:
            if treatments: treatments[-1]["response"] = "ACR70"
        elif "non_responder" in outlier_type or "refractory" in outlier_type:
            for t in treatments: t["response"] = "none"
        elif "severe_ae" in outlier_type or "near_fatal" in outlier_type or "cancer" in outlier_type:
            if treatments: treatments[-1]["adverseEvent"] = random.choice(["serious infection", "malignancy", "cardiovascular event", "hepatotoxicity"])

    # Outcome at 24 months
    if is_outlier and "exceptional" in outlier_type:
        outcome = "remission"; score_24m = round(random.uniform(1.5, 2.3), 2)
    elif is_outlier and ("non_responder" in outlier_type or "refractory" in outlier_type):
        outcome = "high_activity"; score_24m = round(random.uniform(5.5, 7.5), 2)
    else:
        r = random.random()
        if r < profile["remissionRate"]:
            outcome = "remission"; score_24m = round(random.uniform(1.5, 2.6), 2)
        elif r < profile["remissionRate"] + profile["ldaRate"]:
            outcome = "low_disease_activity"; score_24m = round(random.uniform(2.7, 3.2), 2)
        elif r < profile["remissionRate"] + profile["ldaRate"] + profile["moderateRate"]:
            outcome = "moderate_activity"; score_24m = round(random.uniform(3.3, 5.1), 2)
        else:
            outcome = "high_activity"; score_24m = round(random.uniform(5.2, 7.0), 2)

    # Adverse events
    has_ae = random.random() < profile["aeRate"]
    has_serious_ae = random.random() < profile["seriousAeRate"]
    if is_outlier and ("severe_ae" in outlier_type or "near_fatal" in outlier_type):
        has_serious_ae = True; has_ae = True
    ae_list = []
    if has_ae: ae_list.append(random.choice(["nausea", "headache", "mild infection", "elevated LFTs", "rash"]))
    if has_serious_ae: ae_list.append(random.choice(["serious infection", "malignancy", "cardiovascular event", "hepatotoxicity"]))

    anon_id = profile["icd10"].split(".")[0][:3] + "-" + hashlib.sha256(f"{disease_key}-{patient_id}".encode()).hexdigest()[:8].upper()
    current_age = age_at_onset + (2025 - diagnosis_year)

    return {
        "patientId": anon_id,
        "synthetic": True,
        "disease": profile["name"],
        "diseaseKey": disease_key,
        "icd10": profile["icd10"],
        "target": profile["target"],
        "diagnosisYear": diagnosis_year,
        "ageAtOnset": age_at_onset,
        "currentAge": current_age,
        "sex": sex,
        "ethnicity": ethnicity,
        "bmi": bmi,
        "smoker": smoker,
        "biomarkers": {**biomarker_labels, "crpAtDiagnosis": crp, "esrAtDiagnosis": esr, f"{primary_label.replace(' ', '_').lower()}AtDiagnosis": primary_score},
        "primaryMetric": primary_label,
        "primaryScoreAtDx": primary_score,
        "treatments": treatments,
        "outcomeAt24Months": {"score": score_24m, "metric": primary_label, "status": outcome},
        "adverseEvents": ae_list,
        "isOutlier": is_outlier,
        "outlierType": outlier_type,
    }


def generate_cohort(disease_key: str, n: int = 50, outlier_fraction: float = 0.10) -> list:
    n_outliers = max(1, int(n * outlier_fraction))
    patients = []
    for i in range(n_outliers):
        patients.append(generate_patient(i + 1, disease_key, is_outlier=True))
    for i in range(n - n_outliers):
        patients.append(generate_patient(n_outliers + i + 1, disease_key, is_outlier=False))
    random.shuffle(patients)
    return patients


def cohort_analysis(patients: list) -> dict:
    total = len(patients)
    if total == 0:
        return {"totalPatients": 0}
    outcomes = [p["outcomeAt24Months"]["status"] for p in patients]
    disease = patients[0]["disease"]
    disease_key = patients[0]["diseaseKey"]
    profile = DISEASES[disease_key]

    biologic_treated = [p for p in patients if any(t["class"] == "Biologic" for t in p["treatments"])]
    biologic_acr50 = sum(1 for p in biologic_treated if any(t["class"] == "Biologic" and t["response"] == "ACR50" for t in p["treatments"]))
    std_treated = [p for p in patients if any(t["class"] == "Standard" for t in p["treatments"])]
    std_acr50 = sum(1 for p in std_treated if any(t["class"] == "Standard" and t["response"] == "ACR50" for t in p["treatments"]))

    return {
        "disease": disease,
        "diseaseKey": disease_key,
        "totalPatients": total,
        "demographics": {
            "femalePct": round(sum(1 for p in patients if p["sex"] == "F") / total * 100, 1),
            "meanAgeAtOnset": round(sum(p["ageAtOnset"] for p in patients) / total, 1),
            "smokerPct": round(sum(1 for p in patients if p["smoker"]) / total * 100, 1),
        },
        "outcomes": {
            "remissionRate": round(outcomes.count("remission") / total * 100, 1),
            "ldaRate": round(outcomes.count("low_disease_activity") / total * 100, 1),
            "moderateRate": round(outcomes.count("moderate_activity") / total * 100, 1),
            "highRate": round(outcomes.count("high_activity") / total * 100, 1),
        },
        "treatmentResponse": {
            "stdTreatedCount": len(std_treated),
            "stdAcr50Rate": round(std_acr50 / max(1, len(std_treated)) * 100, 1),
            "biologicTreatedCount": len(biologic_treated),
            "biologicAcr50Rate": round(biologic_acr50 / max(1, len(biologic_treated)) * 100, 1),
        },
        "adverseEvents": {
            "anyAePct": round(sum(1 for p in patients if p["adverseEvents"]) / total * 100, 1),
            "seriousAeCount": sum(1 for p in patients if any("serious" in ae.lower() or "malignancy" in ae.lower() or "cardiovascular" in ae.lower() for ae in p["adverseEvents"])),
        },
        "outliers": sum(1 for p in patients if p["isOutlier"]),
        "diagnosisYearRange": [min(p["diagnosisYear"] for p in patients), max(p["diagnosisYear"] for p in patients)],
        "primaryMetric": profile["outcomeMetric"],
    }


def list_diseases() -> list:
    return [
        {"key": k, "name": v["name"], "icd10": v["icd10"], "target": v["target"],
         "meanAgeOnset": v["meanAgeOnset"], "femalePct": v["femalePct"]}
        for k, v in DISEASES.items()
    ]


# =========================================================================
# CLI
# =========================================================================

def main():
    cmd = json.loads(sys.stdin.read())
    mode = cmd.get("mode")
    if mode == "generate":
        disease_key = cmd.get("disease", "rheumatoid_arthritis")
        n = cmd.get("n", 50)
        if disease_key == "ALL":
            all_patients = []
            all_analysis = {}
            for dk in DISEASES:
                patients = generate_cohort(dk, n)
                all_patients.extend(patients)
                all_analysis[dk] = cohort_analysis(patients)
            result = {"patients": all_patients, "analysis": all_analysis, "diseases": list_diseases()}
        else:
            patients = generate_cohort(disease_key, n)
            result = {"patients": patients, "analysis": cohort_analysis(patients)}
    elif mode == "analyze":
        result = {"analysis": cohort_analysis(cmd.get("patients", []))}
    elif mode == "list_diseases":
        result = {"diseases": list_diseases()}
    else:
        result = {"error": f"unknown mode: {mode}"}
    sys.stdout.write(json.dumps(result, default=str))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
