import { db, auth, getSecondaryAuth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch, collectionGroup, query, where, getCountFromServer } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updatePassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";


class DataService {
    constructor() {
        this.useFirebase = true; // Default to trying Firebase first
    }

    async login(username, password) {
        if (!username || !password) throw new Error("Username and password are required");
        const normalizedUsername = username.toLowerCase().trim();
        
        // Sign in using Firebase Auth Email/Password
        const userCred = await signInWithEmailAndPassword(auth, normalizedUsername + '@multilynkqr.local', password);
        
        // Fetch credential details from Firestore
        const docRef = doc(db, "credentials", normalizedUsername);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            throw new Error("User credentials document not found in Firestore.");
        }
        
        const cred = docSnap.data();
        if (cred.isActive !== true) {
            await signOut(auth);
            throw new Error("Account is inactive. Please contact admin.");
        }
        
        if (cred.password) {
            cred.rawPassword = cred.password;
            cred.password = await this.decryptPassword(cred.password);
        }
        return cred;
    }

    async logout() {
        await signOut(auth);
        localStorage.clear();
    }


    // Checks if the second object's properties match the first object's properties (dirty check)
    isEquivalent(obj1, obj2) {
        if (!obj1 || !obj2) return obj1 === obj2;
        for (const key of Object.keys(obj2)) {
            const val1 = obj1[key];
            const val2 = obj2[key];
            if (typeof val2 === 'object' && val2 !== null && typeof val1 === 'object' && val1 !== null) {
                if (JSON.stringify(val1) !== JSON.stringify(val2)) return false;
            } else if (val1 !== val2) {
                return false;
            }
        }
        return true;
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
    async getCredential(username) {
        if (!username) return null;
        if (this.useFirebase) {
            try {
                const docRef = doc(db, "credentials", username);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const cred = docSnap.data();
                    if (cred.password) {
                        cred.rawPassword = cred.password;
                        cred.password = await this.decryptPassword(cred.password);
                    }
                    return cred;
                }
            } catch (error) {
                console.warn(`⚠️ Firebase credential fetch failed for ${username}:`, error);
            }
        }
        // Fallback to local
        const credentials = await this.getCredentials();
        return credentials.find(c => c.username === username) || null;
    }

    async getCredentials() {
        const userRole = localStorage.getItem('adminRole');
        if (userRole !== 'super_admin' && userRole !== 'main_admin') {
            console.warn("🚫 Security Block: getCredentials() called by unauthorized role:", userRole);
            return [];
        }

        let credentials = [];
        if (this.useFirebase) {
            try {
                const querySnapshot = await getDocs(collection(db, "credentials"));
                if (!querySnapshot.empty) {
                    const decryptPromises = [];
                    querySnapshot.forEach((docSnap) => {
                        const data = docSnap.data();
                        decryptPromises.push((async () => {
                            if (data.password) {
                                data.rawPassword = data.password;
                                data.password = await this.decryptPassword(data.password);
                            }
                            credentials.push(data);
                        })());
                    });
                    await Promise.all(decryptPromises);
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
                    userData.docId = doc.id;

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
    async updateUser(scope, docId, userData, skipCountUpdate = false) {
        if (this.useFirebase && scope && docId) {
            try {
                // Ensure the unescaped scope name is explicitly stored in dataFile field
                userData.dataFile = this.unescapeScope(scope);
                userData.parentFolder = this.getParentFolderOfScope(userData.dataFile, userData.userCode);

                const escapedScope = this.escapeScope(scope);

                // Ensure the parent category document exists in Firestore
                try {
                    await setDoc(doc(db, "profiles", escapedScope), {
                        type: 'category',
                        name: userData.dataFile
                    }, { merge: true });
                    console.log(`✅ Profiles category document created/updated: profiles/${escapedScope}`);
                } catch (catErr) {
                    console.warn(`⚠️ Warning: Failed to create/update parent category document profiles/${escapedScope} (this is expected if you are not an admin):`, catErr);
                }

                const docRef = doc(db, "profiles", escapedScope, "users", docId);
                await setDoc(docRef, userData, { merge: true });
                console.log(`✅ User ${docId} updated in Firebase`);

                // Also update/write the userCode index mapping under index collection
                if (userData.userCode) {
                    try {
                        const codeRef = doc(db, "index", userData.userCode);
                        await setDoc(codeRef, { scope: userData.dataFile }, { merge: true });
                        console.log(`✅ Code index created: ${userData.userCode} -> ${userData.dataFile}`);
                    } catch (indexErr) {
                        console.warn(`⚠️ Warning: Failed to create/update code index for userCode ${userData.userCode} (this is expected if you are not an admin):`, indexErr);
                    }
                }

                if (!skipCountUpdate) {
                    try {
                        await this.updateProfileCountInFirestore(scope);
                    } catch (countErr) {
                        console.warn(`⚠️ Warning: Failed to update profile count for scope ${scope} (this is expected if you are not an admin):`, countErr);
                    }
                }
                return true;
            } catch (error) {
                console.error("❌ Failed to update user:", error);
                throw error;
            }
        }
        return false;
    }

    // Delete User
    async deleteUser(scope, username, userCode, skipCountUpdate = false) {
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
                                // If the current index mapping scope matches the old nested scope containing slash, we delete it too
                                if (indexData.scope && indexData.scope.includes('/')) {
                                    const parentFolder = indexData.scope.split('/')[0];
                                    if (parentFolder === unescapedDeletedScope) {
                                        await deleteDoc(codeRef);
                                        console.log(`🗑️ Old nested code index deleted for userCode: ${userCode}`);
                                    }
                                } else {
                                    console.log(`ℹ️ Code index NOT deleted because its current scope (${indexData?.scope}) does not match the deleted scope (${unescapedDeletedScope})`);
                                }
                            }
                        }
                    } catch (indexErr) {
                        console.error(`⚠️ Failed to check/delete index mapping for userCode ${userCode}:`, indexErr);
                    }

                    // Clean up empty category document if there are no users left under it
                    try {
                        const countSnapshot = await getCountFromServer(collection(db, "profiles", escapedScope, "users"));
                        if (countSnapshot.data().count === 0) {
                            await deleteDoc(doc(db, "profiles", escapedScope));
                            console.log(`🗑️ Deleted empty category document: profiles/${escapedScope}`);
                        }
                    } catch (cleanErr) {
                        console.warn(`⚠️ Warning: Failed to check/delete empty category document profiles/${escapedScope}:`, cleanErr);
                    }

                    if (!skipCountUpdate) {
                        try {
                            await this.updateProfileCountInFirestore(scope);
                        } catch (countErr) {
                            console.warn(`⚠️ Warning: Failed to update profile count for scope ${scope} (this is expected if you are not an admin):`, countErr);
                        }
                    }
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

    async hashPassword(password) {
        if (!password) return '';
        // If password is already a SHA-256 hash (64 hex characters), don't hash it again
        if (/^[a-f0-9]{64}$/i.test(password)) {
            return password;
        }
        try {
            const msgUint8 = new TextEncoder().encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Cryptographic hashing failed, falling back to plaintext:', error);
            return password;
        }
    }

    async getCryptoKey(passphrase) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            enc.encode(passphrase),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        const salt = enc.encode("MultiLynkQR-Salt-123");
        return await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 1000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async encryptPassword(password) {
        if (!password) return '';
        const secret = window.ENCRYPTION_SECRET;
        try {
            const key = await this.getCryptoKey(secret);
            const enc = new TextEncoder();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const ciphertext = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                enc.encode(password)
            );
            const combined = new Uint8Array(iv.length + ciphertext.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(ciphertext), iv.length);
            
            let binary = '';
            const len = combined.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(combined[i]);
            }
            return btoa(binary);
        } catch (error) {
            console.error('Encryption failed, using plaintext:', error);
            return password;
        }
    }

    async decryptPassword(encryptedBase64) {
        if (!encryptedBase64) return '';
        // If it doesn't look like base64 or is too short, return as-is
        if (encryptedBase64.length < 16 || !/^[A-Za-z0-9+/=]+$/.test(encryptedBase64)) {
            return encryptedBase64;
        }
        const secret = window.ENCRYPTION_SECRET;
        try {
            const key = await this.getCryptoKey(secret);
            const binaryString = atob(encryptedBase64);
            const len = binaryString.length;
            const combined = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                combined[i] = binaryString.charCodeAt(i);
            }
            const iv = combined.slice(0, 12);
            const ciphertext = combined.slice(12);
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                ciphertext
            );
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            return encryptedBase64;
        }
    }

    // Add new credential (Login Account)
    async addCredential(credentialData) {
        if (this.useFirebase) {
            try {
                const usernameLower = credentialData.username.toLowerCase().trim();
                let uid = '';

                // Create in Firebase Auth
                try {
                    const secAuth = getSecondaryAuth();
                    const userCred = await createUserWithEmailAndPassword(secAuth, usernameLower + '@multilynkqr.local', credentialData.password);
                    uid = userCred.user.uid;
                    await secAuth.signOut();
                } catch (authErr) {
                    if (authErr.code === 'auth/email-already-in-use') {
                        console.warn(`⚠️ Firebase Auth account already exists for ${usernameLower}`);
                    } else {
                        throw authErr;
                    }
                }

                if (credentialData.password) {
                    credentialData.password = await this.encryptPassword(credentialData.password);
                }
                
                if (uid) {
                    credentialData.uid = uid;
                }
                credentialData.username = usernameLower;

                // We use username as document ID for credentials for uniqueness and easy lookup
                const docRef = doc(db, "credentials", usernameLower);
                await setDoc(docRef, credentialData);
                console.log(`✅ Firebase: Added credential and Auth user for ${usernameLower}`);
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
                const usernameLower = username.toLowerCase().trim();
                const docRef = doc(db, "credentials", usernameLower);
                const docSnap = await getDoc(docRef);
                const oldCred = docSnap.exists() ? docSnap.data() : null;
                const oldDataFile = oldCred ? oldCred.dataFile : null;

                if (updateData.password && oldCred) {
                    // Update password in Firebase Auth
                    try {
                        const oldEncrypted = oldCred.password;
                        const oldDecrypted = await this.decryptPassword(oldEncrypted);
                        const secAuth = getSecondaryAuth();
                        
                        // Sign in as this user on secondary auth to update their password
                        await signInWithEmailAndPassword(secAuth, usernameLower + '@multilynkqr.local', oldDecrypted);
                        if (secAuth.currentUser) {
                            await updatePassword(secAuth.currentUser, updateData.password);
                        }
                        await secAuth.signOut();
                        console.log(`✅ Firebase Auth: Password updated for ${usernameLower}`);
                    } catch (authErr) {
                        console.error(`⚠️ Firebase Auth: Failed to update password for ${usernameLower}:`, authErr);
                        // Auto-create missing Auth account if needed
                        if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
                            try {
                                console.log(`🔄 Attempting to create missing Auth user for ${usernameLower}...`);
                                const secAuth = getSecondaryAuth();
                                await createUserWithEmailAndPassword(secAuth, usernameLower + '@multilynkqr.local', updateData.password);
                                await secAuth.signOut();
                                console.log(`✅ Created missing Auth user for ${usernameLower}`);
                            } catch (createErr) {
                                console.error(`❌ Failed to create missing Auth user for ${usernameLower}:`, createErr);
                            }
                        }
                    }
                    
                    updateData.password = await this.encryptPassword(updateData.password);
                }

                if (updateData.username) {
                    updateData.username = updateData.username.toLowerCase();
                }

                await setDoc(docRef, updateData, { merge: true });
                console.log(`✅ Firebase: Updated credential document for ${usernameLower}`);

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
            const unescapedScope = this.unescapeScope(scope);
            const userRole = localStorage.getItem('adminRole');
            const loggedInUsername = localStorage.getItem('adminUsername');

            if (userRole === 'super_admin' || userRole === 'main_admin') {
                // Fetch all credentials in Firestore
                const credsCol = collection(db, "credentials");
                const credsSnapshot = await getDocs(credsCol);

                // Fetch all profiles in Firestore once
                const profilesSnapshot = await getDocs(collection(db, "profiles"));
                const profileDocs = profilesSnapshot.docs;

                for (const credDoc of credsSnapshot.docs) {
                    const cred = credDoc.data();
                    const credDataFile = cred.dataFile;
                    if (!credDataFile) continue;

                    // Check if this credential's scope is affected by the changed scope (EXACT MATCH ONLY)
                    const isAffected = (credDataFile === unescapedScope);

                    if (isAffected) {
                        let count = 0;
                        const countPromises = [];

                        for (const profileDoc of profileDocs) {
                            const scopeName = this.unescapeScope(profileDoc.id);
                            if (scopeName === credDataFile) {
                                countPromises.push((async () => {
                                    const countSnapshot = await getCountFromServer(collection(db, "profiles", profileDoc.id, "users"));
                                    return countSnapshot.data().count;
                                })());
                            }
                        }

                        const counts = await Promise.all(countPromises);
                        count = counts.reduce((sum, val) => sum + val, 0);

                        await setDoc(credDoc.ref, { profileCount: count }, { merge: true });
                    }
                }
            } else if (loggedInUsername) {
                // Regular user can ONLY update their own credential document count
                const usernameLower = loggedInUsername.toLowerCase().trim();
                const credDocRef = doc(db, "credentials", usernameLower);
                const credSnap = await getDoc(credDocRef);
                if (credSnap.exists()) {
                    const cred = credSnap.data();
                    if (cred.dataFile === unescapedScope) {
                        const escapedScope = this.escapeScope(unescapedScope);
                        const countSnapshot = await getCountFromServer(collection(db, "profiles", escapedScope, "users"));
                        const count = countSnapshot.data().count;
                        await setDoc(credDocRef, { profileCount: count }, { merge: true });
                    }
                }
            }
        } catch (error) {
            // Run silently as requested, do not log console warnings/errors
        }
    }

    // Safely backfills parentFolder and normalized dataFile fields for all users in Firestore
    async backfillParentFolder() {
        if (!this.useFirebase) return;
        try {
            console.log("🔄 Starting backfill of parentFolder field for all user documents (fully optimized)...");
            
            let count = 0;
            const batchSize = 500;
            let batch = writeBatch(db);

            // Fetch all users in exactly 1 single read query instead of looping 75+ subcollections
            const q = collectionGroup(db, "users");
            const usersSnapshot = await getDocs(q);
            
            for (const docSnap of usersSnapshot.docs) {
                const userData = docSnap.data();
                
                // Get the scope from the document reference parent parent
                let unescapedScope = '';
                if (docSnap.ref && docSnap.ref.parent && docSnap.ref.parent.parent) {
                    unescapedScope = this.unescapeScope(docSnap.ref.parent.parent.id);
                }
                
                if (unescapedScope) {
                    const parentFolder = this.getParentFolderOfScope(unescapedScope, userData.userCode);

                    if (userData.parentFolder !== parentFolder || !userData.dataFile) {
                        const updates = {
                            parentFolder: parentFolder,
                            dataFile: unescapedScope
                        };
                        batch.set(docSnap.ref, updates, { merge: true });
                        count++;

                        if (count % batchSize === 0) {
                            await batch.commit();
                            batch = writeBatch(db);
                        }
                    }
                }
            }
            
            if (count > 0 && count % batchSize !== 0) {
                await batch.commit();
            }
            console.log(`✅ Backfilled parentFolder for ${count} user document(s).`);
        } catch (error) {
            console.error("❌ Failed to backfill parentFolder:", error);
        }
    }

    // Ensure parent profiles category documents exist for all users in Firestore
    async ensureParentProfilesExist(onProgress) {
        if (!this.useFirebase) return;
        try {
            if (onProgress) onProgress("Scanning profiles in database...");
            console.log("🔄 Checking and ensuring all parent profiles category documents exist...");
            
            // Fetch existing category documents to skip redundant writes
            const profilesSnapshot = await getDocs(collection(db, "profiles"));
            const existingProfileIds = new Set(profilesSnapshot.docs.map(d => d.id));

            const q = collectionGroup(db, "users");
            const querySnapshot = await getDocs(q);
            const uniqueEscapedScopes = new Set();

            querySnapshot.forEach((docSnap) => {
                if (docSnap.ref && docSnap.ref.parent && docSnap.ref.parent.parent) {
                    uniqueEscapedScopes.add(docSnap.ref.parent.parent.id);
                }
            });

            console.log(`🔍 Found ${uniqueEscapedScopes.size} unique profile scope(s) from users subcollections.`);

            const escapedScopesList = Array.from(uniqueEscapedScopes);
            let skipCount = 0;
            let checkCount = 0;
            for (let i = 0; i < escapedScopesList.length; i++) {
                const escapedScope = escapedScopesList[i];
                
                // If it already exists physically in Firestore, skip writing
                if (existingProfileIds.has(escapedScope)) {
                    skipCount++;
                    continue;
                }

                checkCount++;
                if (onProgress) onProgress("Repairing folders (" + checkCount + ")...");
                const unescapedScope = this.unescapeScope(escapedScope);
                const docRef = doc(db, "profiles", escapedScope);
                await setDoc(docRef, {
                    type: 'category',
                    name: unescapedScope
                }, { merge: true });
                console.log("✅ Ensured parent profile document exists: profiles/" + escapedScope);
            }
            console.log(`ℹ️ ensureParentProfilesExist: Checked ${escapedScopesList.length} folders, skipped ${skipCount} existing, repaired ${checkCount} missing.`);
        } catch (error) {
            console.error("❌ Failed to ensure parent profile documents exist:", error);
        }
    }

    // Sync all profile counts for all credentials
    async syncAllProfileCounts(onProgress) {
        if (!this.useFirebase) return;
        try {
            // First ensure all parent profile documents exist so getDocs(collection(db, "profiles")) returns them
            await this.ensureParentProfilesExist(onProgress);

            // Perform parentFolder backfill first to ensure count query matches documents correctly
            if (onProgress) onProgress("Backfilling folder links...");
            await this.backfillParentFolder();

            if (onProgress) onProgress("Recalculating profile counts...");
            const querySnapshot = await getDocs(collection(db, "credentials"));
            const docsList = querySnapshot.docs;
            for (let i = 0; i < docsList.length; i++) {
                const docSnap = docsList[i];
                const cred = docSnap.data();
                if (cred.dataFile) {
                    if (onProgress) onProgress(`Updating counts: ${cred.username} (${i + 1}/${docsList.length})...`);
                    await this.updateProfileCountInFirestore(cred.dataFile);
                }
            }
            // Clean up any empty category documents in the profiles collection
            if (onProgress) onProgress("Cleaning up empty category folders...");
            try {
                const profilesSnapshot = await getDocs(collection(db, "profiles"));
                for (const profileDoc of profilesSnapshot.docs) {
                    const countSnapshot = await getCountFromServer(collection(db, "profiles", profileDoc.id, "users"));
                    if (countSnapshot.data().count === 0) {
                        await deleteDoc(profileDoc.ref);
                        console.log(`🗑️ Deleted empty category document: profiles/${profileDoc.id}`);
                    }
                }
            } catch (cleanErr) {
                console.error("❌ Failed to clean up empty categories:", cleanErr);
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

    async syncToFirebase(onProgress) {
        console.log("🔄 Starting Overwrite Sync to Firebase (Update & Add) -> Subcollections...");
        if (onProgress) onProgress("Loading login credentials...");

        // 1. Sync Credentials
        let credAddedCount = 0;
        let credUpdatedCount = 0;
        try {
            const credRes = await fetch('./credentials/login_credentials.json');
            if (credRes.ok) {
                const credentials = await credRes.json();

                for (let i = 0; i < credentials.length; i++) {
                    const cred = credentials[i];
                    const usernameLower = cred.username.toLowerCase().trim();
                    if (onProgress) onProgress(`Syncing credential: ${usernameLower} (${i + 1}/${credentials.length})...`);
                    const docRef = doc(db, "credentials", usernameLower);
                    const docSnap = await getDoc(docRef);

                    let credChanged = true;
                    if (docSnap.exists()) {
                        const existingCred = docSnap.data();
                        const decPassword = existingCred.password ? await this.decryptPassword(existingCred.password) : '';
                        const existingCompare = { ...existingCred, password: decPassword };
                        if (this.isEquivalent(existingCompare, cred)) {
                            credChanged = false;
                        }
                    }

                    if (credChanged) {
                        // Register in Firebase Auth first
                        if (cred.password) {
                            try {
                                const secAuth = getSecondaryAuth();
                                const userCred = await createUserWithEmailAndPassword(secAuth, usernameLower + '@multilynkqr.local', cred.password);
                                cred.uid = userCred.user.uid;
                                await secAuth.signOut();
                                console.log(`✅ Auth user created during sync for ${usernameLower}`);
                            } catch (authErr) {
                                if (authErr.code === 'auth/email-already-in-use') {
                                    console.log(`ℹ️ Auth user already exists for ${usernameLower}`);
                                } else {
                                    console.error(`⚠️ Failed to create Auth user for ${usernameLower} during sync:`, authErr);
                                }
                            }
                            
                            // Encrypt password for Firestore document storage
                            cred.password = await this.encryptPassword(cred.password);
                        }

                        cred.username = usernameLower;
                        await setDoc(docRef, cred);
                        if (!docSnap.exists()) {
                            credAddedCount++;
                        } else {
                            credUpdatedCount++;
                        }
                    } else {
                        console.log(`ℹ️ Credential Sync Skip: Unchanged login account ${usernameLower}`);
                    }
                }
                console.log(`✅ Credentials Sync: Added ${credAddedCount}, Updated ${credUpdatedCount}`);
            }
        } catch (e) {
            console.error("❌ Failed to sync credentials:", e);
        }

        // 1b. Auto-register all Firestore credentials in Firebase Auth
        try {
            if (onProgress) onProgress("Verifying Firebase Auth accounts...");
            console.log("🔄 Auto-registering Firestore credentials in Firebase Auth...");
            const querySnapshot = await getDocs(collection(db, "credentials"));
            let authRegisteredCount = 0;
            const docsList = querySnapshot.docs;
            
            for (let i = 0; i < docsList.length; i++) {
                const docSnap = docsList[i];
                const cred = docSnap.data();
                const usernameLower = docSnap.id.toLowerCase().trim();
                if (onProgress) onProgress(`Verifying Auth: ${usernameLower} (${i + 1}/${docsList.length})...`);
                
                if (cred.password) {
                    try {
                        const decryptedPassword = await this.decryptPassword(cred.password);
                        const secAuth = getSecondaryAuth();
                        
                        let uid = cred.uid || '';
                        let createdNew = false;
                        
                        try {
                            const userCred = await createUserWithEmailAndPassword(secAuth, usernameLower + '@multilynkqr.local', decryptedPassword);
                            uid = userCred.user.uid;
                            createdNew = true;
                            await secAuth.signOut();
                            console.log(`✅ Auth user auto-created from Firestore: ${usernameLower}`);
                        } catch (authErr) {
                            if (authErr.code === 'auth/email-already-in-use') {
                                // User already registered. Let's log in to verify password and retrieve/confirm UID
                                try {
                                    const userCred = await signInWithEmailAndPassword(secAuth, usernameLower + '@multilynkqr.local', decryptedPassword);
                                    uid = userCred.user.uid;
                                    await secAuth.signOut();
                                    console.log(`ℹ️ Auth user already registered and password verified: ${usernameLower}`);
                                } catch (loginErr) {
                                    console.error(`⚠️ Auth user already exists but password verification failed for ${usernameLower}:`, loginErr);
                                }
                            } else {
                                throw authErr;
                            }
                        }
                        
                        // If we retrieved a UID (either from new creation or verifying sign-in), and it's different/missing in Firestore, update it!
                        if (uid && cred.uid !== uid) {
                            await setDoc(docSnap.ref, { uid: uid }, { merge: true });
                            console.log(`✅ Updated UID in Firestore for ${usernameLower}`);
                        }
                        
                        if (createdNew) {
                            authRegisteredCount++;
                        }
                    } catch (authErr) {
                        console.error(`⚠️ Failed to auto-register/verify ${usernameLower} in Auth:`, authErr);
                    }
                }
            }
            console.log(`✅ Auth Auto-Registration complete. Registered ${authRegisteredCount} user(s).`);
        } catch (authSyncErr) {
            console.error("❌ Failed to auto-register Firestore credentials in Firebase Auth:", authSyncErr);
        }

        // 2. Sync Profiles
        try {
            // Run old scopes migration first to clean and align Firestore
            if (onProgress) onProgress("Migrating old nested database scopes...");
            const migrationResult = await this.migrateOldScopes(onProgress);

            if (onProgress) onProgress("Loading profiles index...");
            const indexRes = await fetch('./data/index.json');
            if (indexRes.ok) {
                const index = await indexRes.json();
                const files = [...new Set(Object.values(index))];

                let profileAddedCount = 0;
                let profileUpdatedCount = 0;
                const uniqueScopes = new Set();
                let skipWriteCount = 0;

                // Fetch existing profile categories to avoid redundant writes
                const profilesSnapshot = await getDocs(collection(db, "profiles"));
                const existingProfileIds = new Set(profilesSnapshot.docs.map(d => d.id));

                for (let fIdx = 0; fIdx < files.length; fIdx++) {
                    const file = files[fIdx];
                    if (onProgress) onProgress(`Syncing profiles file: ${file} (${fIdx + 1}/${files.length})...`);
                    try {
                        const fileRes = await fetch(`./data/${file}`);
                        if (fileRes.ok) {
                            const users = await fileRes.json();

                            // Determine Scope from folder name in path
                            let scope = file.split('/')[0];
                            if (scope.endsWith('.json')) {
                                scope = scope.replace('.json', ''); // Fallback for root files
                            }
                            uniqueScopes.add(scope);

                            console.log(`📂 Processing ${file} -> Scope: ${scope}`);

                            const escapedScope = this.escapeScope(scope);
                            
                            // Only write scope category if it doesn't already exist
                            if (!existingProfileIds.has(escapedScope)) {
                                await setDoc(doc(db, "profiles", escapedScope), {
                                    type: 'category',
                                    name: scope
                                }, { merge: true });
                                existingProfileIds.add(escapedScope);
                            }

                            for (const user of users) {
                                // Determine the nested scope: e.g. "clients"
                                let profileScope = scope;

                                // Inject 'dataFile' property for consistency
                                user.dataFile = profileScope;
                                user.parentFolder = this.getParentFolderOfScope(user.dataFile, user.userCode);

                                // Use username or userCode as Key
                                const docId = user.username || user.userCode || 'unknown_' + Date.now();

                                // Path: profiles/{escapedScope}/users/{docId}
                                const escapedProfileScope = this.escapeScope(profileScope);

                                // Ensure parent profiles category document exists for this scope only if it doesn't already exist
                                if (!existingProfileIds.has(escapedProfileScope)) {
                                    await setDoc(doc(db, "profiles", escapedProfileScope), {
                                        type: 'category',
                                        name: profileScope
                                    }, { merge: true });
                                    existingProfileIds.add(escapedProfileScope);
                                }

                                const docRef = doc(db, "profiles", escapedProfileScope, "users", docId);
                                const docSnap = await getDoc(docRef);
                                
                                // Clean dirty check: only write user profile if it has changed
                                let hasChanged = true;
                                if (docSnap.exists()) {
                                    hasChanged = !this.isEquivalent(docSnap.data(), user);
                                }

                                if (hasChanged) {
                                    await setDoc(docRef, user);
                                    if (!docSnap.exists()) {
                                        profileAddedCount++;
                                    } else {
                                        profileUpdatedCount++;
                                    }
                                } else {
                                    skipWriteCount++;
                                }
                            }
                        }
                    } catch (err) {
                        console.error("Failed to load file for sync: " + file, err);
                    }
                }
                console.log(`ℹ️ Profiles Sync Skip: Avoided writing ${skipWriteCount} unchanged user profile document(s).`);

                // Update profileCount in Firestore for all processed unique scopes
                let sIdx = 0;
                for (const scope of uniqueScopes) {
                    sIdx++;
                    if (onProgress) onProgress(`Updating folder counts: ${scope} (${sIdx}/${uniqueScopes.size})...`);
                    await this.updateProfileCountInFirestore(scope);
                }

                // Also run a full scan of all credentials in Firestore to make sure everything is completely up-to-date
                await this.syncAllProfileCounts(onProgress);

                // Rebuild index collection in Firestore
                let indexInfo = "Cloud Index: Rebuilt successfully.";
                try {
                    if (onProgress) onProgress("Rebuilding search indexes...");
                    const idxResult = await this.rebuildCloudIndex();
                    if (idxResult && idxResult.success) {
                        indexInfo = `Cloud Index: Created ${idxResult.created} new, Updated ${idxResult.updated}, Up-to-date ${idxResult.upToDate}${idxResult.failed ? `, Failed ${idxResult.failed}` : ''}.`;
                    }
                } catch (idxErr) {
                    console.error("⚠️ Failed to rebuild Firestore index during sync:", idxErr);
                    indexInfo = "Cloud Index: Failed to rebuild index.";
                }

                console.log(`✅ Profiles Sync: Added ${profileAddedCount}, Updated ${profileUpdatedCount}`);

                let migrationInfo = "";
                if (migrationResult && migrationResult.success && migrationResult.migrated > 0) {
                    migrationInfo = `Migration: Moved ${migrationResult.migrated} profile(s) to parent scopes & cleaned ${migrationResult.deletedScopes} old folder(s).\n\n`;
                }

                alert(`Sync Complete!\n\n${migrationInfo}Credentials: Added ${credAddedCount}, Updated ${credUpdatedCount} (Passwords Encrypted).\nProfiles: Added ${profileAddedCount} new, Updated ${profileUpdatedCount} existing.\nAuto-Repair: Verified all parent folder documents & recalculated all client user counts in Firestore.\nStructure: profiles/{scope}/users\n${indexInfo}`);
            }
        } catch (e) {
            console.error("❌ Failed to sync profiles:", e);
            alert("Sync Failed. Check console for details.");
        }
    }

    // Rebuild the Firestore index collection by scanning all profile documents
    async rebuildCloudIndex() {
        if (!this.useFirebase) return { success: false, error: "Firebase not enabled" };
        console.log("🔄 Rebuilding cloud index mapping in Firestore (optimized queries)...");
        try {
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

            // Fetch all users across all subcollections in exactly 1 collectionGroup query
            const q = collectionGroup(db, "users");
            const usersSnapshot = await getDocs(q);
            
            usersSnapshot.forEach(userDoc => {
                const userData = userDoc.data();
                const userCode = userData.userCode;
                let unescapedScope = '';
                
                if (userDoc.ref && userDoc.ref.parent && userDoc.ref.parent.parent) {
                    unescapedScope = this.unescapeScope(userDoc.ref.parent.parent.id);
                }
                
                if (userCode && unescapedScope) {
                    const existingScope = indexMap[userCode];
                    const codeRef = doc(db, "index", userCode);

                    if (existingScope === undefined) {
                        batch.set(codeRef, { scope: unescapedScope }, { merge: true });
                        createdCount++;
                        hasOperations = true;
                    } else if (existingScope !== unescapedScope) {
                        batch.set(codeRef, { scope: unescapedScope }, { merge: true });
                        updatedCount++;
                        hasOperations = true;
                    } else {
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

    // Migrate user profiles in batch from old scope to new scope (highly optimized)
    async migrateUserProfilesInBatch(oldScope, newScope, users) {
        if (!this.useFirebase || !oldScope || !newScope || !users || users.length === 0) {
            return { success: false, migrated: 0 };
        }
        
        try {
            const escapedOldScope = this.escapeScope(oldScope);
            const escapedNewScope = this.escapeScope(newScope);
            
            // Ensure parent category document exists for the new scope
            await setDoc(doc(db, "profiles", escapedNewScope), {
                type: 'category',
                name: this.unescapeScope(newScope)
            }, { merge: true });

            const batches = [];
            let currentBatch = writeBatch(db);
            let opCount = 0;
            const maxOps = 500; // Firestore limit per batch

            for (const u of users) {
                // Determine document ID (use stored docId, fall back to username_userCode, or other fields)
                const docId = u.docId || (u.username && u.userCode ? `${u.username}_${u.userCode}` : (u.username || u.userCode || 'unknown'));
                if (!docId || docId === 'unknown') continue;

                const oldDocRef = doc(db, "profiles", escapedOldScope, "users", docId);
                const newDocRef = doc(db, "profiles", escapedNewScope, "users", docId);

                // Prepare updated user data
                const profileData = { ...u };
                profileData.dataFile = this.unescapeScope(newScope);
                profileData.parentFolder = this.getParentFolderOfScope(profileData.dataFile, u.userCode);
                
                // Clean up transient docId property if present
                delete profileData.docId;

                // Op 1: Create user in new scope
                currentBatch.set(newDocRef, profileData, { merge: true });
                opCount++;

                // Op 2: Delete user from old scope
                currentBatch.delete(oldDocRef);
                opCount++;

                // Op 3: Update search index
                if (u.userCode) {
                    const codeRef = doc(db, "index", u.userCode);
                    currentBatch.set(codeRef, { scope: profileData.dataFile }, { merge: true });
                    opCount++;
                }

                if (opCount >= maxOps - 10) {
                    batches.push(currentBatch);
                    currentBatch = writeBatch(db);
                    opCount = 0;
                }
            }

            if (opCount > 0) {
                batches.push(currentBatch);
            }

            // Commit all batch writes
            for (const batch of batches) {
                await batch.commit();
            }
            console.log(`✅ Batch Migration: Moved ${users.length} profiles to scope: ${newScope}`);

            // Clean up the empty old category document if there are no users left under it
            try {
                const countSnapshot = await getCountFromServer(collection(db, "profiles", escapedOldScope, "users"));
                if (countSnapshot.data().count === 0) {
                    await deleteDoc(doc(db, "profiles", escapedOldScope));
                    console.log(`🗑️ Deleted empty category document: profiles/${escapedOldScope}`);
                }
            } catch (cleanErr) {
                console.warn(`⚠️ Warning: Failed to check/delete empty category document profiles/${escapedOldScope}:`, cleanErr);
            }

            return { success: true, migrated: users.length };
        } catch (error) {
            console.error("❌ Batch Migration failed:", error);
            throw error;
        }
    }

    // Migrate old nested scope profiles (e.g. personal/RA2024X9K) to parent folder scope (e.g. personal)
    async migrateOldScopes(onProgress) {
        if (!this.useFirebase) return { success: false, error: "Firebase not enabled" };
        console.log("🔄 Starting database migration for old scope paths...");
        if (onProgress) onProgress("Scanning database for old profile scopes...");

        try {
            // 1. Fetch all index mappings at once to avoid repeated getDoc lookups inside the loop (Optimization)
            const indexSnapshot = await getDocs(collection(db, "index"));
            const indexMap = {};
            indexSnapshot.forEach(docSnap => {
                indexMap[docSnap.id] = docSnap.data().scope;
            });

            // 2. Fetch all users from all collections
            const q = collectionGroup(db, "users");
            const usersSnapshot = await getDocs(q);
            console.log(`🔍 Found total ${usersSnapshot.size} user document(s) in collectionGroup.`);

            // 3. Fast pre-scan: Check if any user document path or index mapping contains a slash '/'
            let needsMigration = false;
            
            // Check index mapping
            for (const userCode in indexMap) {
                if (indexMap[userCode] && indexMap[userCode].includes('/')) {
                    needsMigration = true;
                    break;
                }
            }

            // Check user document paths
            if (!needsMigration) {
                for (const userDoc of usersSnapshot.docs) {
                    if (userDoc.ref && userDoc.ref.parent && userDoc.ref.parent.parent) {
                        const scope = this.unescapeScope(userDoc.ref.parent.parent.id);
                        if (scope.includes('/')) {
                            needsMigration = true;
                            break;
                        }
                    }
                }
            }

            // If nothing contains a slash, everything is already migrated! Exit early (Skip)
            if (!needsMigration) {
                console.log("⚡ Database is already fully migrated. Skipping migration step.");
                return {
                    success: true,
                    migrated: 0,
                    deletedScopes: 0,
                    indexUpdated: 0
                };
            }

            // 4. Run migration loop if changes are needed
            let migratedCount = 0;
            let deletedCount = 0;
            let indexUpdatedCount = 0;
            const scopesToDelete = new Set();

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                const userCode = userData.userCode;
                const username = userData.username;

                // Retrieve the raw unescaped scope name from the document ref parent parent id
                let currentEscapedScope = '';
                if (userDoc.ref && userDoc.ref.parent && userDoc.ref.parent.parent) {
                    currentEscapedScope = userDoc.ref.parent.parent.id;
                }
                
                if (!currentEscapedScope) continue;
                const currentScope = this.unescapeScope(currentEscapedScope);

                // Check if the current scope has a slash and matches the old format (last part is username/userCode)
                if (currentScope.includes('/')) {
                    const parts = currentScope.split('/');
                    const lastPart = parts[parts.length - 1];

                    if (lastPart === userCode || lastPart === username) {
                        const parentFolder = parts.slice(0, -1).join('/'); // e.g. "personal"
                        const newEscapedScope = this.escapeScope(parentFolder);

                        if (onProgress) onProgress(`Migrating user: ${username || userCode} to ${parentFolder}...`);

                        // 1. Determine new document ID
                        const newDocId = username && userCode ? `${username}_${userCode}` : (userCode || userDoc.id);

                        // 2. Prepare user updates
                        const updatedUser = {
                            ...userData,
                            dataFile: parentFolder,
                            parentFolder: parentFolder
                        };

                        // 3. Write to the new path: profiles/{newEscapedScope}/users/{newDocId}
                        const newDocRef = doc(db, "profiles", newEscapedScope, "users", newDocId);
                        await setDoc(newDocRef, updatedUser, { merge: true });
                        console.log(`✅ Migrated profile written to profiles/${newEscapedScope}/users/${newDocId}`);

                        // 4. Delete the old document at the old path
                        await deleteDoc(userDoc.ref);
                        console.log(`🗑️ Old profile deleted: ${userDoc.ref.path}`);

                        // 5. Track the old scope category to delete it later if it becomes empty
                        scopesToDelete.add(currentEscapedScope);

                        migratedCount++;
                    }
                }

                // Ensure the index maps to the new parent scope if it maps to the old scope
                if (userCode) {
                    const codeRef = doc(db, "index", userCode);
                    const existingScope = indexMap[userCode];
                    if (existingScope !== undefined) {
                        if (existingScope && existingScope.includes('/')) {
                            const parts = existingScope.split('/');
                            const lastPart = parts[parts.length - 1];
                            if (lastPart === userCode || lastPart === username) {
                                const parentFolder = parts.slice(0, -1).join('/');
                                await setDoc(codeRef, { scope: parentFolder }, { merge: true });
                                console.log(`✅ Index repaired: index/${userCode} -> scope: ${parentFolder}`);
                                indexUpdatedCount++;
                            }
                        }
                    } else {
                        // Recreate missing index
                        let parentFolder = currentScope;
                        if (currentScope.includes('/')) {
                            const parts = currentScope.split('/');
                            const lastPart = parts[parts.length - 1];
                            if (lastPart === userCode || lastPart === username) {
                                parentFolder = parts.slice(0, -1).join('/');
                            }
                        }
                        await setDoc(codeRef, { scope: parentFolder }, { merge: true });
                        console.log(`✅ Index recreated: index/${userCode} -> scope: ${parentFolder}`);
                        indexUpdatedCount++;
                    }
                }
            }

            // Clean up empty category documents
            for (const oldEscapedScope of scopesToDelete) {
                if (onProgress) onProgress(`Cleaning empty folder: ${this.unescapeScope(oldEscapedScope)}...`);
                // Verify if any users still exist in the old subcollection
                const usersCol = collection(db, "profiles", oldEscapedScope, "users");
                const snapshot = await getDocs(usersCol);
                if (snapshot.empty) {
                    await deleteDoc(doc(db, "profiles", oldEscapedScope));
                    console.log(`🗑️ Deleted empty category document: profiles/${oldEscapedScope}`);
                    deletedCount++;
                } else {
                    console.log(`ℹ️ Category profiles/${oldEscapedScope} not deleted because it is not empty.`);
                }
            }

            console.log(`✅ Migration complete. Migrated: ${migratedCount}, Deleted Scopes: ${deletedCount}, Indexes Updated: ${indexUpdatedCount}`);
            return {
                success: true,
                migrated: migratedCount,
                deletedScopes: deletedCount,
                indexUpdated: indexUpdatedCount
            };

        } catch (error) {
            console.error("❌ Database migration failed:", error);
            throw error;
        }
    }
}

// Export and Attach to Window
const dataService = new DataService();
window.DataService = dataService;
export { dataService };
