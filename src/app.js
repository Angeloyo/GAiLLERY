AWS.config.region = 'eu-west-3'; // Region

// Initialize the Amazon Cognito credentials provider
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'eu-west-3:0f35e230-b769-43ed-bc1a-58e403f58c4d' // Replace with your Identity Pool ID
});

const s3 = new AWS.S3();
const bucketName = 'gaillery-img-bucket1';
Dropzone.autoDiscover = false;

document.getElementById('uploadBtn').addEventListener('click', function() {
    document.getElementById('dropzoneOverlay').style.display = 'flex';
});

document.getElementById('dropzoneOverlay').addEventListener('click', function(event) {
    if (event.target.id === 'dropzoneOverlay') {
        document.getElementById('dropzoneOverlay').style.display = 'none';
    }
});

const uploadForm = new Dropzone("#uploadForm", {
    autoProcessQueue: false,
    acceptedFiles: 'image/*',
    init: function() {
        const dz = this;

        dz.on("addedfile", function(file) {
            const params = {
                Bucket: bucketName,
                Key: file.name,
                Body: file
            };

            AWS.config.credentials.refresh(error => {
                if (error) {
                    console.error('Error refreshing credentials:', error);
                    dz.emit("error", file, error.message);
                    dz.emit("complete", file);
                } else {
                    s3.upload(params, function(err, data) {
                        if (err) {
                            console.error('Error uploading file:', err);
                            dz.emit("error", file, err.message);
                            dz.emit("complete", file);
                        } else {
                            console.log('Successfully uploaded file.', data);
                            dz.emit("success", file, data);
                            dz.emit("complete", file);
                            // Refresh the gallery after upload
                            loadGallery();
                        }
                    });
                }
            });
        });
    }
});

// Load images from S3 and display in the gallery
function loadGallery() {
    const params = {
        Bucket: bucketName,
    };

    s3.listObjectsV2(params, function(err, data) {
        if (err) {
            console.error('Error listing objects:', err);
            return;
        }

        const gallery = document.getElementById('gallery');
        gallery.innerHTML = ''; 
        data.Contents.forEach(item => {
            const imageUrl = `https://${bucketName}.s3.${AWS.config.region}.amazonaws.com/${item.Key}`;
            const a = document.createElement('a');
            a.href = imageUrl;

            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'gallery-item';

            a.appendChild(img);
            gallery.appendChild(a);
        });

        // Initialize the gallery after images are loaded
        $("#gallery").justifiedGallery('norewind');
    });
}

$(document).ready(function() {
    $("#gallery").justifiedGallery({
        captions: false,
        rowHeight: 180,
        margins: 5
    }).on("jg.complete", function() {
        window.lightGallery(document.getElementById("gallery"), {
            autoplayFirstVideo: false,
            plugins: [],
            galleryId: "nature",
            licenseKey: '765AA57B-7AC54794-8B6C4E56-50182807',
            speed: 500,
            download: false
        });
    });
});

// Load gallery on page load
loadGallery();
