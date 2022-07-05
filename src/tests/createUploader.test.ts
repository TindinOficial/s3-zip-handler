import { s3 } from '@/src/s3'
import AWS from 'aws-sdk'
import fs, { Dir } from 'fs'
import path from 'path'
import S3 from 'aws-sdk/clients/s3'
import os from 'node:os'

jest.mock('aws-sdk')
const AWS_MOCK = jest.mocked(AWS, true)

describe('unit: create uploader', () => {
  afterAll(() => {
    jest.resetAllMocks()
  })
  it('should reject when createReadStream fails', async () => {
    AWS_MOCK.S3.mockImplementationOnce(() => ({
      upload: jest.fn().mockReturnThis(),
      promise: jest.fn()
    }) as unknown as S3)
    const mockedS3 = new AWS_MOCK.S3() as any

    jest.spyOn(fs, 'opendirSync').mockImplementationOnce(() =>
      [{ name: 'any_file.html', isDirectory: () => false },
        { name: 'any_file.css', isDirectory: () => false }] as unknown as Dir)

    jest.spyOn(path, 'join').mockImplementationOnce(() => 'any_valid_path/any_valid_file')
    jest.spyOn(fs, 'createReadStream').mockImplementationOnce(() => {
      throw new Error('createReadStream fails')
    })

    const uploader = await s3.createUploader({ s3: mockedS3, bucket: 'any_bucket', key: 'some_path' })
    try {
      await uploader('any_folder', 'any_zip')
    } catch (err) {
      expect(err).toBeDefined()
      expect(err.message).toBe('createReadStream fails')
    }
  })

  it('should reject when s3 upload fails', async () => {
    jest.spyOn(fs, 'opendirSync').mockImplementationOnce(() =>
      [{ name: 'any_file.html', isDirectory: () => false },
        { name: 'any_file.css', isDirectory: () => false }] as unknown as Dir)
    jest.spyOn(path, 'join').mockImplementationOnce(() => 'any_valid_path/any_valid_file')
    jest.spyOn(fs, 'createReadStream').mockImplementationOnce(() => ({ insideReadStream: true }) as unknown as fs.ReadStream)

    AWS_MOCK.S3.mockImplementationOnce(() => ({
      upload: jest.fn().mockReturnThis(),
      promise: jest.fn(() => {
        throw new Error('s3 upload fails')
      })
    }) as unknown as S3)
    const mockedS3 = new AWS_MOCK.S3() as any

    const uploader = await s3.createUploader({ s3: mockedS3, bucket: 'any_bucket', key: 'some_path' })
    try {
      await uploader('any_folder', 'any_zip')
    } catch (err) {
      expect(err.message).toBe('s3 upload fails')
    }
  })

  it('should resolve when all data provided is correct and validate recursive folder provided from zip file', async () => {
    const UPLOAD_BUFFER: any[] = []
    AWS_MOCK.S3.mockImplementationOnce(() => ({
      upload: jest.fn(({ Body, Bucket, Key }) => {
        UPLOAD_BUFFER.push({ Body, Bucket, Key })
        return { promise: jest.fn() }
      })

    }) as unknown as S3)
    const mockedS3 = new AWS_MOCK.S3() as any

    const tmpFolderProps = path.join(os.tmpdir(), 'valid-folder-')
    const tmpFolderPath = fs.mkdtempSync(tmpFolderProps)

    fs.mkdirSync(path.join(tmpFolderPath, 'folder_to_be_unzipped'))

    fs.writeFileSync(path.join(tmpFolderPath, 'folder_to_be_unzipped', 'my_file.html'), '')

    jest.spyOn(fs, 'createReadStream').mockImplementation((path) => ({ path }) as unknown as fs.ReadStream)

    const key = 'any_folder'
    const uploader = await s3.createUploader({ s3: mockedS3, bucket: 'any_bucket', key })

    const zipName = 'any_zip'
    const createdS3Path = await uploader(tmpFolderPath, zipName)

    expect(createdS3Path).toBe(path.join(key, zipName))
    expect(UPLOAD_BUFFER.length).toBe(1)
    const [buffer] = UPLOAD_BUFFER
    expect(buffer.Body.path).toBe(path.join(tmpFolderPath, 'folder_to_be_unzipped', 'my_file.html'))

    fs.rmdirSync(tmpFolderPath, { recursive: true })
  })

  it('should resolve when all data provided is correct', async () => {
    AWS_MOCK.S3.mockImplementationOnce(() => ({
      upload: jest.fn().mockReturnThis(),
      promise: jest.fn()
    }) as unknown as S3)
    const mockedS3 = new AWS_MOCK.S3() as any

    jest.spyOn(fs, 'opendirSync').mockImplementationOnce(() =>
      [{ name: 'any_file.html', isDirectory: () => false },
        { name: 'any_file.css', isDirectory: () => false }] as unknown as Dir)

    jest.spyOn(path, 'join').mockImplementationOnce(() => 'any_valid_path/any_valid_file')
    jest.spyOn(fs, 'createReadStream').mockImplementation(() => ({ insideReadStream: true }) as unknown as fs.ReadStream)

    const key = 'any_folder'
    const uploader = await s3.createUploader({ s3: mockedS3, bucket: 'any_bucket', key })

    const zipName = 'any_zip'
    const createdS3Path = await uploader('any_folder', zipName)

    expect(createdS3Path).toBe(path.join(key, zipName))
  })
})
