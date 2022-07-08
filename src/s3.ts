import { S3 } from 'aws-sdk'
import { CentralDirectory, Open } from 'unzipper'
import * as fs from 'fs'
import * as path from 'path'

const getFile = async ({ bucket, key, s3 }: { bucket: string, key: string, s3: S3 }) => {
  const s3File = await Open.s3(s3, { Bucket: bucket, Key: key })

  if (!s3File) {
    throw new Error('Bucker or key does not exists')
  }

  const fileExtension = path.extname(path.basename(key))
  const fileDirPath = path.dirname(key)

  const possibleExtensions = ['.zip', '.gzip', '.7zip']
  if (!possibleExtensions.some(ext => ext === fileExtension)) {
    throw new Error('File must be .zip')
  }

  const file = path.basename(key, fileExtension)

  return { s3dirPath: fileDirPath, s3file: s3File, zipName: file }
}

const createDecompressor = (decompressionSettings: { dir: string, uploader?: (pathDir: string, zipName: string) => Promise<string> }) =>
  async (file: CentralDirectory, fileZip: string) => {
    const { dir, uploader } = decompressionSettings

    await file?.extract({ path: dir })

    const filePath = file?.files?.length ? file.files[0].path : ''

    const tmpFolder = path.join(dir, filePath)

    fs.accessSync(tmpFolder)

    if (uploader) {
      const uploadedPath = await uploader(tmpFolder, fileZip)
      return { localPath: tmpFolder, uploadedPath }
    }

    return { localPath: tmpFolder }
  }

const createUploader = (s3Settings: { s3: S3, bucket: string, key?: string, params?: {ACL?: string, ContentDisposition?: string} }) => {
  const { s3, bucket, key: pathReceived, params } = s3Settings
  const pathToExtract = pathReceived ?? ''
  const uploader = async (pathDir: string, zipName: string) => {
    const dir = fs.opendirSync(pathDir)

    for await (const file of dir) {
      const fileCreated = path.join(pathDir, file.name)
      if (file.isDirectory()) {
        await uploader(fileCreated, path.join(zipName, file.name))
        continue
      }
      const read = fs.createReadStream(fileCreated)

      const uploadPath = path.join(pathToExtract, zipName, file.name)
      await s3.upload({ Key: uploadPath, Bucket: bucket, Body: read, ...params }).promise()
    }

    const createdS3Path = path.join(bucket, pathToExtract, zipName)

    return createdS3Path
  }

  return uploader
}
const s3 = {
  getFile,
  createDecompressor,
  createUploader
}

export {
  s3
}
