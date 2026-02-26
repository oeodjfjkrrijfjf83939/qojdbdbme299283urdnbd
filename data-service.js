import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch, collectionGroup } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

class DataService {
    constructor() {
        this.useFirebase = true; // Default to trying Firebase first
    }

    // --- Credentials ---

    async getCredentials() {
        let credentials = [];
        if (this.useFirebase) {
            try {
                const querySnapshot = await getDocs(collection(db, "credentials"));
                if (!querySnapshot.empty) {
                    querySnapshot.forEach((doc) => {
                        credentials.push(doc.data());
                    });
                    console.log("✅ Loaded credentials from Firebase");
                    return credentials;
                } else {
                    console.log("⚠️ No credentials in Firebase, falling back to local file");
                }
            } catch (error) {
                console.warn("⚠️ Firebase credentials fetch failed:", error);
            }
        }

        // Fallback to local
        try {
            const response = await fetch('./credentials/login_credentials.json');
            if (response.ok) {
                credentials = await response.json();
                console.log("✅ Loaded credentials from local file");
            }
        } catch (error) {
            console.error("❌ Failed to load credentials from local file:", error);
        }
        return credentials;
    }

    // --- User Profiles ---

    async getUsers(dataFile) {
        let users = [];

        // Structure: profiles (col) -> {dataFile} (doc) -> users (subcol) -> {userId} (doc)

        if (this.useFirebase) {
            try {
                let q;
                if (dataFile) {
                    // Fetch specific scope (e.g. 'personal', 'clients')
                    // Path: profiles/{dataFile}/users
                    q = collection(db, "profiles", dataFile, "users");
                    console.log(`🔍 Fetching from Firestore scope: ${dataFile}`);
                } else {
                    // Super Admin: Fetch ALL users from ALL scopes
                    // Use Collection Group Query 'users'
                    q = collectionGroup(db, "users");
                    console.log(`🔍 Fetching ALL users (Collection Group)`);
                }

                const querySnapshot = await getDocs(q);

                querySnapshot.forEach((doc) => {
                    const userData = doc.data();
                    // Inject scope for admin grouping
                    if (!userData.dataFile && doc.ref && doc.ref.parent && doc.ref.parent.parent) {
                        userData.dataFile = doc.ref.parent.parent.id;
                    }
                    users.push(userData);
                });

                if (users.length > 0) {
                    console.log(`✅ Loaded ${users.length} users from Firebase`);
                    return users;
                } else {
                    console.log("⚠️ No matching users in Firebase, falling back to local files");
                }

            } catch (error) {
                console.warn("⚠️ Firebase users fetch failed:", error);
            }
        }

        return null; // Fallback to local
    }

    // Get specific user by ID (for Edit page)
    async getUser(scope, docId) {
        if (this.useFirebase && scope && docId) {
            try {
                // Path: profiles/{scope}/users/{docId}
                const docRef = doc(db, "profiles", scope, "users", docId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    console.log(`✅ Loaded user ${docId} from Firebase`);
                    return docSnap.data();
                }
            } catch (error) {
                console.warn("⚠️ Firebase user fetch failed:", error);
            }
        }
        return null;
    }

    // Update User
    async updateUser(scope, docId, userData) {
        if (this.useFirebase && scope && docId) {
            try {
                const docRef = doc(db, "profiles", scope, "users", docId);
                await setDoc(docRef, userData, { merge: true });
                console.log(`✅ User ${docId} updated in Firebase`);
                return true;
            } catch (error) {
                console.error("❌ Failed to update user:", error);
                throw error;
            }
        }
        return false;
    }

    // Delete User
    async deleteUser(scope, docId) {
        if (this.useFirebase && scope && docId) {
            try {
                // Delete: profiles/{scope}/users/{docId}
                const docRef = doc(db, "profiles", scope, "users", docId);
                await deleteDoc(docRef);
                console.log(`🗑️ User ${docId} deleted from Firebase`);
                return true;
            } catch (error) {
                console.error("❌ Failed to delete user:", error);
                throw error;
            }
        }
        return false;
    }


    // Check if credential exists (username or dataFile)
    async checkCredentialUniqueness(username, dataFile) {
        const credentials = await this.getCredentials();

        const usernameExists = credentials.some(cred => cred.username.toLowerCase() === username.toLowerCase());
        const dataFileExists = credentials.some(cred => cred.dataFile && cred.dataFile.toLowerCase() === dataFile.toLowerCase());

        return { usernameExists, dataFileExists };
    }

    // Add new credential (Login Account)
    async addCredential(credentialData) {
        if (this.useFirebase) {
            try {
                // We use username as document ID for credentials for uniqueness and easy lookup
                const docRef = doc(db, "credentials", credentialData.username);
                await setDoc(docRef, credentialData);
                console.log(`✅ Firebase: Added credential for ${credentialData.username}`);
                return true;
            } catch (error) {
                console.error("❌ Firebase: Add credential failed:", error);
                throw error;
            }
        }
        console.warn("⚠️ Local: Cannot add credential to static JSON file.");
        return false;
    }


    // Update credential (e.g. toggle status)
    async updateCredential(username, updateData) {
        if (this.useFirebase) {
            try {
                // We assume username doc exists
                const docRef = doc(db, "credentials", username);
                await setDoc(docRef, updateData, { merge: true });
                console.log(`✅ Firebase: Updated credential for ${username}`);
                return true;
            } catch (error) {
                console.error("❌ Firebase: Update credential failed:", error);
                throw error;
            }
        }
        console.warn("⚠️ Local: Cannot update credential in static JSON file.");
        return false;
    }

    // Delete credential
    async deleteCredential(username) {
        if (this.useFirebase) {
            try {
                const docRef = doc(db, "credentials", username);
                await deleteDoc(docRef);
                console.log(`🗑️ Firebase: Deleted credential for ${username}`);
                return true;
            } catch (error) {
                console.error("❌ Firebase: Delete credential failed:", error);
                throw error;
            }
        }
        console.warn("⚠️ Local: Cannot delete credential from static JSON file.");
        return false;
    }

    // Delete all user profiles for a scope (dataFile) and the scope doc itself
    async deleteScope(scope) {
        if (!this.useFirebase || !scope) return false;
        try {
            // 1. Get all user docs under profiles/{scope}/users
            const usersCol = collection(db, "profiles", scope, "users");
            const snapshot = await getDocs(usersCol);

            // 2. Delete in batches of 500 (Firestore limit)
            const batchSize = 500;
            let batch = writeBatch(db);
            let count = 0;

            for (const userDoc of snapshot.docs) {
                batch.delete(userDoc.ref);
                count++;
                if (count % batchSize === 0) {
                    await batch.commit();
                    batch = writeBatch(db);
                }
            }
            if (count % batchSize !== 0) {
                await batch.commit();
            }

            console.log(`🗑️ Firebase: Deleted ${count} user(s) from scope "${scope}"`);

            // 3. Delete the parent scope doc (profiles/{scope})
            await deleteDoc(doc(db, "profiles", scope));
            console.log(`🗑️ Firebase: Deleted scope document "profiles/${scope}"`);

            return true;
        } catch (error) {
            console.error("❌ Firebase: Delete scope failed:", error);
            throw error;
        }
    }

    // --- Sync (Admin Only) ---

    async syncToFirebase() {
        console.log("🔄 Starting Safe Sync to Firebase (Add Missing Only) -> Subcollections...");

        // 1. Sync Credentials
        try {
            const credRes = await fetch('./credentials/login_credentials.json');
            if (credRes.ok) {
                const credentials = await credRes.json();
                let addedCount = 0;
                let skippedCount = 0;

                for (const cred of credentials) {
                    const docRef = doc(db, "credentials", cred.username);
                    const docSnap = await getDoc(docRef);

                    if (!docSnap.exists()) {
                        await setDoc(docRef, cred);
                        addedCount++;
                    } else {
                        skippedCount++;
                    }
                }
                console.log(`✅ Credentials Sync: Added ${addedCount}, Skipped ${skippedCount}`);
            }
        } catch (e) {
            console.error("❌ Failed to sync credentials:", e);
        }

        // 2. Sync Profiles
        try {
            const indexRes = await fetch('./data/index.json');
            if (indexRes.ok) {
                const index = await indexRes.json();
                const files = [...new Set(Object.values(index))];

                let addedCount = 0;
                let skippedCount = 0;

                for (const file of files) {
                    try {
                        const fileRes = await fetch(`./data/${file}`);
                        if (fileRes.ok) {
                            const users = await fileRes.json();

                            // Determine Scope from folder name in path
                            // e.g. "clients/clients-1.json" -> scope "clients"
                            // "personal/personal.json" -> scope "personal"
                            let scope = file.split('/')[0];
                            if (scope.endsWith('.json')) {
                                scope = scope.replace('.json', ''); // Fallback for root files
                            }

                            console.log(`📂 Processing ${file} -> Scope: ${scope}`);

                            // Create the scope document (e.g. profiles/clients) just to exist? 
                            // Firestore auto-creates hierarchy for subcollections, but good practice to have the parent doc.
                            // We can set a dummy field or metadata on profiles/{scope}
                            await setDoc(doc(db, "profiles", scope), {
                                type: 'category',
                                name: scope
                            }, { merge: true });

                            for (const user of users) {
                                // Inject 'dataFile' property for consistency
                                if (!user.dataFile) {
                                    user.dataFile = scope;
                                }

                                // Use username or userCode as Key
                                const docId = user.username || user.userCode || 'unknown_' + Date.now();

                                // Path: profiles/{scope}/users/{docId}
                                const docRef = doc(db, "profiles", scope, "users", docId);

                                // Check existence logic
                                const docSnap = await getDoc(docRef);
                                if (!docSnap.exists()) {
                                    await setDoc(docRef, user);
                                    addedCount++;
                                } else {
                                    skippedCount++;
                                }
                            }
                        }
                    } catch (err) {
                        console.error("Failed to load file for sync: " + file, err);
                    }
                }

                console.log(`✅ Profiles Sync: Added ${addedCount}, Skipped ${skippedCount}`);
                alert(`Sync Complete!\n\nCredentials: Added key updates.\nProfiles: Added ${addedCount} new, Skipped ${skippedCount} existing.\nStructure: profiles/{scope}/users`);
            }
        } catch (e) {
            console.error("❌ Failed to sync profiles:", e);
            alert("Sync Failed. Check console for details.");
        }
    }
}

// Export and Attach to Window
const dataService = new DataService();
window.DataService = dataService;
export { dataService };
