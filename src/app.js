AWS.config.region = 'eu-west-3';

AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'eu-west-3:0f35e230-b769-43ed-bc1a-58e403f58c4d'
});

const s3 = new AWS.S3();
const bucketName = 'gaillery-img-bucket1';
Dropzone.autoDiscover = false;

let dz;

document.getElementById('uploadBtn').addEventListener('click', function() {
    document.getElementById('dropzoneOverlay').style.display = 'flex';
});

document.getElementById('dropzoneOverlay').addEventListener('click', function(event) {
    if (event.target.id === 'dropzoneOverlay') {
        // document.getElementById('dropzoneOverlay').style.display = 'none';
        location.reload();
        if (dz) {
            dz.removeAllFiles(true);
        }
    }
});

document.getElementById('closeDropzone').addEventListener('click', function() {
    location.reload();
    if (dz) {
        dz.removeAllFiles(true);
    }
});

dz = new Dropzone("#uploadForm", {
    autoProcessQueue: false,
    acceptedFiles: 'image/*',
    init: function() {
        const dzInstance = this;

        dzInstance.on("addedfile", function(file) {
            const params = {
                Bucket: bucketName,
                Key: file.name,
                Body: file
            };

            AWS.config.credentials.refresh(error => {
                if (error) {
                    console.error('Error refreshing credentials:', error);
                    dzInstance.emit("error", file, error.message);
                    dzInstance.emit("complete", file);
                } else {
                    s3.upload(params, function(err, data) {
                        if (err) {
                            console.error('Error uploading file:', err);
                            dzInstance.emit("error", file, err.message);
                            dzInstance.emit("complete", file);
                        } else {
                            console.log('Successfully uploaded file.', data);
                            dzInstance.emit("success", file, data);
                            dzInstance.emit("complete", file);
                            // loadGallery();
                        }
                    });
                }
            });
        });
    }
});

function fetchTags(key, callback) {
    const docClient = new AWS.DynamoDB.DocumentClient();
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
                        tag.textContent = `${label.Description.S}: ${label.Probability.S}`;
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