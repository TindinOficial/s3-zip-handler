import { GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import decompress, { File } from 'decompress'
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
  dir: string
}
const decompressZipFiles = async (input: IDecompressZipFilesInput) => {
  const { zip, dir } = input

  const zipFilePath = path.join(dir, (zip.name + zip.extension))

  const localFileStream = fs.createWriteStream(zipFilePath)

  zip.stream.pipe(localFileStream)
  fs.accessSync(zipFilePath)

  const tmpFolder = path.join(dir, zip.name)

  const files = await decompress(zipFilePath, tmpFolder)

  fs.unlinkSync(zipFilePath)

  return { files, tmpFolder }
}

const createDecompressor = (input: ICreateDecompressorInput): CreateDecompressorOutput =>
  async (zip: IZipFile) => {
    const { dir, uploader } = input

    const { files, tmpFolder } = await decompressZipFiles({ zip, dir })

    if (uploader) {
      const uploadedPath = await uploader(files, dir, zip.name)

      return { localPath: tmpFolder, uploadedPath }
    }

    return { localPath: tmpFolder }
  }

const createUploader = (input: ICreateUploaderInput): Uploader => {
  const { s3, bucket, key: pathReceived } = input
  const pathToExtract = pathReceived ?? ''

  const uploader = async (files: File[], dir: string, zipName: string) => {
    for await (const file of files) {
      const filePath = file.path.replace(dir, '')

      const contentType = mime.lookup(filePath) || 'application/octet-stream'

      const uploadPath = path.join(pathToExtract, zipName, filePath)

      const newUpload = new Upload({
        client: s3,
        params: {
          Bucket: bucket,
          Key: uploadPath,
          Body: file.data,
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
  getZipFile,
  createDecompressor,
  createUploader
}

export {
  s3
}
