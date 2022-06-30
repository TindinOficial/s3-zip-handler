import { S3Client } from '@aws-sdk/client-s3'

const getFile = async({ bucket, key, s3}) =>{

    const s3File = await s3.getObject({ Bucket: bucket, Key: key })
    
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

const s3 = {
    getFile
}


export {
    s3
}