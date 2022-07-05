import path from 'path'
import os from 'os'
import fs from 'fs'
import S3 from 'aws-sdk/clients/s3'
import { s3 } from '@/src/s3'

const getDirectoryToExtract = (pathToExtract?: string) => {
  if (!pathToExtract) {
    const tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'unzipper-'))
    return tmpPath
  }
  return pathToExtract
}

interface IS3ZipFileParams {
  s3Client: S3
  bucket: string
  key: string
}

const decompressLocal = async (zipFile: IS3ZipFileParams, pathToExtract?: string) => {
  const { s3Client, bucket, key } = zipFile
  const dirToExtract = getDirectoryToExtract(pathToExtract)
  const decompressor = s3.createDecompressor({ dir: dirToExtract })

  const { s3file, zipName } = await s3.getFile({ bucket, key, s3: s3Client })

  await decompressor(s3file, zipName)
}

const decompressToKeyFolderS3 = async (zipFile: IS3ZipFileParams) => {
  const { s3Client, bucket, key } = zipFile

  const dirToExtract = getDirectoryToExtract()
  const dirToUpload = path.dirname(key)
  const uploader = s3.createUploader({ s3: s3Client, bucket, key: dirToUpload })
  const decompressor = s3.createDecompressor({ dir: dirToExtract, uploader })

  const { s3file, zipName } = await s3.getFile({ bucket, key, s3: s3Client })

  const { localPath, uploadedPath } = await decompressor(s3file, zipName)

  return { localPath, uploadedPath }
}

export {
  decompressLocal,
  decompressToKeyFolderS3,
  IS3ZipFileParams
}
