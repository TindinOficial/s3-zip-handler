import { S3 } from "aws-sdk"
import { CentralDirectory, Open } from "unzipper"
import * as fs from "fs";
import * as path from "path";

const getFile = async({ bucket, key, s3}: { bucket: string, key: string, s3: S3 }) =>{

    const s3File = await Open.s3(s3, { Bucket: bucket, Key: key })
    
    const fileExtensionPath = key.split('/')

    console.log(fileExtensionPath)

    const fileWithExtension = fileExtensionPath[fileExtensionPath.length - 1]
    console.log({fileWithExtension})

    const fileSplitPath = fileWithExtension.split('.')
    const possibleExtensions = ['zip', 'gzip', '7zip']
    const fileExtension = fileSplitPath[fileSplitPath.length - 1]

    if(!possibleExtensions.some(ext => ext === fileExtension)){
        return { success: false }
    }

    const [file] = fileSplitPath
    console.log({file, s3File: s3File})

    return { fileName: file, file: s3File }
}

const decompression = async (file: CentralDirectory, pathToExtract: string, s3: S3, bucket: string) => {
  await file.extract({ path: pathToExtract })

  fs.accessSync(pathToExtract)

  const dir = fs.opendirSync(pathToExtract)

  for await (const file of dir) {
    const read = fs.createReadStream(path.join(pathToExtract, file.name))
    await s3.upload({ Key: path.join(pathToExtract, file.name), Bucket: bucket, Body: read }).promise()
  }
}

const s3 = {
    getFile
}


export {
    s3
}
