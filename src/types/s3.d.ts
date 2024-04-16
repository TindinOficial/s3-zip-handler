import { PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

interface IGetFileInput {
  bucket: string,
  key: string,
  s3: S3Client
}

interface IZipFile {
  stream: Readable
  name: string
  extension: string
}

interface IGetFileOutput {
  zip: IZipFile
}

type Uploader = (tmpFolder: string, zipName: string) => Promise<string>

interface ICreateDecompressorInput {
  dirToExtract: string,
  uploader?: Uploader
}

interface IDecompressorOutput {
  localPath: string
  uploadedPath?: string
}

type CreateDecompressorOutput = (file: IZipFile) => Promise<IDecompressorOutput>

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
  Uploader,
  IZipFile
}
