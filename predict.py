import sys
import pickle
import numpy as np

# Load the model
model_path = "models/random_forest_model.pkl"
with open(model_path, "rb") as file:
    model = pickle.load(file)

# Parse input from Node.js
input_data = list(map(float, sys.argv[1:]))  # Accept comma-separated features # get the values from node js as sys.argv
input_array = np.array(input_data).reshape(1, -1)

# Make prediction
prediction = model.predict(input_array)

# Return prediction result
print(prediction[0])  # Output 1 for disease, 0 for no disease
