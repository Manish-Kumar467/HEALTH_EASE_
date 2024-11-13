# predict.py
import sys
import joblib
import json
import numpy as np

# Load the pre-trained model
model = joblib.load('./models/svc.pkl')

# A dictionary to convert symptom strings to model-friendly numerical input
symptoms_dict = {
    "itching": 0, "skin_rash": 1, "nodal_skin_eruptions": 2, 
    "continuous_sneezing": 3, "shivering": 4, "chills": 5,
    "joint_pain": 6, "muscle_wasting": 7, "swelling": 8,
    "malaise": 9, "fatigue": 10, "vomiting": 11, 
    "diarrhea": 12, "cough": 13, "shortness_of_breath": 14,
    "chest_pain": 15, "palpitations": 16, "dizziness": 17,
    "headache": 18, "nausea": 19, "loss_of_appetite": 20,
    "pain_behind_eyes": 21, "back_pain": 22, "constipation": 23,
    "abdominal_pain": 24, "yellowish_skin": 25, "dark_urine": 26,
    "blister": 27, "red_spots_over_body": 28, "cough_with_blood": 29,
    "sweating": 30, "altered_sensorium": 31, "weakness_of_one_body_side": 32,
    "swelling_of_stomach": 33, "swelling_of_legs": 34, "fast_heart_rate": 35,
    "breathlessness": 36, "numbness": 37, "tingling_sensation": 38,
    "fever": 39, "headache_with_nausea": 40, "bloody_stool": 41,
    "irregular_menstruation": 42, "bloody_urine": 43, "blurry_vision": 44,
    "sore_throat": 45, "painful_urination": 46, "nose_bleed": 47,
    "uncontrolled_hunger": 48, "sudden_vision_loss": 49
}


# List of diseases corresponding to model outputs
diseases_list = {
    0: "Fungal infection", 1: "Allergy", 2: "GERD", 
    3: "Chronic cholestasis", 4: "Drug Reaction", 5: "Peptic ulcer diseae", 
    6: "AIDS", 7: "Diabetes", 8: "Gastroenteritis", 9: "Bronchial Asthma",
    10: "Hypertension", 11: "Migraine", 12: "Cervical spondylosis", 13: "Paralysis (brain hemorrhage)",
    14: "Jaundice", 15: "Malaria", 16: "Chicken pox", 17: "Dengue", 
    18: "Typhoid", 19: "Tuberculosis", 20: "Common Cold", 21: "Pneumonia", 
    22: "Dimorphic hemmorhoids(piles)", 23: "Heart attack", 24: "Varicose veins",
    25: "Hypothyroidism", 26: "Hyperthyroidism", 27: "Hypoglycemia", 
    28: "Osteoarthristis", 29: "Arthritis", 30: "Enteric fever", 
    31: "Acne", 32: "Urinary tract infection", 33: "Psoriasis", 34: "Impetigo", 
    35: "Hepatitis A", 36: "Hepatitis B", 37: "Hepatitis C", 38: "Hepatitis D", 
    39: "Hepatitis E", 40: "Chronic hepatitis", 41: "Acute liver failure", 
    42: "Alcoholic hepatitis", 43: "Cirrhosis", 44: "Liver cancer", 
    45: "Colorectal cancer", 46: "Lung cancer", 47: "Stomach cancer", 
    48: "Leukemia", 49: "Non-Hodgkin lymphoma"
}


def predict_disease(symptoms):
    input_vector = np.zeros(len(symptoms_dict))
    for item in symptoms:
        input_vector[symptoms_dict.get(item, 0)] = 1
    prediction = model.predict([input_vector])
    return diseases_list[prediction[0]]


# Read symptoms passed from Node.js
if __name__ == "__main__":
    symptoms = json.loads(sys.argv[1])
    result = predict_disease(symptoms)
    print(json.dumps({"disease": result}))
