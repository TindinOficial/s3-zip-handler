import { s3 } from '../s3'
import {
  S3Client, GetObjectCommand
} from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { Readable } from 'stream'
import fs from 'fs'
import { sdkStreamMixin } from '@smithy/util-stream'

const mockReadStream = (path?) => {
  const read = new Readable()
  read.push('mocked')
  read.push(null)
  read.on('data', (chunk) => { if (chunk) chunk.path = path })

  return read as unknown as fs.ReadStream
}

describe('unit: get file from s3 bucket', () => {
  const AWS_S3_MOCK = mockClient(S3Client)
  const instantiateMockedS3Client = () => new S3Client({ region: 'any' })

  beforeEach(() => {
    AWS_S3_MOCK.on(GetObjectCommand).resolves({ ETag: '1' })
  })

  it('should reject when provided key, bucket or s3 client provided is invalid', async () => {
    try {
      await s3.getZipFile({ bucket: 'valid_bucket', key: 'valid_key', s3: instantiateMockedS3Client() })
    } catch (err) {
      expect(err).toBeDefined()
      expect(err.message).toBe('Bucket or key does not exists')
    }
  })

  it('should reject when key provided is not .zip extension', async () => {
    AWS_S3_MOCK.on(GetObjectCommand).resolves({ Body: sdkStreamMixin(mockReadStream()) })

    try {
      await s3.getZipFile({ bucket: 'valid_bucket', key: 'valid_key', s3: instantiateMockedS3Client() })
    } catch (err) {
      expect(err).toBeDefined()
      expect(err.message).toBe('File must be .zip')
    }
  })

  it('should resolve and return correct data when all data provided is correct', async () => {
    const stream = sdkStreamMixin(mockReadStream())

    AWS_S3_MOCK.on(GetObjectCommand).resolves({ Body: stream })

    const result = await s3.getZipFile({ bucket: 'valid_bucket', key: 'valid_key.zip', s3: instantiateMockedS3Client() })

    expect(result).toEqual({
      zip: {
        name: 'valid_key',
        stream,
        extension: '.zip'
      }
    })
  })
})
