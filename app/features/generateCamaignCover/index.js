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
    const width = 1200;
    const height = 630;
    const backgroundColor = '#3a0ca3';
    const textColor = '#ffffff';
    const fontFamily = 'Arial';

    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    context.fillStyle = textColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    let fontSize = 100;
    context.font = `${fontSize}px ${fontFamily}`;
    let textWidth = context.measureText(campaignTitle).width;
    while (textWidth > width - 100) { // 50px padding on each side
        fontSize -= 5;
        context.font = `${fontSize}px ${fontFamily}`;
        textWidth = context.measureText(campaignTitle).width;
    }

    context.fillText(campaignTitle, width / 2, height / 2);

    const imageBuffer = canvas.toBuffer('image/png');

    const fileName = `covers/${campaignId}.png`;
    console.log(`Uploading campaign cover to ${fileName}...`);
    const result = await uploadFileToMinio(imageBuffer, fileName, 'image/png');

    return result;
}

module.exports = { generateCampaignCover };
