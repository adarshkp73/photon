import React, { createContext, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import { 
  doc, getDoc, setDoc, updateDoc, Timestamp,
  collection, query, where, getDocs, limit
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import * as Crypto from '../lib/crypto'; // <-- Ensures hashPasswordForStorage is accessible via Crypto.hashPasswordForStorage
import { KeyVault, SharedSecretsMap, UserProfile, DecoyChatData } from '../types';

// ... (InMemVault, AuthContextType interfaces remain the same) ...

interface InMemVault {
  masterKey: CryptoKey;
  kyberPrivateKey: string; // Base64
  sharedSecrets: SharedSecretsMap;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isVaultUnlocked: boolean;
  isDecoyMode: boolean; // State to track if we're in the fake vault
  decoyChats: DecoyChatData[]; // Provide fake chat data
  
  getChatKey: (chatId: string) => Promise<CryptoKey | null>;
  decapAndSaveKey: (chatId: string, ciphertext: string) => Promise<void>;
  encapAndSaveKey: (chatId: string, recipientPublicKey: string) => Promise<string>;
  
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string, duressPassword?: string) => Promise<void>; 
  
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- HARDCODED FAKE DATA (Required for Decoy Mode) ---
const FAKE_TIMESTAMP = Timestamp.fromDate(new Date());
const FAKE_USER_ID = "decoy-placeholder-id";

const FAKE_USER_PROFILE: UserProfile = {
  uid: FAKE_USER_ID,
  username: "DecoyUser",
  username_normalized: "DECOYUSER",
  email: "decoy@placeholder.net",
  kyberPublicKey: "FAKE_PQC_KEY_FOR_DECOY_MODE",
  createdAt: FAKE_TIMESTAMP,
  friends: [],
};

const FAKE_CHAT_DATA: DecoyChatData[] = [
    { id: "decoy-chat-1", recipientName: "Test Contact 1", lastMessageText: "Hey, just checking in. Sent from Photon." },
    { id: "decoy-chat-2", recipientName: "Work Colleague", lastMessageText: "Need the report by EOD. Thanks." },
];
// --- END HARDCODED FAKE DATA ---


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [inMemVault, setInMemVault] = useState<InMemVault | null>(null);
  const [isDecoyMode, setIsDecoyMode] = useState(false); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setCurrentUser(user);
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data() as UserProfile);
        }
        setIsDecoyMode(false); 
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setInMemVault(null);
        setIsDecoyMode(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // UPDATED SIGNUP FUNCTION
  const signup = async (email: string, password: string, username: string, duressPassword?: string) => {
    setLoading(true);
    try {
      const normalizedUsername = username.toUpperCase();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username_normalized', '==', normalizedUsername), limit(1));
      const existingUserSnap = await getDocs(q);
      if (!existingUserSnap.empty) { throw new Error('Username is already taken.'); }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      try { await sendEmailVerification(user); } catch (err) { console.error("Failed to send verification email:", err); }

      const salt = await Crypto.getSaltForUser(user.email!);
      const mk = await Crypto.deriveMasterKey(password, salt);
      const { publicKey, privateKey } = await Crypto.generateKyberKeyPair();
      const encryptedPrivateKey = await Crypto.encryptWithAES(mk, privateKey);
      const initialSecrets: SharedSecretsMap = {};
      const encryptedSharedSecrets = await Crypto.encryptWithAES(mk, JSON.stringify(initialSecrets));
      
      // NEW DURESS HASH LOGIC
      let duressHash;
      if (duressPassword) {
        duressHash = await Crypto.hashPasswordForStorage(duressPassword); 
      }
      
      const profile: UserProfile = {
        uid: user.uid,
        username: username,
        username_normalized: normalizedUsername,
        email: user.email!,
        kyberPublicKey: publicKey,
        createdAt: Timestamp.now(),
        friends: [],
        duressHash: duressHash, // Save the hash
      };
      await setDoc(doc(db, 'users', user.uid), profile);
      
      const vault: KeyVault = {
        encryptedPrivateKey: encryptedPrivateKey,
        encryptedSharedSecrets: encryptedSharedSecrets,
      };
      await setDoc(doc(db, 'keyVaults', user.uid), vault);
      
      setCurrentUser(user);
      setUserProfile(profile);
      setInMemVault({
        masterKey: mk,
        kyberPrivateKey: privateKey,
        sharedSecrets: initialSecrets,
      });
    } catch (err) {
      console.error("Signup failed:", err);
      throw err; 
    } finally {
      setLoading(false);
    }
  };

  /**
   * LOG IN: Handles both REAL login (Firebase + Vault) and DURESS login (Decoy).
   */
  const login = async (email: string, password: string) => {
    setLoading(true);
    
    // --- STEP 1: DURESS CHECK (The First Gate) ---
    try {
      // Find the user's profile by email (allowed by security rules)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()), limit(1));
      const userSnap = await getDocs(q);

      if (!userSnap.empty) {
        const profile = userSnap.docs[0].data() as UserProfile;
        
        if (profile.duressHash) {
          const enteredHash = await Crypto.hashPasswordForStorage(password);

          // Check if the entered password matches the stored duress hash
          if (enteredHash === profile.duressHash) {
            console.log("[DURESS LOGIN] Decoy credentials matched. Activating decoy mode.");
            
            // Inject Fake State
            setCurrentUser({ uid: profile.uid, email: profile.email, emailVerified: true } as User); 
            setUserProfile(profile);
            setInMemVault(null); // CRITICAL: VAULT MUST BE NULL/LOCKED
            setIsDecoyMode(true); // Activate decoy flag
            setLoading(false);
            return; // EXIT FUNCTION SUCCESSFULLY
          }
        }
      }
      
      // If no duress match, proceed with normal Firebase login attempt
    } catch (duressCheckError) {
      console.warn("Duress Check failed, proceeding to real login:", duressCheckError);
    }
    
    // --- STEP 2: Attempt Real Firebase Login ---
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const salt = await Crypto.getSaltForUser(user.email!);
      const mk = await Crypto.deriveMasterKey(password, salt);
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      const profile = profileDoc.data() as UserProfile;
      const vaultDoc = await getDoc(doc(db, 'keyVaults', user.uid));
      if (!vaultDoc.exists()) { throw new Error("Key vault not found."); }
      const vault = vaultDoc.data() as KeyVault;

      // Decrypt Vault
      let pKey: string;
      let secrets: SharedSecretsMap;
      try {
        pKey = await Crypto.decryptWithAES(mk, vault.encryptedPrivateKey);
        const secretsJson = await Crypto.decryptWithAES(mk, vault.encryptedSharedSecrets);
        secrets = JSON.parse(secretsJson);
      } catch (err) {
        await logout(); 
        throw new Error("Invalid password.");
      }

      // Success: Load Real State
      setCurrentUser(user);
      setUserProfile(profile);
      setInMemVault({ masterKey: mk, kyberPrivateKey: pKey, sharedSecrets: secrets, });
      setIsDecoyMode(false); 

    } catch (realAuthError: any) {
      // If the login fails, throw the error.
      throw realAuthError; 
      
    } finally {
      // Only set loading false here if the function hasn't already returned successfully
      if (loading) {
         setLoading(false);
      }
    }
  };

  /**
   * LOG OUT: The fix for the Duress Password scenario is here.
   */
  const logout = async () => {
    if (isDecoyMode) {
        // FIX: Manual State Reset for Decoy Mode
        setCurrentUser(null);
        setUserProfile(null);
        setInMemVault(null);
        setIsDecoyMode(false);
        return; 
    }
    
    // Standard Logout: Clear the real Firebase session
    await signOut(auth);
  };
  
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!currentUser || !currentUser.email || !inMemVault) { throw new Error("User not fully authenticated."); }
    if (isDecoyMode) { throw new Error("Cannot change password in decoy mode."); }
    
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    try {
      const salt = await Crypto.getSaltForUser(currentUser.email);
      const decryptedPrivateKey = inMemVault.kyberPrivateKey;
      const decryptedSecrets = inMemVault.sharedSecrets;
      const newMasterKey = await Crypto.deriveMasterKey(newPassword, salt);
      const newEncryptedPrivateKey = await Crypto.encryptWithAES(newMasterKey, decryptedPrivateKey);
      const newEncryptedSecrets = await Crypto.encryptWithAES(newMasterKey, JSON.stringify(decryptedSecrets));
      await updateDoc(doc(db, 'keyVaults', currentUser.uid), {
        encryptedPrivateKey: newEncryptedPrivateKey,
        encryptedSharedSecrets: newEncryptedSecrets,
      });
      await updatePassword(currentUser, newPassword);
      setInMemVault({ ...inMemVault, masterKey: newMasterKey, });
    } catch (cryptoError) {
      console.error("CRITICAL: Failed to re-encrypt vault:", cryptoError);
      throw new Error("Vault re-encryption failed. Password not changed.");
    }
  };

  const decapAndSaveKey = async (chatId: string, ciphertext: string) => {
    if (!inMemVault || !currentUser) { throw new Error("Vault locked."); }
    if (isDecoyMode) { throw new Error("Cannot use crypto in decoy mode."); }
    
    const sharedSecretB64 = await Crypto.decapSharedSecret(inMemVault.kyberPrivateKey, ciphertext);
    const newSecretsMap = { ...inMemVault.sharedSecrets, [chatId]: sharedSecretB64, };
    const encryptedSharedSecrets = await Crypto.encryptWithAES(inMemVault.masterKey, JSON.stringify(newSecretsMap));
    await updateDoc(doc(db, 'keyVaults', currentUser.uid), { encryptedSharedSecrets: encryptedSharedSecrets, });
    setInMemVault((v) => v ? { ...v, sharedSecrets: newSecretsMap } : null);
  };

  const encapAndSaveKey = async (chatId: string, recipientPublicKey: string): Promise<string> => {
    if (!inMemVault || !currentUser) { throw new Error("Vault locked."); }
    if (isDecoyMode) { throw new Error("Cannot use crypto in decoy mode."); }
    
    const { sharedSecret, ciphertext } = await Crypto.encapSharedSecret(recipientPublicKey);
    const newSecretsMap = { ...inMemVault.sharedSecrets, [chatId]: sharedSecret, }; 
    const encryptedSharedSecrets = await Crypto.encryptWithAES(inMemVault.masterKey, JSON.stringify(newSecretsMap));
    await updateDoc(doc(db, 'keyVaults', currentUser.uid), { encryptedSharedSecrets: encryptedSharedSecrets, });
    setInMemVault((v) => v ? { ...v, sharedSecrets: newSecretsMap } : null);
    return ciphertext;
  };
  
  const getChatKey = async (chatId: string): Promise<CryptoKey | null> => {
    if (isDecoyMode) return null;
    if (!inMemVault) return null;
    const secretB64 = inMemVault.sharedSecrets[chatId];
    if (!secretB64) { return null; } 
    return Crypto.importSharedSecret(secretB64);
  };
  
  const value = {
    currentUser,
    userProfile,
    loading,
    isVaultUnlocked: inMemVault !== null,
    isDecoyMode: isDecoyMode, 
    decoyChats: FAKE_CHAT_DATA, 
    getChatKey,
    decapAndSaveKey,
    encapAndSaveKey,
    login,
    signup,
    logout,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
