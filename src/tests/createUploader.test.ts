import { Readable } from 'stream'
import fs, { Dir } from 'fs'
import path from 'path'
import os from 'os'
import { mockClient } from 'aws-sdk-client-mock'
import {
  S3Client, CreateMultipartUploadCommand, UploadPartCommand,
  CompleteMultipartUploadCommand, PutObjectCommand
} from '@aws-sdk/client-s3'
import { s3 } from '../s3'

const mockReadStream = (path?) => {
  const read = new Readable()
  read.push('mocked')
  read.push(null)
  read.on('data', (chunk) => { if (chunk) chunk.path = path })

  return read as unknown as fs.ReadStream
}

describe('unit: create uploader', () => {
  const AWS_S3_MOCK = mockClient(S3Client)
  const instantiateMockedS3Client = () => new S3Client({ region: 'any' })

  beforeEach(() => {
    AWS_S3_MOCK.on(CreateMultipartUploadCommand).resolves({ UploadId: '1' })
    AWS_S3_MOCK.on(UploadPartCommand).resolves({ ETag: '1' })
    AWS_S3_MOCK.on(PutObjectCommand).resolves({ ETag: '1' })
    AWS_S3_MOCK.on(CompleteMultipartUploadCommand).resolves({ ETag: '1' })
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it('should reject when createReadStream fails', async () => {
    const mockedS3 = instantiateMockedS3Client()

    jest.spyOn(fs, 'opendirSync').mockImplementationOnce(() =>
      [{ name: 'any_file.html', isDirectory: () => false },
        { name: 'any_file.css', isDirectory: () => false }] as unknown as Dir)

    jest.spyOn(path, 'join').mockImplementationOnce(() => 'any_valid_path/any_valid_file')
    jest.spyOn(fs, 'createReadStream').mockImplementationOnce(() => {
      throw new Error('createReadStream fails')
    })

    const uploader = await s3.createUploader({
      s3: mockedS3,
      bucket: 'any_bucket',
      key: 'some_path'
    })

    let errorFound: any

    try {
      await uploader('any_folder', 'any_zip')
    } catch (err) {
      errorFound = err
    }

    expect(errorFound).toBeDefined()
    expect(errorFound.message).toBe('createReadStream fails')
  })

  it('should reject when s3 upload fails', async () => {
    const mockedErrorMessage = 'Oops... something went wrong'

    jest.spyOn(fs, 'opendirSync').mockImplementationOnce(() =>
      [
        { name: 'any_file.html', isDirectory: () => false },
        { name: 'any_file.css', isDirectory: () => false }
      ] as unknown as Dir
    )

    jest.spyOn(path, 'join').mockImplementationOnce(() => 'any_valid_path/any_valid_file')

    jest.spyOn(fs, 'createReadStream').mockImplementationOnce(() => mockReadStream())

    AWS_S3_MOCK.on(PutObjectCommand).rejects({
      message: mockedErrorMessage
    })

    const uploader = s3.createUploader({
      s3: instantiateMockedS3Client(),
      bucket: 'any_bucket',
      key: 'some_path'
    })

    let errorFound: any

    try {
      await uploader('any_folder', 'any_zip')
    } catch (err) {
      errorFound = err
    }

    expect(errorFound).toBeDefined()
    expect(errorFound.message).toBe(mockedErrorMessage)
  })

  it('should resolve when all data provided is correct and validate recursive folder provided from zip file', async () => {
    const FILES_UPLOADED: any[] = []

    AWS_S3_MOCK.on(PutObjectCommand).callsFake((input) => {
      FILES_UPLOADED.push(input)
    })

    const tmpFolderProps = path.join(os.tmpdir(), 'valid-folder-')
    const tmpFolderPath = fs.mkdtempSync(tmpFolderProps)

    fs.mkdirSync(path.join(tmpFolderPath, 'folder_to_be_unzipped'))

    const tmpFilePath = path.join(tmpFolderPath, 'folder_to_be_unzipped', 'any_file.html')

    fs.writeFileSync(tmpFilePath, '')

    jest.spyOn(fs, 'createReadStream').mockImplementation((filePath) => mockReadStream(filePath))

    const bucket = 'any_bucket'
    const key = 'any_folder'

    const uploader = s3.createUploader({
      s3: instantiateMockedS3Client(),
      bucket,
      key
    })

    const zipName = 'any_zip'
    const createdS3Path = await uploader(tmpFolderPath, zipName)

    expect(createdS3Path).toBe(path.join(bucket, key, zipName))

    expect(FILES_UPLOADED.length).toBe(1)
    const [buffer] = FILES_UPLOADED

    expect(buffer.Body.path).toBe(tmpFilePath)

    fs.rmdirSync(tmpFolderPath, { recursive: true })
  })

  it('should resolve when all data provided is correct', async () => {
    const mockedS3 = instantiateMockedS3Client()

    jest.spyOn(fs, 'opendirSync').mockImplementationOnce(() =>
      [
        { name: 'any_file.html', isDirectory: () => false },
        { name: 'any_file.css', isDirectory: () => false }
      ] as unknown as Dir
    )

    jest.spyOn(path, 'join').mockImplementationOnce(() => 'any_valid_path/any_valid_file')
    jest.spyOn(fs, 'createReadStream').mockImplementation((filePath) => mockReadStream(filePath))

    const bucket = 'any_bucket'
    const key = 'any_folder'
    const uploader = await s3.createUploader({ s3: mockedS3, bucket, key })

    const zipName = 'any_zip'
    const createdS3Path = await uploader('any_folder', zipName)

    expect(createdS3Path).toBe(path.join(bucket, key, zipName))
  })
})
