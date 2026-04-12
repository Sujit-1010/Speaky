const admin = require('firebase-admin');

let app;

function getFirebaseAdmin() {
    if (app) return admin;

    // Try service account JSON string
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saJson) {
        const creds = JSON.parse(saJson);
        app = admin.initializeApp({
            credential: admin.credential.cert(creds)
        });
        return admin;
    }

    // Fallback to individual env vars
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey && privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
        app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey
            })
        });
        return admin;
    }

    // Last resort: initialize with application default (may work on GCP)
    app = admin.apps.length ? admin.app() : admin.initializeApp();
    return admin;
}

module.exports = getFirebaseAdmin();
