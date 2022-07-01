import path from "path"
import os from "os"
import fs from "fs"
import S3 from "aws-sdk/clients/s3"
import { s3 } from "./src/s3"

const createUploader = (s3Settings: { s3: S3, bucket: string, path?: string }) => async (pathDir: string, zipName: string) => {
  const { s3, bucket, path: pathReceived } = s3Settings
  const pathToExtract = pathReceived ?? ''
  const dir = fs.opendirSync(pathDir)
  
  for await (const file of dir) {
    const fileCreated = path.join(pathDir, file.name)
    const read = fs.createReadStream(fileCreated)

    const uploadPath = path.join(pathToExtract, zipName, file.name)
    await s3.upload({ Key: uploadPath, Bucket: bucket, Body: read }).promise()
  }
}

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
  const decompressor = s3.decompression({ dir: dirToExtract })

  const { s3file, zipName } = await s3.getFile({ bucket, key, s3: s3Client })

  await decompressor(s3file, zipName)
}

const decompressToKeyFolderS3 = async (zipFile: IS3ZipFileParams) => {
  const { s3Client, bucket, key } = zipFile

  const dirToExtract = getDirectoryToExtract()
  const dirToUpload = path.dirname(key)
  const uploader = createUploader({ s3: s3Client, bucket, path: dirToUpload })
  const decompressor = s3.decompression({ dir: dirToExtract, uploader })

  const { s3file, zipName } = await s3.getFile({ bucket, key, s3: s3Client })

  await decompressor(s3file, zipName)
}

export {
  decompressLocal,
  decompressToKeyFolderS3
}
