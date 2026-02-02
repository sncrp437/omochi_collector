// =============================================================================
// AI-Powered Smart Sort - Kimi K2 via Puter.js
// =============================================================================

/**
 * Sort/filter venue collections using AI based on user's occasion/mood
 * @param {string} query - User's query (e.g., "heavy dinner", "quick lunch near Shibuya")
 * @param {Array} venues - Array of venue objects with metadata
 * @returns {Promise<Array|null>} Ordered array of venue indices, or null on failure
 */
async function aiSortCollections(query, venues) {
    if (!query || !venues || venues.length === 0) return null;

    // Check if Puter.js is available
    if (typeof puter === 'undefined' || !puter.ai) {
        console.warn('Puter.js not available for AI sorting');
        return null;
    }

    // Build venue metadata for the prompt (only public info)
    var venueList = venues.map(function(v, i) {
        return {
            index: i,
            name: v.name || '',
            genre: v.genre || '',
            station: v.nearest_station || '',
            address: v.address || '',
            description: v.description || '',
            opening_time: v.opening_time || '',
            closing_time: v.closing_time || ''
        };
    });

    var systemPrompt = 'You are a restaurant recommendation assistant. ' +
        'Given a list of restaurants and a user query about what they are in the mood for, ' +
        'return ONLY a JSON array of indices of restaurants that match the query, ordered by relevance (most relevant first). ' +
        'Only include venues that genuinely match the query. Exclude venues that are clearly unrelated. ' +
        'If no venues match, return an empty array []. Do not include any explanation, just the JSON array. ' +
        'Example response: [2, 0]';

    var userPrompt = 'Restaurants:\n' + JSON.stringify(venueList, null, 2) +
        '\n\nUser wants: ' + query +
        '\n\nReturn ONLY a JSON array of indices of matching venues, ordered by relevance. Exclude non-matching venues:';

    try {
        var response = await puter.ai.chat(userPrompt, {
            model: 'moonshotai/kimi-k2',
            systemPrompt: systemPrompt
        });

        // Parse the response - extract JSON array
        var text = '';
        if (typeof response === 'string') {
            text = response;
        } else if (response && response.message && response.message.content) {
            text = response.message.content;
        } else if (response && typeof response.toString === 'function') {
            text = response.toString();
        }

        // Try to extract JSON array from response
        var match = text.match(/\[[\s\S]*?\]/);
        if (!match) return null;

        var indices = JSON.parse(match[0]);

        // Validate: must be array of numbers within range
        if (!Array.isArray(indices)) return null;
        var validIndices = indices.filter(function(idx) {
            return typeof idx === 'number' && idx >= 0 && idx < venues.length;
        });

        return validIndices;
    } catch (err) {
        console.error('AI sort error:', err);
        return null;
    }
}

/**
 * Check if AI sorting is available (Puter.js loaded)
 * @returns {boolean}
 */
function isAiSortAvailable() {
    return typeof puter !== 'undefined' && puter.ai && typeof puter.ai.chat === 'function';
}
