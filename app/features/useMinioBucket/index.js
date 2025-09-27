require('dotenv').config();
const qrcode = require('qrcode');

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

/**
 * Generates a QR code, uploads it to MinIO, and returns the public URL.
 *
 * @param {string} textToEncode The text or URL you want to encode in the QR code.
 * @param {string} fileName The name for the QR code image file in the bucket (e.g., 'my-qr-code.png').
 * @returns {Promise<{url: string}>} A promise that resolves to an object with the public URL.
 */
async function generateAndUploadQRCode(textToEncode, fileName) {
  try {
    // 1. Generate the QR code image as a data buffer
    console.log(`Generating QR code for: ${textToEncode}`);
    const qrCodeBuffer = await qrcode.toBuffer(textToEncode, { width: 512 });

    // 2. Use our existing function to upload the buffer
    console.log(`Uploading QR code as ${fileName}...`);
    const result = await uploadFileToMinio(qrCodeBuffer, fileName, 'image/png');

    // 3. Return the result which contains the public URL
    return result;
  } catch (error) {
    console.error("❌ Error generating or uploading QR code:", error);
    throw error;
  }
}

/**
 * Generates a campaign join QR code, uploads it to MinIO, and returns the public URL.
 *
 * @param {string} activationCode The 6-digit activation code for the campaign.
 * @returns {Promise<{url: string}>} A promise that resolves to an object with the public URL.
 */
async function generateCampaignQRCode(activationCode) {
  // 1. Get BOT_USERNAME from .env
  const botUsername = process.env.BOT_USERNAME;
  if (!botUsername) {
    console.error("Missing BOT_USERNAME in .env file");
    throw new Error("Bot username environment variable not configured.");
  }

  // 2. Construct the deep link URL
  const joinUrl = `https://t.me/${botUsername}?start=join_${activationCode}`;

  // 3. Define the file name for the QR code in the bucket
  const fileName = `${activationCode}.png`;

  // 4. Use the existing function to generate and upload the QR code
  console.log(`Generating campaign QR code for activation code: ${activationCode}`);
  return generateAndUploadQRCode(joinUrl, fileName);
}


// Export both functions so you can use them in other files
module.exports = { uploadFileToMinio, generateAndUploadQRCode, generateCampaignQRCode };
