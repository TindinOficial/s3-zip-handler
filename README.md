# S3 zip handler

S3 zip handler



## What it does:

 extract a zip file provided from your AWS s3 bucket to any other place, either local or back to s3 bucket where will create a new folder with the name of the .zip file



## Basic usage: 
 #### - Back to s3:
```typescript
import s3ZipHandler from 's3-zip-handler'
import AWS from 'aws-sdk'

const s3Client = new AWS.S3({
    ...your s3 settings
})

const s3Config = {
    s3Client,
    bucket: 'your-s3-bucket',
    key: 'your-s3-key/your-zip-file.zip'
} 

const {localPath, uploadedPath } = await s3ZipHandler.decompressToKeyFolderS3(s3Config)

// localPath = 'os-tmp/unzipped-xxxx/your-zip-file'
// uploadedPath  = 'your-s3-bucket/your-s3-key/your-zip-file'
 
```

 #### - To local folder:
```typescript
import s3ZipHandler from 's3-zip-handler'
import AWS from 'aws-sdk'

const s3Client = new AWS.S3({
    ...your s3 settings
})

const s3Config = {
    s3Client,
    bucket: 'your-s3-bucket',
    key: 'your-s3-key/your-zip-file.zip'
} 

const { localPath } = await s3ZipHandler.decompressLocal(s3Config, 'path-to-extract')

// localPath = 'path-to-extract/your-zip-file'
 
```

