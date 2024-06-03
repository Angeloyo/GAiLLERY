const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

AWS.config.update({region: 'eu-west-3'});
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'eu-west-3:0f35e230-b769-43ed-bc1a-58e403f58c4d'
});

const s3 = new AWS.S3();
const bucketName = 'gaillery-img-bucket1';
const directoryPath = './images';

function uploadFileToS3(fileName, filePath) {
    const fileContent = fs.readFileSync(filePath);
    const params = {
        Bucket: bucketName,
        Key: `image_${Date.now()}_${fileName}`,
        Body: fileContent
    };
    return new Promise((resolve, reject) => {
        s3.upload(params, function(err, data) {
            if (err) {
                console.log("Error uploading file:", err);
                reject(err);
            } else {
                // console.log("Successfully uploaded file to:", data.Location);
                resolve(data);
            }
        });
    });
}

function uploadRandomImages(context, events, done) {
    fs.readdir(directoryPath, (err, files) => {

        if (err) {
            console.log("Unable to scan directory:", err);
            done(); 
            return;
        }
        const imageFiles = files.filter(file => file.endsWith('.jpg'));
        const numberOfImagesToUpload = Math.ceil(Math.random() * imageFiles.length);
        const selectedImages = imageFiles.sort(() => 0.5 - Math.random()).slice(0, 5);

        const uploadPromises = selectedImages.map(image => {
            const filePath = path.join(directoryPath, image);
            return uploadFileToS3(image, filePath);
        });

        Promise.all(uploadPromises).then(() => {
            // console.log('All images uploaded successfully.');
            done();
        }).catch(err => {
            console.error('Error uploading files:', err);
            done();
        });
    });
}

// Export the function for use with Artillery
module.exports = {
    uploadRandomImages
};

// Directly invoke if run from the command line
if (require.main === module) {
    uploadRandomImages({}, {}, () => console.log('Upload test completed.'));
}