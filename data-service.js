import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch, collectionGroup, query, where, getCountFromServer } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

class DataService {
    constructor() {
        this.useFirebase = true; // Default to trying Firebase first
    }

    // Helper functions to escape/unescape slashes in Firebase paths (Firestore document paths must have an even number of segments, so slashes in scope names are escaped to keep the structure flat)
    escapeScope(scope) {
        if (!scope) return '';
        return scope.replace(/\//g, '___');
    }

    unescapeScope(scope) {
        if (!scope) return '';
        return scope.replace(/___/g, '/');
    }

    getParentFolderOfScope(scope, userCode) {
        if (!scope) return '';
        const unescaped = this.unescapeScope(scope);
        const parts = unescaped.split('/');
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            if (userCode && lastPart === userCode) {
                return parts.slice(0, -1).join('/');
            }
        }
        return unescaped;
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
            const response = await fetch('./credentials/login_credentials.json?t=' + new Date().getTime());
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
                // To support nested scopes (e.g., "user1/user2") and parent folder reads (e.g. "user1" reads all subfolders),
                // we query all users via Collection Group and filter in memory by scope path structure.
                const q = collectionGroup(db, "users");
                console.log(`🔍 Fetching users from collection group (filter dataFile: ${dataFile})`);
                const querySnapshot = await getDocs(q);

                querySnapshot.forEach((doc) => {
                    const userData = doc.data();

                    // Retrieve parent scope from document path
                    let scope = '';
                    if (doc.ref && doc.ref.parent && doc.ref.parent.parent) {
                        scope = this.unescapeScope(doc.ref.parent.parent.id);
                    }

                    if (!userData.dataFile) {
                        userData.dataFile = scope;
                    } else {
                        // Ensure it matches unescaped scope
                        userData.dataFile = this.unescapeScope(userData.dataFile);
                    }

                    // Filtering rules:
                    // - If no dataFile specified (Super Admin), return all profiles.
                    // - Otherwise, return profiles that match the dataFile scope directly or as a sub-folder.
                    if (!dataFile || scope === dataFile || scope.startsWith(dataFile + "/")) {
                        users.push(userData);
                    }
                });

                console.log(`✅ Loaded ${users.length} users from Firebase (filtered)`);
                return users;

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
                const escapedScope = this.escapeScope(scope);
                // Path: profiles/{escapedScope}/users/{docId}
                const docRef = doc(db, "profiles", escapedScope, "users", docId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    console.log(`✅ Loaded user ${docId} from Firebase`);
                    const userData = docSnap.data();
                    userData.dataFile = this.unescapeScope(scope); // Normalize scope to unescaped form
                    return userData;
                }
            } catch (error) {
                console.warn("⚠️ Firebase user fetch failed:", error);
            }
        }
        return null;
    }

    // Get specific user by username and userCode across all scopes using a Cloud Index Collection lookup
    async getUserByCode(username, userCode) {
        if (this.useFirebase && username && userCode) {
            try {
                // 1. Fetch code mapping index directly from index collection (exactly 1 read)
                const codeRef = doc(db, "index", userCode);
                const codeSnap = await getDoc(codeRef);

                if (codeSnap.exists()) {
                    const indexData = codeSnap.data();
                    const scope = indexData.scope;
                    if (scope) {
                        // Try combo ID first
                        const fbUserCombo = await this.getUser(scope, username + '_' + userCode);
                        if (fbUserCombo && fbUserCombo.username === username && fbUserCombo.userCode === userCode) {
                            console.log(`✅ Loaded user ${username} (${userCode}) via cloud index collection (combo ID)`);
                            return fbUserCombo;
                        }
                        // Fallback to username ID
                        const fbUser = await this.getUser(scope, username);
                        if (fbUser && fbUser.userCode === userCode) {
                            console.log(`✅ Loaded user ${username} (${userCode}) via cloud index collection`);
                            return fbUser;
                        }
                        // Fallback to userCode ID
                        const fbUserCode = await this.getUser(scope, userCode);
                        if (fbUserCode && fbUserCode.username === username) {
                            console.log(`✅ Loaded user ${username} (${userCode}) via cloud index collection (userCode ID)`);
                            return fbUserCode;
                        }
                    }
                }

                // 2. Fallback: If not found in codes collection, try credentials folders loop lookup
                console.log(`🔍 UserCode ${userCode} not found in cloud codes index. Falling back to active folders lookup...`);
                const credentials = await this.getCredentials();
                const folders = [...new Set(credentials.map(c => c.dataFile).filter(Boolean))];

                for (const folder of folders) {
                    const scope = `${folder}/${userCode}`;
                    // Try the standard {username}_{userCode} format first
                    const fbUserCombo = await this.getUser(scope, username + '_' + userCode);
                    if (fbUserCombo && fbUserCombo.username === username && fbUserCombo.userCode === userCode) {
                        console.log(`✅ Loaded user ${username} (${userCode}) via folders loop lookup`);
                        // Auto-repair/populate the missing index mapping in codes collection
                        await setDoc(codeRef, { scope: scope }, { merge: true });
                        return fbUserCombo;
                    }

                    // Fallback to username only (older format)
                    const fbUser = await this.getUser(scope, username);
                    if (fbUser && fbUser.userCode === userCode) {
                        console.log(`✅ Loaded user ${username} (${userCode}) via folders loop lookup`);
                        await setDoc(codeRef, { scope: scope }, { merge: true });
                        return fbUser;
                    }
                }
            } catch (error) {
                console.warn("⚠️ Firebase query by username and userCode failed:", error);
            }
        }
        return null;
    }

    // Update User
    async updateUser(scope, docId, userData) {
        if (this.useFirebase && scope && docId) {
            try {
                // Ensure the unescaped scope name is explicitly stored in dataFile field
                userData.dataFile = this.unescapeScope(scope);
                userData.parentFolder = this.getParentFolderOfScope(userData.dataFile, userData.userCode);

                const escapedScope = this.escapeScope(scope);
                const docRef = doc(db, "profiles", escapedScope, "users", docId);
                await setDoc(docRef, userData, { merge: true });
                console.log(`✅ User ${docId} updated in Firebase`);

                // Also update/write the userCode index mapping under index collection
                if (userData.userCode) {
                    const codeRef = doc(db, "index", userData.userCode);
                    await setDoc(codeRef, { scope: userData.dataFile }, { merge: true });
                    console.log(`✅ Code index created: ${userData.userCode} -> ${userData.dataFile}`);
                }

                await this.updateProfileCountInFirestore(scope);
                return true;
            } catch (error) {
                console.error("❌ Failed to update user:", error);
                throw error;
            }
        }
        return false;
    }

    // Delete User
    async deleteUser(scope, username, userCode) {
        if (this.useFirebase && scope && username && userCode) {
            try {
                const escapedScope = this.escapeScope(scope);
                // Find the exact document to delete using both username and userCode to prevent incorrect deletion of new profiles
                const usersRef = collection(db, "profiles", escapedScope, "users");
                const q = query(usersRef, where("username", "==", username), where("userCode", "==", userCode));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const deletePromises = [];
                    querySnapshot.forEach((docSnap) => {
                        deletePromises.push(deleteDoc(docSnap.ref));
                    });
                    await Promise.all(deletePromises);
                    console.log(`🗑️ User ${username} (${userCode}) deleted from Firebase`);

                    // Also delete the index mapping under index collection only if it matches the scope of the deleted document
                    const codeRef = doc(db, "index", userCode);
                    try {
                        const codeSnap = await getDoc(codeRef);
                        if (codeSnap.exists()) {
                            const indexData = codeSnap.data();
                            const unescapedDeletedScope = this.unescapeScope(scope);
                            if (indexData && indexData.scope === unescapedDeletedScope) {
                                await deleteDoc(codeRef);
                                console.log(`🗑️ Code index deleted for userCode: ${userCode}`);
                            } else {
                                console.log(`ℹ️ Code index NOT deleted because its current scope (${indexData?.scope}) does not match the deleted scope (${unescapedDeletedScope})`);
                            }
                        }
                    } catch (indexErr) {
                        console.error(`⚠️ Failed to check/delete index mapping for userCode ${userCode}:`, indexErr);
                    }

                    await this.updateProfileCountInFirestore(scope);
                    return true;
                } else {
                    console.warn(`❌ No matching user found to delete: ${username} (${userCode}). Was it already deleted?`);
                    return false;
                }
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
                if (credentialData.dataFile) {
                    await this.updateProfileCountInFirestore(credentialData.dataFile);
                }
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
                const docSnap = await getDoc(docRef);
                const oldDataFile = docSnap.exists() ? docSnap.data().dataFile : null;

                await setDoc(docRef, updateData, { merge: true });
                console.log(`✅ Firebase: Updated credential for ${username}`);

                // Update profile count for the new dataFile scope
                if (updateData.dataFile) {
                    await this.updateProfileCountInFirestore(updateData.dataFile);
                } else if (oldDataFile) {
                    await this.updateProfileCountInFirestore(oldDataFile);
                }

                // If the dataFile changed, update the profile count for the old dataFile scope too!
                if (updateData.dataFile && oldDataFile && updateData.dataFile !== oldDataFile) {
                    await this.updateProfileCountInFirestore(oldDataFile);
                }

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

    // Helper to calculate and update real-time user profile count in credentials in Firestore
    async updateProfileCountInFirestore(scope) {
        if (!this.useFirebase || !scope) return;
        try {
            // Normalize the target scope parameter
            const targetParentFolder = this.getParentFolderOfScope(scope, scope.split('/').pop());

            // Retrieve count from Firestore server using getCountFromServer (extremely cheap and fast!)
            const q = query(collectionGroup(db, "users"), where("parentFolder", "==", targetParentFolder));
            const countSnapshot = await getCountFromServer(q);
            const count = countSnapshot.data().count;

            const credsCol = collection(db, "credentials");
            const qCreds = query(credsCol, where("dataFile", "==", targetParentFolder));
            const credsSnapshot = await getDocs(qCreds);

            for (const credDoc of credsSnapshot.docs) {
                await setDoc(credDoc.ref, { profileCount: count }, { merge: true });
                console.log(`📊 Firebase: Updated profileCount to ${count} for credential "${credDoc.id}" (parent scope: "${targetParentFolder}")`);
            }
        } catch (error) {
            console.error("❌ Firebase: Update profile count failed:", error);
        }
    }

    // Safely backfills parentFolder and normalized dataFile fields for all users in Firestore
    async backfillParentFolder() {
        if (!this.useFirebase) return;
        try {
            console.log("🔄 Starting backfill of parentFolder field for all user documents...");
            const q = collectionGroup(db, "users");
            const querySnapshot = await getDocs(q);

            let count = 0;
            const batchSize = 500;
            let batch = writeBatch(db);

            for (const docSnap of querySnapshot.docs) {
                const userData = docSnap.data();
                let docScope = userData.dataFile || '';
                if (!docScope && docSnap.ref && docSnap.ref.parent && docSnap.ref.parent.parent) {
                    docScope = this.unescapeScope(docSnap.ref.parent.parent.id);
                }

                const normalizedScope = this.unescapeScope(docScope);
                const parentFolder = this.getParentFolderOfScope(normalizedScope, userData.userCode);

                if (userData.parentFolder !== parentFolder || !userData.dataFile) {
                    const updates = {
                        parentFolder: parentFolder,
                        dataFile: normalizedScope
                    };
                    batch.set(docSnap.ref, updates, { merge: true });
                    count++;

                    if (count % batchSize === 0) {
                        await batch.commit();
                        batch = writeBatch(db);
                    }
                }
            }
            if (count % batchSize !== 0) {
                await batch.commit();
            }
            console.log(`✅ Backfilled parentFolder for ${count} user document(s).`);
        } catch (error) {
            console.error("❌ Failed to backfill parentFolder:", error);
        }
    }

    // Sync all profile counts for all credentials
    async syncAllProfileCounts() {
        if (!this.useFirebase) return;
        try {
            // Perform parentFolder backfill first to ensure count query matches documents correctly
            await this.backfillParentFolder();

            const querySnapshot = await getDocs(collection(db, "credentials"));
            for (const docSnap of querySnapshot.docs) {
                const cred = docSnap.data();
                if (cred.dataFile) {
                    await this.updateProfileCountInFirestore(cred.dataFile);
                }
            }
            console.log("✅ All credential profile counts backfilled successfully");
        } catch (error) {
            console.error("❌ Backfilling profile counts failed:", error);
        }
    }

    // Delete all user profiles for a scope (dataFile) and the scope doc itself
    async deleteScope(scope) {
        if (!this.useFirebase || !scope) return false;
        try {
            const escapedScope = this.escapeScope(scope);
            // 1. Get all user docs under profiles/{escapedScope}/users
            const usersCol = collection(db, "profiles", escapedScope, "users");
            const snapshot = await getDocs(usersCol);

            // 2. Delete in batches of 500 (Firestore limit)
            const batchSize = 500;
            let batch = writeBatch(db);
            let count = 0;

            for (const userDoc of snapshot.docs) {
                batch.delete(userDoc.ref);
                // Also delete their corresponding userCode index mapping under the index collection
                const userData = userDoc.data();
                if (userData && userData.userCode) {
                    const codeRef = doc(db, "index", userData.userCode);
                    batch.delete(codeRef);
                }
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

            // 3. Delete the parent scope doc (profiles/{escapedScope})
            await deleteDoc(doc(db, "profiles", escapedScope));
            console.log(`🗑️ Firebase: Deleted scope document "profiles/${escapedScope}"`);

            // Update profileCount for this scope in Firestore
            await this.updateProfileCountInFirestore(scope);

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
                const uniqueScopes = new Set();

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
                            uniqueScopes.add(scope);

                            console.log(`📂 Processing ${file} -> Scope: ${scope}`);

                            // Create the scope document (e.g. profiles/clients) just to exist? 
                            // Firestore auto-creates hierarchy for subcollections, but good practice to have the parent doc.
                            // We can set a dummy field or metadata on profiles/{scope}
                            const escapedScope = this.escapeScope(scope);
                            await setDoc(doc(db, "profiles", escapedScope), {
                                type: 'category',
                                name: scope
                            }, { merge: true });

                            for (const user of users) {
                                // Inject 'dataFile' property for consistency
                                if (!user.dataFile) {
                                    user.dataFile = scope;
                                } else {
                                    user.dataFile = this.unescapeScope(user.dataFile);
                                }
                                user.parentFolder = this.getParentFolderOfScope(user.dataFile, user.userCode);

                                // Use username or userCode as Key
                                const docId = user.username || user.userCode || 'unknown_' + Date.now();

                                // Path: profiles/{escapedScope}/users/{docId}
                                const docRef = doc(db, "profiles", escapedScope, "users", docId);

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

                // Update profileCount in Firestore for all processed unique scopes
                for (const scope of uniqueScopes) {
                    await this.updateProfileCountInFirestore(scope);
                }

                // Also run a full scan of all credentials in Firestore to make sure everything is completely up-to-date
                await this.syncAllProfileCounts();

                // Rebuild index collection in Firestore
                let indexInfo = "Cloud Index: Rebuilt successfully.";
                try {
                    const idxResult = await this.rebuildCloudIndex();
                    if (idxResult && idxResult.success) {
                        indexInfo = `Cloud Index: Created ${idxResult.created} new, Updated ${idxResult.updated}, Up-to-date ${idxResult.upToDate}${idxResult.failed ? `, Failed ${idxResult.failed}` : ''}.`;
                    }
                } catch (idxErr) {
                    console.error("⚠️ Failed to rebuild Firestore index during sync:", idxErr);
                    indexInfo = "Cloud Index: Failed to rebuild index.";
                }

                console.log(`✅ Profiles Sync: Added ${addedCount}, Skipped ${skippedCount}`);

                alert(`Sync Complete!\n\nCredentials: Added key updates.\nProfiles: Added ${addedCount} new, Skipped ${skippedCount} existing.\nStructure: profiles/{scope}/users\n${indexInfo}`);
            }
        } catch (e) {
            console.error("❌ Failed to sync profiles:", e);
            alert("Sync Failed. Check console for details.");
        }
    }

    // Rebuild the Firestore index collection by scanning all profile documents
    async rebuildCloudIndex() {
        if (!this.useFirebase) return { success: false, error: "Firebase not enabled" };
        console.log("🔄 Rebuilding cloud index mapping in Firestore...");
        try {
            // Fetch all users across all subcollections via Collection Group
            const q = collectionGroup(db, "users");
            const querySnapshot = await getDocs(q);

            let createdCount = 0;
            let updatedCount = 0;
            let upToDateCount = 0;
            let failedCount = 0;

            const batch = writeBatch(db);
            let hasOperations = false;

            // Fetch existing indexes from Firestore to avoid unnecessary writes
            const indexSnapshot = await getDocs(collection(db, "index"));
            const indexMap = {};
            indexSnapshot.forEach(docSnap => {
                indexMap[docSnap.id] = docSnap.data().scope;
            });

            querySnapshot.forEach(docSnap => {
                const userData = docSnap.data();
                const userCode = userData.userCode;

                // Get parent scope
                let scope = '';
                if (docSnap.ref && docSnap.ref.parent && docSnap.ref.parent.parent) {
                    scope = this.unescapeScope(docSnap.ref.parent.parent.id);
                }

                if (userCode && scope) {
                    const existingScope = indexMap[userCode];
                    const codeRef = doc(db, "index", userCode);

                    if (existingScope === undefined) {
                        // Missing - create it
                        batch.set(codeRef, { scope: scope }, { merge: true });
                        createdCount++;
                        hasOperations = true;
                    } else if (existingScope !== scope) {
                        // Incorrect scope - update it
                        batch.set(codeRef, { scope: scope }, { merge: true });
                        updatedCount++;
                        hasOperations = true;
                    } else {
                        // Up to date - do nothing
                        upToDateCount++;
                    }
                } else {
                    failedCount++;
                }
            });

            if (hasOperations) {
                await batch.commit();
            }
            console.log(`✅ Cloud index rebuild complete. Created: ${createdCount}, Updated: ${updatedCount}, Up-to-date: ${upToDateCount}, Failed: ${failedCount}`);
            return {
                success: true,
                created: createdCount,
                updated: updatedCount,
                upToDate: upToDateCount,
                failed: failedCount
            };
        } catch (error) {
            console.error("❌ Failed to rebuild cloud index:", error);
            throw error;
        }
    }
}

// Export and Attach to Window
const dataService = new DataService();
window.DataService = dataService;
export { dataService };
