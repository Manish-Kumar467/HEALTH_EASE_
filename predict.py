import sys
import pickle
import numpy as np
import os 
import sklearn

print(sklearn.__version__)
# Load the model
model_path = "models/random_forest_model.pkl"

if not os.path.exists(model_path):
    print(f"Model file not found at {model_path}")
else:
    print(f"Model file found at {model_path}")

try:
    with open(model_path, "rb") as file:
        model = pickle.load(file)
    print("Model loaded successfully.")
    # Check if the model has the predict method
    if not hasattr(model, 'predict'):
        raise ValueError("Loaded model does not have a 'predict' method.")
except Exception as e:
    print(f"Error loading model: {e}")
    sys.exit(1)

# Parse input from Node.js
input_data = list(map(float, sys.argv[1:]))  # Accept comma-separated features # get the values from node js as sys.argv
input_array = np.array(input_data).reshape(1, -1)

# Make prediction
try:
    prediction = model.predict(input_array)
    # Return prediction result
    print(prediction[0])  # Output 1 for disease, 0 for no disease
except Exception as e:
    print(f"Error making prediction: {e}")
    sys.exit(1)
