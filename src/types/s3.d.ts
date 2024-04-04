import { PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3'
import { File } from 'decompress'
import { Readable } from 'stream'

interface IGetFileInput {
  bucket: string,
  key: string,
  s3: S3Client
}

interface IGetFileOutput {
  s3dirPath: string;
  s3file: Readable;
  zipName: string;
}

type Uploader = (files: File[], dir: string, zipName: string) => Promise<string>

interface ICreateDecompressorInput {
  dir: string,
  uploader?: Uploader
}

interface IDecompressorOutput {
  localPath: string
  uploadedPath?: string
}

type CreateDecompressorOutput = (zipFile: Readable, fileName: string) => Promise<IDecompressorOutput>

interface ICreateUploaderInput {
  s3: S3Client
  bucket: string
  key?: string
  params?: Pick<PutObjectCommandInput, 'ACL' | 'ContentDisposition'>
}

export {
  IGetFileInput,
  IGetFileOutput,
  ICreateDecompressorInput,
  IDecompressorOutput,
  ICreateUploaderInput,
  CreateDecompressorOutput,
  Uploader
}
