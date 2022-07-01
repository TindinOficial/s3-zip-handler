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

const decompression = (decompressionSettings: { dir: string, uploader?: (pathDir: string, zipName: string) => Promise<void> }) =>
  async (file: CentralDirectory, fileZip: string) => {
    const { dir, uploader } = decompressionSettings
    await file.extract({ path: dir })

    const tmpFolder = path.join(dir, fileZip)
    fs.accessSync(tmpFolder)

    if (uploader) {
      const uploadedPath = await uploader(tmpFolder, fileZip)
      return { localPath: tmpFolder, uploadedPath }
    }

    return { localPath: tmpFolder }
  }

const s3 = {
  getFile,
  decompression
}

export {
  s3
}
