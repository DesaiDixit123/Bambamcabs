const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const S3Sizer = require('aws-s3-size');
var path = require('path');
const credentials = {
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_IAM_ACCESS_KEY,
        secretAccessKey: process.env.AWS_IAM_ACCESS_SECRET
    }
};
const client = new S3Client(credentials);
const allowedContentTypes = require("./content-types");
const bucket = process.env.AWS_BUCKET_NAME;
const getBlobName = (originalName) => {
    const identifier = Math.random().toString().replace(/0\./, '');
    return `${identifier}-${originalName}`;
};
const setBlobName = (fName, extn) => {
    const identifier = Math.random().toString().replace(/0\./, '');
    return `${fName}/${fName}-${identifier}.${extn}`;
};
async function saveToS3Multipart(buffer, parentfolder, contentType, sendorreceive) {
    let promise = new Promise(function (resolve, reject) {
        let newContentType = contentType.split(";");
        let blobName = "";
        allowedContentTypes.allowedContentTypes.some((element, index) => {
            if (element.mimeType == newContentType[0]) {
                blobName = parentfolder + '/' + sendorreceive + '/' + setBlobName(element.fName, element.extn);
            }
        });
        const Bucket = bucket;
        const Key = blobName;
        const Body = buffer;
        const target = { Bucket, Key, Body };
        if (blobName != "") {
            try {
                const parallelUploads3 = new Upload({
                    client: client,
                    queueSize: 4,
                    partSize: 1024 * 1024 * 5,
                    leavePartsOnError: false,
                    params: target,
                });
                parallelUploads3.on("httpUploadProgress", (progress) => { });
                parallelUploads3.done().then((response) => {
                    resolve({ msg: 'file uploaded successfully', data: response });
                }).catch((error) => {
                    reject(new Error({ msg: 'An error occurred while completing the multipart upload' }));
                });
            } catch (error) {
                reject(new Error({ msg: 'An error occurred while completing the multipart upload' }));
            }
        } else {
            reject(new Error({ msg: 'Invalid file name to upload file on cloud' }));
        }
    });
    return promise;
};
async function saveToS3(buffer, parentfolder, contentType, sendorreceive) {
    let promise = new Promise(function (resolve, reject) {
        let newContentType = contentType.split(";");
        let blobName = "";
        allowedContentTypes.allowedContentTypes.some((element, index) => {
            if (element.mimeType == newContentType[0]) {
                blobName = parentfolder + '/' + sendorreceive + '/' + setBlobName(element.fName, element.extn);
            }
        });
        if (blobName != "") {
            var putParams = {
                Bucket: bucket,
                Key: blobName,
                Body: buffer,
                ContentType: contentType
            };
            const command = new PutObjectCommand(putParams);
            client.send(command).then((data) => {
                if (data && data.$metadata && data.$metadata.httpStatusCode && data.$metadata.httpStatusCode == 200) {
                    let data = { Key: blobName };
                    resolve({ msg: 'file uploaded successfully', data });
                } else {
                    reject(new Error({ msg: 'An error occurred while completing the upload' }));
                }
            }).catch((error) => {
                reject(new Error({ msg: 'An error occurred while completing the upload' }));
            });
        } else {
            reject(new Error({ msg: 'Invalid file name to upload file on cloud' }));
        }
    });
    return promise;
};
async function saveToS3withFileName(buffer, parentfolder, contentType, filename) {
    let promise = new Promise(function (resolve, reject) {
        let newContentType = contentType.split(";");
        let blobName = "";
        allowedContentTypes.allowedContentTypes.some((element, index) => {
            if (element.mimeType == newContentType[0]) {
                blobName = parentfolder + '/' + filename + '/' + setBlobName(element.fName, element.extn);
            }
        });
        const Bucket = bucket;
        const Key = blobName;
        const Body = buffer;
        const target = { Bucket, Key, Body };
        if (blobName != "") {
            try {
                const parallelUploads3 = new Upload({
                    client: client,
                    queueSize: 4,
                    partSize: 1024 * 1024 * 5,
                    leavePartsOnError: false,
                    params: target,
                });
                parallelUploads3.on("httpUploadProgress", (progress) => { });
                parallelUploads3.done().then((response) => {
                    let data = { Key: blobName };
                    resolve({ msg: 'file uploaded successfully', data });
                }).catch((error) => {
                    reject(new Error({ msg: 'An error occurred while completing the multipart upload' }));
                });
            } catch (error) {
                reject(new Error({ msg: 'An error occurred while completing the multipart upload' }));
            }
        } else {
            reject(new Error({ msg: 'Invalid file name to upload file on cloud' }));
        }
    });
    return promise;
};
async function deleteFromS3(fileKey) {
    let promise = new Promise(function (resolve, reject) {
        var params = {
            Bucket: bucket,
            Key: fileKey
        };
        const command = new DeleteObjectCommand(params);
        client.send(command).then((response) => {
            resolve({ msg: 'file deleted successfully', data: response });
        }).catch((error) => {
            reject(new Error({ msg: 'An error occurred while deleting the file' }));
        });
    });
    return promise;
};
async function getMyFolderSize(folder) {
    let promise = new Promise(function (resolve, reject) {
        var configFile = path.join(__dirname, '/awsconfig.json');
        const s3Sizer = new S3Sizer({ configFile: configFile });
        s3Sizer.getFolderSize(bucket, folder, function (err, size) {
            if (err) {
                console.log('err ->', err);
                reject(new Error({ msg: 'An error occurred while fetching the folder-size' }));
            } else {
                if (size && !isNaN(size) && parseFloat(size) > 0) {
                    let sizeinmb = parseFloat(parseFloat(size) / 1048576).toFixed(2);
                    let sizeingb = parseFloat(parseFloat(size) / 1073741824).toFixed(2);
                    resolve({ msg: 'your folder size is', foldersizeinmb: sizeinmb, foldersizeingb: sizeingb, folder: folder });
                } else {
                    let sizeinmb = parseFloat(parseFloat(size) / 1048576).toFixed(2);
                    let sizeingb = parseFloat(parseFloat(size) / 1073741824).toFixed(2);
                    if (parseFloat(size) > 0) {
                        resolve({ msg: 'your folder size is', foldersizeinmb: sizeinmb, foldersizeingb: sizeingb, folder: folder });
                    } else {
                        resolve({ msg: 'your folder size is', foldersizeinmb: '0', foldersizeingb: '0', folder: folder });
                    }
                }
            }
        });
    });
    return promise;
};
module.exports = { saveToS3Multipart, saveToS3, saveToS3withFileName, deleteFromS3, getMyFolderSize };