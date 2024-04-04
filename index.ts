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

interface IS3ZipFileParams {
  s3Client: S3Client
  bucket: string
  key: string,
  params?: Pick<PutObjectCommandInput, 'ACL' | 'ContentDisposition'>
}

const decompressLocal = async (zipFile: IS3ZipFileParams, pathToExtract?: string): Promise<string> => {
  const { s3Client, bucket, key } = zipFile
  const dirToExtract = getDirectoryToExtract(pathToExtract)
  const decompressor = s3.createDecompressor({ dir: dirToExtract })

  const { s3file, zipName } = await s3.getZipFile({ bucket, key, s3: s3Client })

  const { localPath } = await decompressor(s3file, zipName)

  return localPath
}

interface IDecompressToKeyFolderS3Output {
  localPath: string;
  uploadedPath?: string;
}

const decompressToKeyFolderS3 = async (zipFile: IS3ZipFileParams): Promise<IDecompressToKeyFolderS3Output> => {
  const { s3Client, bucket, key, params } = zipFile

  const dirToExtract = getDirectoryToExtract()
  const dirToUpload = path.dirname(key)
  const uploader = s3.createUploader({ s3: s3Client, bucket, key: dirToUpload, params })
  const decompressor = s3.createDecompressor({ dir: dirToExtract, uploader })

  const { s3file, zipName } = await s3.getZipFile({ bucket, key, s3: s3Client })

  const { localPath, uploadedPath } = await decompressor(s3file, zipName)

  return { localPath, uploadedPath }
}

const s3ZipHandler = {
  decompressLocal,
  decompressToKeyFolderS3
}

export { IS3ZipFileParams, IDecompressToKeyFolderS3Output }

export default s3ZipHandler
