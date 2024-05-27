AWS.config.region = 'eu-west-3';

AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'eu-west-3:0f35e230-b769-43ed-bc1a-58e403f58c4d'
});

const s3 = new AWS.S3();
const lambda = new AWS.Lambda();
const bucketName = 'gaillery-img-bucket1';
const docClient = new AWS.DynamoDB.DocumentClient();

document.getElementById('fileInput').addEventListener('change', function(event) {
    const files = event.target.files;
    if (files.length > 0) {
        uploadFiles(files);
    }
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadFiles(files) {
    const overlay = document.getElementById('overlay');
    const statusText = document.getElementById('statusText'); // Asegúrate de tener este elemento en tu HTML
    overlay.classList.remove('hidden'); // Mostrar el overlay con el loader

    for (let index = 0; index < files.length; index++) {
        const file = files[index];
        console.log(`Processing file ${index + 1} of ${files.length}: ${file.name}`);
        statusText.textContent = `Uploading file ${index + 1} of ${files.length}: ${file.name}`;
        // await sleep(1000);

        const params = {
            Bucket: bucketName,
            Key: file.name,
            Body: file
        };

        try {
            await AWS.config.credentials.getPromise();
            const data = await s3.upload(params).promise();
            // console.log('Successfully uploaded file.', data);
            statusText.textContent = `Launching Lambda function for ${file.name}...`;
            // await sleep(1000);
            
            await checkLambdaFunctionStatus(file.name);
            
        } catch (error) {
            console.error('Error uploading file or processing Lambda:', error);
            statusText.textContent = `Error processing ${file.name}: ${error.message}`;
        }
    }

    // await sleep(2000);
    overlay.classList.add('hidden'); 
    statusText.textContent = ''; 
    location.reload(); 

}

function checkLambdaFunctionStatus(fileName, callback) {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: 'PhotoTags',
        Key: {
            'PhotoID': fileName
        }
    };

    const intervalId = setInterval(async () => {
        try {
            const data = await docClient.get(params).promise();
            const status = data.Item ? data.Item.Status : 'Pending...';
            document.getElementById('statusText').textContent = `Status for ${fileName}: ${status}`;

            if (status === 'Done' || status === 'Error') {
                clearInterval(intervalId);
                resolve(status);
            }
            
        } catch (error) {
            clearInterval(intervalId);
            reject(error);
            console.error("Error fetching status from DynamoDB:", error);
            document.getElementById('statusText').textContent = `Failed to fetch status for ${fileName}: ${error.message}`;
        }
    }, 200);
}

function fetchTags(key, callback) {
    const params = {
        TableName: 'PhotoTags', // Asegúrate de que este es el nombre correcto de tu tabla
        Key: {
            'PhotoID': key
        }
    };

    docClient.get(params, function(err, data) {
        if (err) {
            console.error("Error fetching tags from DynamoDB:", err);
        } else {
            callback(data.Item);
        }
    });
}

// Load images from S3 and display in the gallery
function loadGallery(showLoader = true) {
    const loadingSpinnerWrapper = document.getElementById('loadingSpinnerWrapper');

    if (showLoader) {
        loadingSpinnerWrapper.style.display = 'flex';
    }

    const params = {
        Bucket: bucketName,
    };

    s3.listObjectsV2(params, function(err, data) {
        if (showLoader) {
            loadingSpinnerWrapper.style.display = 'none';
        }

        if (err) {
            console.error('Error listing objects:', err);
            return;
        }

        const gallery = document.getElementById('gallery');
        gallery.innerHTML = '';
        data.Contents.forEach(item => {
            const imageUrl = `https://${bucketName}.s3.${AWS.config.region}.amazonaws.com/${item.Key}`;
        
            const container = document.createElement('div');
            container.className = 'gallery-item-container relative';
        
            const a = document.createElement('a');
            a.href = imageUrl;
        
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'gallery-item ';
        
            a.appendChild(img);
            container.appendChild(a);
        
            const deleteIcon = document.createElement('div');
            deleteIcon.className = 'delete-icon absolute top-2 right-2 w-6 h-6 bg-red-600 text-white text-center rounded-full cursor-pointer flex items-center justify-center';
            deleteIcon.innerHTML = 'X';
            deleteIcon.onclick = function() {
                deleteImage(item.Key);
            };
        
            container.appendChild(deleteIcon);
        
            // Agregar tags bajo la imagen
            const tagContainer = document.createElement('div');
            tagContainer.className = 'tag-container absolute bottom-0 left-0 w-full text-white bg-black bg-opacity-50 hidden';
            container.appendChild(tagContainer);
        
            // Obtener y mostrar tags
            fetchTags(item.Key, function(tags) {
                if (tags && tags.Labels) {
                    tags.Labels.forEach(label => {
                        const tag = document.createElement('div');
                        // tag.className = 'p-2';
                        tag.textContent = `${label.Description}: ${label.Probability}`;
                        tagContainer.appendChild(tag);
                    });
                }
            });
        
            container.onmouseover = function() {
                tagContainer.style.display = 'block';
            };
            container.onmouseout = function() {
                tagContainer.style.display = 'none';
            };
        
            gallery.appendChild(container);
        });

        // Initialize the gallery after images are loaded
        $("#gallery").justifiedGallery({
            captions: false,
            rowHeight: 180,
            margins: 5
        }).on("jg.complete", function() {
            window.lightGallery(document.getElementById("gallery"), {
                selector: 'a',
                autoplayFirstVideo: false,
                plugins: [],
                galleryId: "nature",
                licenseKey: '765AA57B-7AC54794-8B6C4E56-50182807',
                speed: 500,
                download: false,
                mobileSettings: {
                    controls: true,
                    showCloseIcon: true,
                    rotate: false
                }
            });
        });
    });
}

// Function to delete an image from S3
function deleteImage(key) {
    const s3 = new AWS.S3();
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    
    // Parameters for deleting from S3
    const s3Params = {
        Bucket: bucketName,
        Key: key
    };

    // Delete the image from S3
    s3.deleteObject(s3Params, function(err, data) {
        if (err) {
            console.error('Error deleting image from S3:', err);
        } else {
            console.log('Successfully deleted image from S3:', data);
            
            // Parameters for deleting from DynamoDB
            const dynamoDBParams = {
                TableName: 'PhotoTags', // Change this to your DynamoDB table name
                Key: {
                    'PhotoID': key
                }
            };

            // Delete the corresponding tags from DynamoDB
            dynamoDB.delete(dynamoDBParams, function(err, data) {
                if (err) {
                    console.error('Error deleting tags from DynamoDB:', err);
                } else {
                    console.log('Successfully deleted tags from DynamoDB:', data);
                }
            });

            // Reload gallery without showing loader
            loadGallery(false);
        }
    });
}

$(document).ready(function() {
    // Load gallery on page load
    loadGallery();
});