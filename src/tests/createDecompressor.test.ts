import { s3 } from '../s3'
import { CentralDirectory } from 'unzipper'
import fs from 'fs'
import path from 'path'

describe('unit: decompress file', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })
  it('should reject when file to be extracted provided cant be extracted for any reason', async () => {
    jest.spyOn(fs, 'accessSync').mockImplementationOnce(() => {
      throw new Error()
    })
    const centralDirectory = {
      extract: () => { }
    } as unknown as CentralDirectory

    jest.spyOn(centralDirectory, 'extract').mockImplementationOnce(() => {
      throw new Error()
    })

    try {
      const decompress = s3.createDecompressor({ dir: 'any_dir' })
      await decompress(centralDirectory, 'any_dir')
    } catch (err) {
      expect(err).toBeDefined()
    }
  })

  it('should reject when user os has no permission to handle the tmp folder created', async () => {
    const centralDirectory = {
      extract: () => { }
    } as unknown as CentralDirectory

    jest.spyOn(centralDirectory, 'extract').mockReturnValueOnce(Promise.resolve())

    jest.spyOn(fs, 'accessSync').mockImplementationOnce(() => {
      throw new Error()
    })

    try {
      const decompress = s3.createDecompressor({ dir: 'any_dir' })
      await decompress(centralDirectory, 'any_dir')
    } catch (err) {
      expect(err).toBeDefined()
    }
  })
  it('should resolve and return localPath when all data provided and all os permissions are valid', async () => {
    const centralDirectory = {
      extract: () => { }
    } as unknown as CentralDirectory

    jest.spyOn(centralDirectory, 'extract').mockImplementationOnce(() => Promise.resolve({ file: { files: [{ path: 'ue' }] } }) as any)

    jest.spyOn(fs, 'accessSync').mockReturnValueOnce(undefined)

    jest.spyOn(path, 'join').mockReturnValue('any_dir_from_folder')

    const dir = 'tmp'
    const zipFilePath = 'any_dir_from_folder'

    const decompress = s3.createDecompressor({ dir })
    const { localPath } = await decompress(centralDirectory, zipFilePath)

    const expectedPath = path.join(dir, zipFilePath)
    expect(localPath).toBe(expectedPath)
  })
})
