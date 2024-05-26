# This script will process all images in an S3 bucket using a local 
# ResNet50 model and store the labels in a DynamoDB table.
#   Args: 
#     bucket_name (str): The name of the S3 bucket.
#     table_name (str): The name of the DynamoDB table.

import boto3
import numpy as np
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input, decode_predictions
from tensorflow.keras.preprocessing import image
from PIL import Image
import io
import argparse

s3 = boto3.client('s3', region_name='eu-west-3')  # Cambia 'us-west-2' por tu región
dynamodb = boto3.resource('dynamodb', region_name='eu-west-3')  # Cambia 'us-west-2' por tu región

def predict_image(img_data):
    """
    Predicts the labels of an image using the ResNet50 model.

    Args:
        img_data (bytes): The image data.

    Returns:
        list: The decoded predictions.
    """
    print("Loading ResNet50 model...")
    model = ResNet50(weights='imagenet')
    img = Image.open(io.BytesIO(img_data))
    img = img.resize((224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)
    print("Predicting labels...")
    predictions = model.predict(img_array)
    decoded_predictions = decode_predictions(predictions, top=3)[0]
    print(f"Decoded predictions: {decoded_predictions}")
    return decoded_predictions

def store_predictions(image_name, predictions, table):
    """
    Stores the predictions of an image in DynamoDB.

    Args:
        image_name (str): The name of the image.
        predictions (list): The predictions to store.
        table (boto3.resources.factory.dynamodb.Table): The DynamoDB table.

    Returns:
        dict: The response from DynamoDB.
    """
    # Formatear correctamente las predicciones para DynamoDB
    # Convertir la probabilidad de decimal a porcentaje y formatear a dos decimales como string
    labels = [{
        'Description': {'S': pred[1]},
        'Probability': {'S': f"{pred[2] * 100:.2f}%"}  # Formatear como porcentaje
    } for pred in predictions]

    print(f"Storing predictions for {image_name} in DynamoDB...")
    try:
        # Asegurar que la estructura del ítem a almacenar es la correcta
        response = table.put_item(
            Item={
                'PhotoID': image_name,  # Asegurarse que PhotoID es una string simple
                'Labels': labels        # Asegurarse que Labels es una lista de diccionarios
            }
        )
        print("Data stored successfully.")
        return response
    except Exception as e:
        print(f"An error occurred: {e}")

def process_images(bucket_name, table_name):
    """
    Processes all images in an S3 bucket and stores their labels in DynamoDB.

    Args:
        bucket_name (str): The name of the S3 bucket.
        table_name (str): The name of the DynamoDB table.
    """
    table = dynamodb.Table(table_name)

    print(f"Listing objects in bucket {bucket_name}...")
    response = s3.list_objects_v2(Bucket=bucket_name)
    images = [obj['Key'] for obj in response['Contents'] if obj['Key'].lower().endswith(('.webp', '.png', '.jpg', '.jpeg'))]

    print(f"Found {len(images)} images. Processing...")
    for image_key in images:
        print(f"Processing image: {image_key}")
        response = s3.get_object(Bucket=bucket_name, Key=image_key)
        img_data = response['Body'].read()

        predictions = predict_image(img_data)
        
        store_response = store_predictions(image_key, predictions, table)

def main():
    """
    Main function that processes images in an S3 bucket and stores their labels in DynamoDB.
    """
    parser = argparse.ArgumentParser(description='Process all images in an S3 bucket and store their labels in DynamoDB.')
    parser.add_argument('bucket_name', type=str, help='Name of the S3 bucket.')
    parser.add_argument('table_name', type=str, help='Name of the DynamoDB table.')
    args = parser.parse_args()

    process_images(args.bucket_name, args.table_name)

if __name__ == '__main__':
    main()