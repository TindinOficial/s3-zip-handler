import S3 from "aws-sdk/clients/s3"
import { s3 } from "./src/s3"

const createUploader = (s3Settings: { s3: S3, bucket: string, path?: string }) => async (pathDir: string, zipName: string) => {
  const { s3, bucket, path: pathReceived } = s3Settings
  const pathToExtract = pathReceived ?? ''
  const dir = fs.opendirSync(pathDir)
  
  for await (const file of dir) {
    const fileCreated = path.join(pathDir, file.name)
    const read = fs.createReadStream(fileCreated)

    const uploadPath = path.join(pathToExtract, zipName, file.name)
    await s3.upload({ Key: uploadPath, Bucket: bucket, Body: read }).promise()
  }
}
