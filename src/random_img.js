
document.getElementById('randomBtn').addEventListener('click', function() {
    AWS.config.credentials.get(function(err) {
        if (err) {
            alert("Error: " + err);
            return;
        }
        uploadImages();
    });
});

async function uploadImages() {

    const numImages = 10;

    const overlay = document.getElementById('overlay');
    const statusText = document.getElementById('statusText');
    overlay.classList.remove('hidden');

    const s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        params: { Bucket: 'gaillery-img-bucket1' }
    });

    for (let i = 0; i < numImages; i++) {
        try {
            statusText.textContent = `Downloading file ${i + 1} of ${numImages}: random_image_${Date.now()}_${i}.jpg`;
            const response = await fetch(`https://picsum.photos/224/224`);
            const blob = await response.blob();

            const params = {
                Bucket: 'gaillery-img-bucket1',
                Key: `random_image_${Date.now()}_${i+1}.jpg`,
                Body: blob,
            };

            statusText.textContent = `Uploading file ${i + 1} of ${numImages}: ${params.Key}`;
            await new Promise((resolve, reject) => {
                s3.upload(params, function(err, data) {
                    if (err) {
                        console.error("Error", err);
                        reject(err);
                    } else {
                        // console.log("Upload Success", data.Location);
                        resolve(data);
                    }
                });
            });
        } catch (error) {
            console.error("Failed to fetch or upload image", error);
        }
    }

    statusText.textContent = `Finishing...`;
    await sleep(2000);
    overlay.classList.add('hidden');
    statusText.textContent = '';
    location.reload();
}
