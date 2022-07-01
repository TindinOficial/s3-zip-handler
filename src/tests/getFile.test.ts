import { s3 } from '../s3'
import AWS from 'aws-sdk'
import { CentralDirectory, Open } from 'unzipper'

describe('unit: get file from s3 bucket', () => {
  it('should reject when provided key, bucket or s3 client provided is invalid', async () => {
    jest.spyOn(Open, 's3').mockReturnValueOnce(Promise.resolve(null as unknown as CentralDirectory))

    try {
      await s3.getFile({ bucket: 'valid_bucket', key: 'valid_key', s3: {} as AWS.S3 })
    } catch (err) {
      expect(err).toBeDefined()
      expect(err.message).toBe('Bucker or key does not exists')
    }
  })

  it('should reject when key provided is not .zip extension', async () => {
    const unzipperOpenResponse = {}
    jest.spyOn(Open, 's3').mockReturnValueOnce(Promise.resolve(unzipperOpenResponse as CentralDirectory))

    try {
      await s3.getFile({ bucket: 'valid_bucket', key: 'valid_key', s3: {} as AWS.S3 })
    } catch (err) {
      expect(err).toBeDefined()
      expect(err.message).toBe('File must be .zip')
    }
  })

  it('should resolve and return correct data when all data provided is correct', async () => {
    const unzipperOpenResponse = {}
    jest.spyOn(Open, 's3').mockReturnValueOnce(Promise.resolve(unzipperOpenResponse as CentralDirectory))

    const result = await s3.getFile({ bucket: 'valid_bucket', key: 'valid_key.zip', s3: {} as AWS.S3 })

    const expectedResult = { s3dirPath: '.', s3file: {}, zipName: 'valid_key' }
    expect(result).toEqual(expectedResult)
  })
})
