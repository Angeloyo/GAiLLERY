# This is the Lambda function uploaded to the container
# and then to AWS Lambda.

# It's triggered by an S3 event 
# when a new image is uploaded to the bucket.
# The function downloads the image, preprocesses it,
# makes predictions using a pre-trained ResNet50 model,
# and stores the predictions in a DynamoDB table.

import boto3
import numpy as np
import io
import json
import logging
from PIL import Image
from tensorflow.keras.applications.resnet50 import preprocess_input, decode_predictions
from tensorflow.keras.models import load_model

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
model_path = '/var/task/resnet50_model.h5'

def update_status(photo_id, status, table):
    """
    Updates the status of a photo in the DynamoDB table.

    Args:
        photo_id (str): The ID of the photo.
        status (str): The new status to update.
        table (boto3.resources.factory.dynamodb.Table): The DynamoDB table.

    Raises:
        Exception: If there is an error updating the status.

    Returns:
        dict: The response from the update operation.
    """
    try:
        response = table.update_item(
            Key={'PhotoID': photo_id},
            UpdateExpression='SET #st = :val',
            ExpressionAttributeNames={'#st': 'Status'},
            ExpressionAttributeValues={':val': status}
        )
        logger.info(f"Status updated to {status} for {photo_id}")
        return response
    except Exception as e:
        logger.error("Failed to update status", exc_info=True)
        raise

def store_predictions(image_name, predictions, table):
    """
    Stores the predictions for an image in the DynamoDB table.

    Args:
        image_name (str): The name of the image.
        predictions (list): The list of predictions.
        table (boto3.resources.factory.dynamodb.Table): The DynamoDB table.

    Raises:
        Exception: If there is an error storing the predictions.

    Returns:
        dict: The response from the put operation.
    """
    labels = [{'Description': pred[1], 
               'Probability': f"{pred[2] * 100:.1f}%"} 
               for pred in predictions]

    logger.info(f"Storing predictions for {image_name} in DynamoDB...")
    try:
        response = table.put_item(
            Item={
                'PhotoID': image_name,
                'Labels': labels,
            }
        )
        logger.info("Data stored successfully.")
        return response
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        raise

def lambda_handler(event, context):
    """
    The entry point for the Lambda function.

    Args:
        event (dict): The event data.
        context (object): The runtime information.

    Returns:
        dict: The response from the Lambda function.
    """

    try:
        model = load_model(model_path)
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error("Failed to load model", exc_info=True)
        
    table = dynamodb.Table('PhotoTags')
    bucket_name = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']
    logger.info(f"Processing file {key} from bucket {bucket_name}.")

    try:
        update_status(key, 'Obtaining image from S3...', table)
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        img_data = response['Body'].read()
        img = Image.open(io.BytesIO(img_data))
        update_status(key, 'Preprocessing image...', table)
        img = img.resize((224, 224))
        img_array = np.expand_dims(np.array(img), axis=0)
        img_array = preprocess_input(img_array)

        update_status(key, 'Making predictions...', table)
        predictions = model.predict(img_array)
        decoded_predictions = decode_predictions(predictions, top=3)[0]

        update_status(key, 'Storing predictions...', table)
        store_predictions(key, decoded_predictions, table)

        update_status(key, 'Done.', table)
        logger.info(f"Tags and scores stored successfully for image {key}.")
        return {'statusCode': 200, 'body': json.dumps(f"Tags and scores stored for image {key}")}

    except Exception as e:
        logger.error(f"Error processing file {key}: {str(e)}")
        update_status(key, 'ERROR', table)
        return {'statusCode': 500, 'body': json.dumps(f"Error processing file {key}: {str(e)}")}