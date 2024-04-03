import path from 'path'
import os from 'os'
import fs from 'fs'
import { PutObjectCommandInput, S3 } from '@aws-sdk/client-s3'
import { s3 } from './src/s3'

const getDirectoryToExtract = (pathToExtract?: string) => {
  if (!pathToExtract) {
    const tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'unzipped-'))
    return tmpPath
  }
  return pathToExtract
}

interface IS3ZipFileParams {
  s3Client: S3
  bucket: string
  key: string,
  params?: Pick<PutObjectCommandInput, 'ACL' | 'ContentDisposition'>
}

type DecompressLocalOutputType = string

const decompressLocal = async (zipFile: IS3ZipFileParams, pathToExtract?: string): Promise<DecompressLocalOutputType> => {
  const { s3Client, bucket, key } = zipFile
  const dirToExtract = getDirectoryToExtract(pathToExtract)
  const decompressor = s3.createDecompressor({ dir: dirToExtract })

  const { s3file, zipName } = await s3.getFile({ bucket, key, s3: s3Client })

  const { localPath } = await decompressor(s3file, zipName)

  return localPath
}

interface IDecompressToKeyFolderS3Output {
  localPath: string;
  uploadedPath: string | undefined;
}

const decompressToKeyFolderS3 = async (zipFile: IS3ZipFileParams): Promise<IDecompressToKeyFolderS3Output> => {
  const { s3Client, bucket, key, params } = zipFile

  const dirToExtract = getDirectoryToExtract()
  const dirToUpload = path.dirname(key)
  const uploader = s3.createUploader({ s3: s3Client, bucket, key: dirToUpload, params })
  const decompressor = s3.createDecompressor({ dir: dirToExtract, uploader })

  const { s3file, zipName } = await s3.getFile({ bucket, key, s3: s3Client })

  const { localPath, uploadedPath } = await decompressor(s3file, zipName)

  return { localPath, uploadedPath }
}

const s3ZipHandler = {
  decompressLocal,
  decompressToKeyFolderS3
}

export { IS3ZipFileParams, IDecompressToKeyFolderS3Output, DecompressLocalOutputType }

export default s3ZipHandler
