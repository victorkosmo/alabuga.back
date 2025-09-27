const { createCanvas } = require('canvas');
const { uploadFileToMinio } = require('../useMinioBucket');

/**
 * Generates a simple cover image for a campaign and uploads it to MinIO.
 *
 * @param {string} campaignTitle The title of the campaign to display on the cover.
 * @param {string} campaignId The UUID of the campaign, used for the filename.
 * @returns {Promise<{url: string}>} A promise that resolves to an object with the public URL of the cover.
 */
async function generateCampaignCover(campaignTitle, campaignId) {
    // 1. Define image properties
    const width = 1200;
    const height = 630;
    const backgroundColor = '#3a0ca3'; // Dark purple
    const textColor = '#ffffff'; // White
    const fontFamily = 'Arial';

    // 2. Create canvas and context
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    // 3. Draw background
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    // 4. Prepare text
    context.fillStyle = textColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Adjust font size to fit title within image bounds
    let fontSize = 100;
    context.font = `${fontSize}px ${fontFamily}`;
    let textWidth = context.measureText(campaignTitle).width;
    while (textWidth > width - 100) { // 50px padding on each side
        fontSize -= 5;
        context.font = `${fontSize}px ${fontFamily}`;
        textWidth = context.measureText(campaignTitle).width;
    }

    // 5. Draw text in the center
    context.fillText(campaignTitle, width / 2, height / 2);

    // 6. Convert to buffer
    const imageBuffer = canvas.toBuffer('image/png');

    // 7. Define file name and upload to the 'covers' folder
    const fileName = `covers/${campaignId}.png`;
    console.log(`Uploading campaign cover to ${fileName}...`);
    const result = await uploadFileToMinio(imageBuffer, fileName, 'image/png');

    // 8. Return the result containing the public URL
    return result;
}

module.exports = { generateCampaignCover };
