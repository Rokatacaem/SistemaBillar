const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

let BACKUP_DIR; // Initialized in init()

const DB_USER = process.env.DB_USER;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_NAME = process.env.DB_NAME;
// PGPASSWORD is handled via env var in exec command or process.env

// Detect Cloud Drive Paths
function getCloudPaths() {
    const homeDir = os.homedir();
    const candidates = [
        path.join(homeDir, 'OneDrive'),
        path.join(homeDir, 'Google Drive'),
        path.join(homeDir, 'GoogleDrive'), // Sometimes no space?
    ];

    // Check registry or env vars ideally, but checking folder existence is a quick first pass
    return candidates.filter(p => fs.existsSync(p));
}

function performBackup() {
    if (!BACKUP_DIR) {
        console.error('[BACKUP] Backup directory not initialized.');
        return;
    }

    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${DB_NAME}_${timestamp}.sql`;
    const filePath = path.join(BACKUP_DIR, fileName);

    console.log(`[BACKUP] Starting backup for ${DB_NAME}...`);

    // Assuming pg_dump is in PATH. If not, might need full path or bundled binary.
    // For Dev/QA environment, we assume installed Postgres bin is in PATH.
    const cmd = `pg_dump -U ${DB_USER} -h ${DB_HOST} -p ${DB_PORT} -F c -b -v -f "${filePath}" ${DB_NAME}`;

    const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD };

    exec(cmd, { env }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[BACKUP] Error: ${error.message}`);
            return;
        }

        console.log(`[BACKUP] Backup created at: ${filePath}`);

        // Sync to Cloud
        const cloudPaths = getCloudPaths();
        if (cloudPaths.length > 0) {
            cloudPaths.forEach(cloudDir => {
                const cloudDest = path.join(cloudDir, 'SMCBS_Backups');
                if (!fs.existsSync(cloudDest)) {
                    try { fs.mkdirSync(cloudDest, { recursive: true }); } catch (e) { console.error('Error creating cloud dir', e); return; }
                }
                const destPath = path.join(cloudDest, fileName);
                try {
                    fs.copyFileSync(filePath, destPath);
                    console.log(`[BACKUP] Synced to: ${destPath}`);
                } catch (err) {
                    console.error(`[BACKUP] Failed to sync to ${cloudDest}:`, err);
                }
            });
        } else {
            console.warn('[BACKUP] No Cloud Drive (OneDrive/Google Drive) detected.');
        }
    });
}

function initdoc(electronApp) {
    global.app = electronApp; // Hacky access to app if needed, or pass path

    // Initialize BACKUP_DIR here where we have the app instance
    BACKUP_DIR = path.join(electronApp.getPath('userData'), 'backups');

    // Schedule: Daily at 4:00 AM
    cron.schedule('0 4 * * *', () => {
        performBackup();
    });

    // Also run one on startup for testing (optional, or maybe triggered via UI)
    // setTimeout(performBackup, 10000); // Test after 10s
    console.log('[BACKUP] Service Initialized. Schedule: 0 4 * * *');
}

module.exports = { init: initdoc, performBackup };
