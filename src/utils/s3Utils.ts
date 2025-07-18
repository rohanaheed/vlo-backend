import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

/**
 * Uploads a file to S3 and returns the file URL
 * @param file { buffer: Buffer, originalname: string, mimetype: string }
 * @returns {Promise<string>} S3 file URL
 */
export async function uploadFileToS3(file: { buffer: Buffer, originalname: string, mimetype: string }): Promise<string> {
  const ext = path.extname(file.originalname);
  const key = `invoices/${uuidv4()}${ext}`;

  await s3.putObject({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }).promise();

  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Removes a file from S3 by key
 * @param key S3 object key (e.g., 'invoices/uuid.pdf')
 * @returns {Promise<void>}
 */
export async function removeFileFromS3(key: string): Promise<void> {
  await s3.deleteObject({
    Bucket: BUCKET_NAME,
    Key: key,
  }).promise();
}