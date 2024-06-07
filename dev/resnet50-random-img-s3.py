# This script downloads random images from Lorem Picsum 
# and uploads them to an S3 bucket.
# The script takes two arguments: the name of the S3 bucket
# and the number of images to upload.

import requests
import boto3
import sys
from io import BytesIO
import uuid

def download_image(image_size=(1024, 1024)):
    """
    Downloads an image from Lorem Picsum.

    Args:
        image_size (tuple): The size of the image to download. Default is (224, 224).

    Returns:
        bytes: The content of the downloaded image.

    Raises:
        Exception: If the image fails to download from Lorem Picsum.
    """
    print(f"Downloading an image of size {image_size[0]}x{image_size[1]} from Lorem Picsum...")
    url = f"https://picsum.photos/{image_size[0]}/{image_size[1]}"
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        print("Image downloaded successfully.")
        return response.content
    else:
        raise Exception("Failed to download image from Lorem Picsum")

def upload_to_s3(bucket_name, image_data):
    """
    Uploads an image to an S3 bucket.

    Args:
        bucket_name (str): The name of the S3 bucket.
        image_data (bytes): The content of the image to upload.

    Returns:
        None

    Prints:
        str: The name of the uploaded image and the S3 bucket it was uploaded to.

    Raises:
        Exception: If there is an error uploading the image to S3.
    """
    s3 = boto3.client('s3')
    file_name = f"random_image_{uuid.uuid4().hex}.jpg"
    print(f"Uploading {file_name} to S3 bucket {bucket_name}...")
    try:
        # Convert binary data to a file-like object
        image_file = BytesIO(image_data)
        s3.upload_fileobj(
            Fileobj=image_file,
            Bucket=bucket_name,
            Key=file_name
        )
        print(f"Uploaded {file_name} to S3 bucket {bucket_name} successfully.")
    except Exception as e:
        print(f"Error uploading image to S3: {e}")

def main(bucket_name, number_of_images):
    """
    Main function to upload multiple images to an S3 bucket.

    Args:
        bucket_name (str): The name of the S3 bucket.
        number_of_images (int): The number of images to upload.

    Returns:
        None

    Prints:
        str: The progress and status of the image uploads.
    """
    print(f"Starting the upload of {number_of_images} images to the S3 bucket '{bucket_name}'.")
    for i in range(number_of_images):
        image_data = download_image()
        upload_to_s3(bucket_name, image_data)
    print("All images have been uploaded successfully.")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script.py <S3_BUCKET_NAME> <NUMBER_OF_IMAGES>")
        sys.exit(1)
    bucket = sys.argv[1]
    num_images = int(sys.argv[2])
    main(bucket, num_images)