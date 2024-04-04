import { PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3'
import { s3 } from './src/s3'
import path from 'path'
import fs from 'fs'
import os from 'os'

const getDirectoryToExtract = (pathToExtract?: string) => {
  if (!pathToExtract) {
    const tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'unzipped-'))
    return tmpPath
  }
  return pathToExtract
}

interface IS3ZipHandlerInput {
  s3Client: S3Client
  bucket: string
  key: string,
  params?: Pick<PutObjectCommandInput, 'ACL' | 'ContentDisposition'>
}

const decompressLocal = async (input: IS3ZipHandlerInput, pathToExtract?: string): Promise<string> => {
  const { s3Client, bucket, key } = input
  const dirToExtract = getDirectoryToExtract(pathToExtract)
  const decompressor = s3.createDecompressor({ dir: dirToExtract })

  const { zip } = await s3.getZipFile({ bucket, key, s3: s3Client })

  const { localPath } = await decompressor(zip)

  return localPath
}

interface IDecompressToKeyFolderS3Output {
  localPath: string;
  uploadedPath?: string;
}

const decompressToKeyFolderS3 = async (input: IS3ZipHandlerInput): Promise<IDecompressToKeyFolderS3Output> => {
  const { s3Client, bucket, key, params } = input

  const dirToExtract = getDirectoryToExtract()
  const dirToUpload = path.dirname(key)
  const uploader = s3.createUploader({ s3: s3Client, bucket, key: dirToUpload, params })
  const decompressor = s3.createDecompressor({ dir: dirToExtract, uploader })

  const { zip } = await s3.getZipFile({ bucket, key, s3: s3Client })

  const { localPath, uploadedPath } = await decompressor(zip)

  return { localPath, uploadedPath }
}

const s3ZipHandler = {
  decompressLocal,
  decompressToKeyFolderS3
}

export { IS3ZipHandlerInput, IDecompressToKeyFolderS3Output }

export default s3ZipHandler
