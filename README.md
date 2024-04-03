# S3 zip handler

S3 zip handler

## What it does:

 extract a zip file provided from your AWS s3 bucket to any other place, either local or back to s3 bucket where will create a new folder with the name of the .zip file



## Basic usage: 

### 1. Start by declaring your S3 client:
#### [**We highly recommend aws-sdk-v3 usage: [read more]**](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html#welcome_whats_new_v3)

- **to AWS-SDK-V3 users it should be something like:**
```typescript
import s3ZipHandler from 's3-zip-handler'
import { S3Client } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
    ...your s3 settings
})
```

- **to AWS-SDK-V2 users it should be something like:**
```typescript
import s3ZipHandler from 's3-zip-handler'
import AWS from 'aws-sdk'

const s3Client = new AWS.S3({
    ...your s3 settings
})
```

### 2. After declaring your S3 Client use the following code to:

 - **Decompress back to the s3 folder:**
```typescript
const s3Config = {
    s3Client,
    bucket: 'your-s3-bucket',
    key: 'your-s3-key/your-zip-file.zip'
} 

const {localPath, uploadedPath } = await s3ZipHandler.decompressToKeyFolderS3(s3Config)

// localPath = 'os-tmp/unzipped-xxxx/your-zip-file'
// uploadedPath  = 'your-s3-bucket/your-s3-key/your-zip-file'
 
```

 - **Decompress to local folder:**
```typescript
const s3Config = {
    s3Client,
    bucket: 'your-s3-bucket',
    key: 'your-s3-key/your-zip-file.zip'
} 

const { localPath } = await s3ZipHandler.decompressLocal(s3Config, 'path-to-extract')

// localPath = 'path-to-extract/your-zip-file'
 
```