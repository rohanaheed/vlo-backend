import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

/**
 * Uploads a file to S3 and returns the file URL
 * @param file { buffer: Buffer, originalname: string, mimetype: string }
 * @returns {Promise<string>} S3 file URL
 */
export async function uploadFileToS3(file: {bucket: string, buffer: Buffer, originalname: string, mimetype: string, key: string }): Promise<string> {
  await s3Client.send(new PutObjectCommand({
    Bucket: file.bucket,
    Key: file.key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));
  return `https://${file.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.key}`;
}

/**
 * Removes a file from S3 by key
 * @param key S3 object key (e.g., 'invoices/uuid.pdf')
 * @returns {Promise<void>}
 */
export async function removeFileFromS3(bucket: string, key: string): Promise<void> {  
  await s3Client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }));
}