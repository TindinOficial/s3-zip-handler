import { GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import decompress from 'decompress'
import { Readable } from 'stream'
import mime from 'mime-types'
import * as path from 'path'
import * as fs from 'fs'
import {
  IGetFileInput,
  IGetFileOutput,
  ICreateDecompressorInput,
  ICreateUploaderInput,
  CreateDecompressorOutput,
  Uploader,
  IZipFile
} from './types/s3'

const getZipFile = async (input: IGetFileInput): Promise<IGetFileOutput> => {
  const { bucket, key, s3 } = input

  const readableStream = (await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })
  )).Body as Readable

  if (!readableStream) {
    throw new Error('Bucket or key does not exists')
  }

  const fileExtension = path.extname(path.basename(key))

  const possibleExtensions = ['.zip', '.gzip', '.7zip']
  if (!possibleExtensions.some(ext => ext === fileExtension)) {
    throw new Error('File must be .zip')
  }

  const zip = {
    name: path.basename(key, fileExtension),
    stream: readableStream,
    extension: fileExtension
  }

  return {
    zip
  }
}

interface IDecompressZipFilesInput {
  zip: IZipFile,
  dirToExtract: string
}
const decompressZipFiles = async (input: IDecompressZipFilesInput) => {
  const { zip, dirToExtract } = input

  const zipFilePath = path.join(dirToExtract, (zip.name + zip.extension))

  await (
    new Promise(resolve => {
      const localFileStream = fs.createWriteStream(zipFilePath)
      zip.stream.pipe(localFileStream)
      localFileStream.on('finish', resolve)
    })
  )

  fs.accessSync(zipFilePath)

  const tmpFolder = path.join(dirToExtract, zip.name)
  await decompress(zipFilePath, tmpFolder)

  fs.unlinkSync(zipFilePath)

  return { tmpFolder }
}

const createDecompressor = (input: ICreateDecompressorInput): CreateDecompressorOutput =>
  async (zip: IZipFile) => {
    const { dirToExtract, uploader } = input

    const { tmpFolder } = await decompressZipFiles({ zip, dirToExtract })

    if (uploader) {
      const uploadedPath = await uploader(tmpFolder, zip.name)

      return { localPath: tmpFolder, uploadedPath }
    }

    return { localPath: tmpFolder }
  }

const createUploader = (input: ICreateUploaderInput): Uploader => {
  const { s3, bucket, key: pathReceived } = input
  const pathToExtract = pathReceived ?? ''

  const uploader = async (dirPath: string, dirName: string) => {
    const dir = fs.opendirSync(dirPath)

    for await (const file of dir) {
      const fileCreated = path.join(dirPath, file.name)

      if (file.isDirectory()) {
        await uploader(fileCreated, path.join(dirName, file.name))
        continue
      }

      const fileStream = fs.createReadStream(fileCreated)
      const uploadPath = path.join(pathToExtract, dirName, file.name)
      const contentType = mime.lookup(file.name) || 'application/octet-stream'

      const newUpload = new Upload({
        client: s3,
        params: {
          Bucket: bucket,
          Key: uploadPath,
          Body: fileStream,
          ContentType: contentType
        }
      })

      await newUpload.done()
    }

    const createdS3Path = path.join(bucket, pathToExtract, dirName)

    return createdS3Path
  }

  return uploader
}
const s3 = {
  getZipFile,
  createDecompressor,
  createUploader
}

export {
  s3
}
