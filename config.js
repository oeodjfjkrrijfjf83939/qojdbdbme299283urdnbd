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
    fallbackFiles: ['example.json']
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DATA_FILES_CONFIG;
}

// Global UI Settings
// Set to true to show the Edit button for Admin/Main accounts, or false to hide it
window.ALLOW_ADMIN_EDIT = true;

// Set to true to allow standard user main folder accounts to edit/delete/migrate sub-folder profiles.
// Set to false to restrict them to read-only view of sub-folder profiles.
window.ALLOW_SUBFOLDER_MODIFICATIONS = false;

// Set to true to show the real decrypted password in the admin dashboard UI.
// Set to false to show the raw encrypted/hashed key stored in the database.
window.SHOW_REAL_PASSWORD = true;

// Encryption Secret Key for credentials database security (Reversible AES-GCM)
window.ENCRYPTION_SECRET = "MultiLynkQR-SecureKey-2026";
