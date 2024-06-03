const AWS = require('aws-sdk');
const axios = require('axios');

AWS.config.region = 'eu-west-3';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'eu-west-3:0f35e230-b769-43ed-bc1a-58e403f58c4d'
});

const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

function fetchTags(key) {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: 'PhotoTags',
            Key: { 'PhotoID': key }
        };
        dynamoDB.get(params, function(err, data) {
            if (err) {
                console.error("Error fetching tags from DynamoDB:", err);
                reject(err);
            } else {
                resolve(data.Item);
            }
        });
    });
}

module.exports = {
  loadContent: function(context, events, done) {
      const params = {
          Bucket: 'gaillery-img-bucket1',
      };
      s3.listObjectsV2(params, async function(err, data) {
          if (err) {
              console.log(err, err.stack);
              done();
              return;
          }
          const operations = data.Contents.map(item => {
              const imageUrl = `https://${params.Bucket}.s3.${AWS.config.region}.amazonaws.com/${item.Key}`;

              const imageDownload = axios.get(imageUrl).catch(err => {
                  console.log(`Error downloading image ${item.Key}:`, err);
              });

              const tagsFetch = fetchTags(item.Key).catch(err => {
                  console.error("Error fetching tags from DynamoDB:", err);
              });

              return Promise.all([imageDownload, tagsFetch]);
          });

          Promise.all(operations).then(() => {
              done();
          }).catch(err => {
              console.error('Error processing operations:', err);
              done();
          });
      });
  }
};