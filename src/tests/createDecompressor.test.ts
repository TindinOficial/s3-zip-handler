import { s3 } from '../s3'
import fs from 'fs'
import path from 'path'
import { Readable, Writable } from 'stream'

jest.mock('decompress')

const mockReadStream = (path?) => {
  const read = new Readable()
  read.push('mocked')
  read.push(null)
  read.on('data', (chunk) => { if (chunk) chunk.path = path })
  read.on('close', () => {})
  read.pipe = (d) => d

  return read as unknown as fs.ReadStream
}

const mockWritableStream = () => {
  const writable = new Writable()
  writable.end()
  return writable as unknown as fs.WriteStream
}

const DEFAULT_FILE_STREAM = { name: 'mockedFile', extension: '.any' }

const mockFileStream = ({ name, extension } = DEFAULT_FILE_STREAM) => {
  try {
    const mockedStream = mockReadStream()
    return {
      stream: mockedStream,
      name,
      extension
    }
  } catch (err) {
    throw new Error(err)
  }
}

describe('unit: decompress file', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should reject when user os has no permission to handle the tmp folder created', async () => {
    const mockedMessage = 'cannot access file'

    jest.spyOn(fs, 'createWriteStream').mockImplementationOnce(() => mockWritableStream())
    jest.spyOn(fs, 'unlinkSync').mockImplementationOnce(() => {})
    jest.spyOn(fs, 'accessSync').mockImplementationOnce(() => {
      throw new Error(mockedMessage)
    })

    const zipMocked = mockFileStream()

    let expectedError: any

    try {
      const decompressor = s3.createDecompressor({ dirToExtract: 'any_dir' })

      await decompressor(zipMocked)
    } catch (err) {
      expectedError = err.message
    }

    expect(expectedError).toBe(mockedMessage)
  })

  it('should resolve and return localPath when all data provided and all os permissions are valid', async () => {
    jest.spyOn(fs, 'createWriteStream').mockImplementationOnce(() => mockWritableStream())
    jest.spyOn(path, 'join').mockReturnValue('any_dir_from_folder')
    jest.spyOn(fs, 'accessSync').mockImplementationOnce(() => {})
    jest.spyOn(fs, 'unlinkSync').mockImplementationOnce(() => {})

    const dirToExtract = 'tmp'
    const zipFilePath = 'any_dir_from_folder'

    const decompressor = s3.createDecompressor({ dirToExtract })
    const zipMocked = mockFileStream({
      name: 'any_zip',
      extension: '.zip'
    })

    const { localPath } = await decompressor(zipMocked)

    const expectedPath = path.join(dirToExtract, zipFilePath)

    expect(localPath).toBe(expectedPath)
  })
})
