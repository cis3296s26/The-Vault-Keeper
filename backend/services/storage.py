import os
import uuid
import boto3
from botocore.exceptions import ClientError

s3 = boto3.client(
    "s3",
    endpoint_url=os.getenv("R2_ENDPOINT"),
    aws_access_key_id=os.getenv("R2_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("R2_SECRET_KEY"),
    region_name="auto"
)

def upload_file(file, filename: str) -> str:
    r2_key = f"{uuid.uuid4()}_{filename}"
    try:
        s3.upload_fileobj(file, os.getenv("R2_BUCKET"), r2_key)
        return r2_key
    except ClientError as e:
        raise Exception(f"Failed to upload file: {e}")

def get_file_url(filename: str) -> str:
    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": os.getenv("R2_BUCKET"), "Key": filename},
            ExpiresIn=3600
        )
        return url
    except ClientError as e:
        raise Exception(f"Failed to generate url: {e}")

def delete_file(filename: str):
    s3.delete_object(Bucket=os.getenv("R2_BUCKET"), Key=filename)