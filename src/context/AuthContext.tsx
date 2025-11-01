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
import * as Crypto from '../lib/crypto';
import { KeyVault, SharedSecretsMap, UserProfile } from '../types';

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
  
  getChatKey: (chatId: string) => Promise<CryptoKey | null>;
  decapAndSaveKey: (chatId: string, ciphertext: string) => Promise<void>;
  encapAndSaveKey: (chatId: string, recipientPublicKey: string) => Promise<string>;
  
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [inMemVault, setInMemVault] = useState<InMemVault | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setCurrentUser(user);
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data() as UserProfile);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setInMemVault(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signup = async (email: string, password: string, username: string) => {
    setLoading(true);
    try {
      const normalizedUsername = username.toUpperCase();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username_normalized', '==', normalizedUsername), limit(1));
      const existingUserSnap = await getDocs(q);
      if (!existingUserSnap.empty) { throw new Error('Username is already taken.'); }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      try {
        await sendEmailVerification(user);
      } catch (err) {
        console.error("Failed to send verification email:", err);
      }

      const salt = await Crypto.getSaltForUser(user.email!);
      const mk = await Crypto.deriveMasterKey(password, salt);
      const { publicKey, privateKey } = await Crypto.generateKyberKeyPair();
      const encryptedPrivateKey = await Crypto.encryptWithAES(mk, privateKey);
      const initialSecrets: SharedSecretsMap = {};
      const encryptedSharedSecrets = await Crypto.encryptWithAES(mk, JSON.stringify(initialSecrets));
      
      const profile: UserProfile = {
        uid: user.uid,
        username: username,
        username_normalized: normalizedUsername,
        email: user.email!,
        kyberPublicKey: publicKey,
        createdAt: Timestamp.now(),
        friends: [],
        // The 'hidden_chats' initialization code is GONE here, matching the UserProfile type
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

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const salt = await Crypto.getSaltForUser(user.email!);
      const mk = await Crypto.deriveMasterKey(password, salt);
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      const vaultDoc = await getDoc(doc(db, 'keyVaults', user.uid));
      if (!profileDoc.exists() || !vaultDoc.exists()) { throw new Error("User data or key vault not found."); }
      const profile = profileDoc.data() as UserProfile;
      const vault = vaultDoc.data() as KeyVault;
      let pKey: string;
      let secrets: SharedSecretsMap;
      try {
        pKey = await Crypto.decryptWithAES(mk, vault.encryptedPrivateKey);
        const secretsJson = await Crypto.decryptWithAES(mk, vault.encryptedSharedSecrets);
        secrets = JSON.parse(secretsJson);
      } catch (err) {
        console.error("DECRYPTION FAILED.", err);
        await logout();
        throw new Error("Invalid password.");
      }
      setCurrentUser(user);
      setUserProfile(profile);
      setInMemVault({
        masterKey: mk,
        kyberPrivateKey: pKey,
        sharedSecrets: secrets,
      });
    } catch (err) {
      console.error("AuthContext login failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };
  
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!currentUser || !currentUser.email || !inMemVault) { throw new Error("User not fully authenticated."); }
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
    if (!inMemVault || !currentUser) throw new Error("Vault locked.");
    const sharedSecretB64 = await Crypto.decapSharedSecret(inMemVault.kyberPrivateKey, ciphertext);
    const newSecretsMap = { ...inMemVault.sharedSecrets, [chatId]: sharedSecretB64, };
    const encryptedSharedSecrets = await Crypto.encryptWithAES(inMemVault.masterKey, JSON.stringify(newSecretsMap));
    await updateDoc(doc(db, 'keyVaults', currentUser.uid), { encryptedSharedSecrets: encryptedSharedSecrets, });
    setInMemVault((v) => v ? { ...v, sharedSecrets: newSecretsMap } : null);
  };
  const encapAndSaveKey = async (chatId: string, recipientPublicKey: string): Promise<string> => {
    if (!inMemVault || !currentUser) throw new Error("Vault locked.");
    const { sharedSecret, ciphertext } = await Crypto.encapSharedSecret(recipientPublicKey);
    const newSecretsMap = { ...inMemVault.sharedSecrets, [chatId]: sharedSecret, }; 
    const encryptedSharedSecrets = await Crypto.encryptWithAES(inMemVault.masterKey, JSON.stringify(newSecretsMap));
    await updateDoc(doc(db, 'keyVaults', currentUser.uid), { encryptedSharedSecrets: encryptedSharedSecrets, });
    setInMemVault((v) => v ? { ...v, sharedSecrets: newSecretsMap } : null);
    return ciphertext;
  };
  const getChatKey = async (chatId: string): Promise<CryptoKey | null> => {
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