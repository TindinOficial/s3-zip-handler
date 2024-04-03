import { PutObjectCommandInput, S3 } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { CentralDirectory, Open } from 'unzipper'
import * as fs from 'fs'
import * as path from 'path'
import mime from 'mime-types'

interface IGetFileInput {
  bucket: string,
  key: string,
  s3: S3
}

interface IGetFileOutput {
  s3dirPath: string;
  s3file: CentralDirectory;
  zipName: string;
}

const getFile = async (input: IGetFileInput): Promise<IGetFileOutput> => {
  const { bucket, key, s3 } = input

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

interface ICreateDecompressorInput {
  dir: string,
  uploader?: (pathDir: string, zipName: string) => Promise<string>
}

interface IDecompressorOutput {
  localPath: string
  uploadedPath?: string
}

type CreateDecompressorOutput = (file: CentralDirectory, fileZip: string) => Promise<IDecompressorOutput>

const createDecompressor = (input: ICreateDecompressorInput): CreateDecompressorOutput =>
  async (file: CentralDirectory, fileZip: string) => {
    const { dir, uploader } = input

    await file?.extract({ path: path.join(dir, fileZip) })

    const tmpFolder = path.join(dir, fileZip)

    fs.accessSync(tmpFolder)

    if (uploader) {
      const uploadedPath = await uploader(tmpFolder, fileZip)
      return { localPath: tmpFolder, uploadedPath }
    }

    return { localPath: tmpFolder }
  }

interface ICreateUploaderInput {
  s3: S3
  bucket: string
  key?: string
  params?: Pick<PutObjectCommandInput, 'ACL' | 'ContentDisposition'>
}

type UploaderOutput = string
type CreateUploaderOutput = (pathDir: string, zipName: string) => Promise<UploaderOutput>

const createUploader = (input: ICreateUploaderInput): CreateUploaderOutput => {
  const { s3, bucket, key: pathReceived, params } = input
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
      const contentType = mime.lookup(file.name) || 'application/octet-stream'

      const newUpload = new Upload({
        client: s3,
        params: {
          Key: uploadPath,
          Bucket: bucket,
          Body: read,
          ...params,
          ContentType: contentType
        }
      })

      newUpload.done()
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
