// ==========================================
// CENTRALIZED CONFIGURATION
// ==========================================
// This is the SINGLE SOURCE OF TRUTH for all data files.
// We now use a generated index file to track all data files.

const DATA_FILES_CONFIG = {
    // The master index file containing all data file paths
    indexFile: './data/index.json',

    // Legacy support (optional, but good to keep structure)
    useIndex: true,

    // Fallback files if index cannot be loaded
    fallbackFiles: ['personal.json', 'clients.json', 'demo.json']
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DATA_FILES_CONFIG;
}
