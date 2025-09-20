// app/features/exampleFeature/index.js

// const pool = require('@db'); // Uncomment if database interaction is needed

/**
 * Normalizes an input string by converting it to lowercase and trimming whitespace.
 * This is a helper function for processData.
 *
 * @param {string} inputString - The string to normalize.
 * @returns {string|null} The normalized string, or null if input is invalid or empty.
 */
const normalizeString = (inputString) => {
    if (!inputString || typeof inputString !== 'string' || String(inputString).trim() === '') {
        return null;
    }
    return String(inputString).trim().toLowerCase();
};

/**
 * Processes a piece of data, potentially using helper functions.
 * This function simulates a piece of business logic that might be too complex
 * or too specific to reside directly in a route handler.
 *
 * @param {object} data - The data object to process.
 * @param {string} data.name - A name property to be normalized.
 * @param {number} data.value - A numeric value.
 * @returns {Promise<object|null>} An object with the processed data, or null if input is invalid.
 * @throws {Error} If a critical processing step fails (example).
 */
const processData = async (data) => {
    if (!data || typeof data !== 'object') {
        const err = new Error('Invalid data object provided.');
        // In a real feature, you might attach a statusCode or code for route error handling
        // err.statusCode = 400;
        // err.code = 'INVALID_FEATURE_INPUT';
        throw err; // Or return a specific error structure
    }

    const normalizedName = normalizeString(data.name);

    if (!normalizedName) {
        // Decide how to handle this: throw, or return a specific state
        return null; // Example: return null if name is essential and invalid
    }

    // Simulate some async operation or complex calculation
    // For example, if you needed to query the database:
    // try {
    //   const { rows } = await pool.query('SELECT ... WHERE name = $1', [normalizedName]);
    //   if (rows.length > 0) { ... }
    // } catch (dbError) {
    //   console.error('Error in exampleFeature during DB query:', dbError);
    //   throw dbError; // Re-throw to be handled by the caller (e.g., route handler)
    // }

    const processedValue = (data.value || 0) * 2; // Example processing

    return {
        originalName: data.name,
        normalizedName: normalizedName,
        calculatedValue: processedValue,
        processedAt: new Date().toISOString(),
    };
};

module.exports = {
    processData,
    normalizeString, // Exporting helper if it could be useful independently
};
