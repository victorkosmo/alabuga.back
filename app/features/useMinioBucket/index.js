require('dotenv').config();

/**
 * Uploads a file to your public MinIO bucket.
 * This is for "absolute idiots" - it's the simplest way.
 *
 * @param {Buffer} fileBuffer The raw data of the file (e.g., from req.file.buffer)
 * @param {string} originalName The name of the file you want it to have in the bucket
 * @param {string} mimeType The type of the file (e.g., 'image/png')
 */
async function uploadFileToMinio(fileBuffer, originalName, mimeType) {
  // 1. Get the URL and Bucket Name from your .env file
  const minioUrl = process.env.MINIO_PUBLIC_URL;
  const bucketName = process.env.MINIO_BUCKET_NAME;

  // Check if the variables are set, otherwise it won't work
  if (!minioUrl || !bucketName) {
    console.error("Missing MINIO_PUBLIC_URL or MINIO_BUCKET_NAME in .env file");
    throw new Error("MinIO environment variables not configured.");
  }

  // 2. Create the final destination URL
  // e.g., https://bucket-url/bucket-name/my-cool-image.png
  const destinationUrl = `${minioUrl}/${bucketName}/${originalName}`;

  try {
    // 3. Send the file data using a PUT request
    const response = await fetch(destinationUrl, {
      method: 'PUT',
      body: fileBuffer, // The actual file data
      headers: {
        'Content-Type': mimeType, // Tells MinIO what kind of file it is
      },
    });

    // 4. Check if it worked
    if (response.ok) {
      console.log(`✅ File uploaded successfully to: ${destinationUrl}`);
      // Return the public URL of the uploaded file
      return { url: destinationUrl };
    } else {
      // If something went wrong
      console.error("❌ Failed to upload file.", await response.text());
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }
  } catch (error) {
    console.error("❌ Error during file upload:", error);
    throw error; // Pass the error along
  }
}

// Export the function so you can use it in other files
module.exports = { uploadFileToMinio };