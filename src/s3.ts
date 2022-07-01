import { S3 } from "aws-sdk"
import { CentralDirectory, Open } from "unzipper"
import * as fs from "fs"
import * as path from "path"
import os from 'node:os'

const getFile = async({ bucket, key, s3}: { bucket: string, key: string, s3: S3 }) =>{

    const s3File = await Open.s3(s3, { Bucket: bucket, Key: key })

    if(!s3File){
      throw new Error('Bucker or key does not exists')
    }
    
    const fileExtensionPath = key.split('/')


    const fileWithExtension = fileExtensionPath[fileExtensionPath.length - 1]
    
    const fileSplitPath = fileWithExtension.split('.')
    const possibleExtensions = ['zip', 'gzip', '7zip']
    const fileExtension = fileSplitPath[fileSplitPath.length - 1]

    if(!possibleExtensions.some(ext => ext === fileExtension)){
        throw new Error('File must be .zip')
    }

    const [file] = fileSplitPath
    

    const fileToBeFolder = key.split('.')[0]

    return { fileName: fileToBeFolder, file: s3File, fileZip: file}
}

const decompression = async (file: CentralDirectory, pathToExtract: string, s3: S3, bucket: string, fileZip: string) => {

  const tmpPath = fs.mkdtempSync(path.join(os.tmpdir(), 'foo-'))
  await file.extract({ path: tmpPath })

  const tmpFolder = path.join(tmpPath, fileZip)
  fs.accessSync(tmpFolder)
  const dir = fs.opendirSync(tmpFolder)
  

  for await (const file of dir) {
    const fileCreated = path.join(tmpFolder, file.name)
    const read = fs.createReadStream(fileCreated)
    await s3.upload({ Key: path.join(pathToExtract, file.name), Bucket: bucket, Body: read }).promise()
  }

  fs.rmdirSync(tmpPath, {recursive: true, maxRetries: 5 })
}

const s3 = {
    getFile,
    decompression
}


export {
    s3
}
