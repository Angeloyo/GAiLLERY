# This is a simple script that predicts the top 3 labels of an image 
# using the ResNet50 model. The script takes an image path as input.

import numpy as np
import argparse
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input, decode_predictions
from tensorflow.keras.preprocessing import image

def predict_image(img_path):
    """
    Predicts the top 3 labels for an image using the ResNet50 model.

    Parameters:
    img_path (str): Path to the image file.

    Returns:
    list: A list of tuples containing the predicted labels, descriptions, and scores.
    """
    # Load the pre-trained ResNet50 model
    model = ResNet50(weights='imagenet')
    
    # Load and prepare the image
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)
    
    # Make predictions
    predictions = model.predict(img_array)
    
    # Decode the predictions
    decoded_predictions = decode_predictions(predictions, top=3)[0]
    return decoded_predictions

def main():
    """
    Main function that parses command line arguments and predicts the top 3 labels for an image.
    """
    parser = argparse.ArgumentParser(description='Predict top 3 labels for an image using ResNet50.')
    parser.add_argument('image_path', type=str, help='Path to the image file.')
    args = parser.parse_args()
    
    # Path to the test image
    img_path = args.image_path
    
    # Make the prediction
    predicted_labels = predict_image(img_path)
    print("Predicted labels:")
    for label, description, score in predicted_labels:
        print(f"{description} ({label}): {score*100:.2f}%")

if __name__ == '__main__':
    main()