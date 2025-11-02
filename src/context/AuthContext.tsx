import React, { createContext, useState, useEffect } from 'react';
// ... (omitted imports) ...
import { auth, db } from '../lib/firebase';
import * as Crypto from '../lib/crypto';
import { KeyVault, SharedSecretsMap, UserProfile, DecoyChatData } from '../types';

// ... (InMemVault interface is unchanged) ...

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isVaultUnlocked: boolean;
  isDecoyMode: boolean;
  decoyChats: DecoyChatData[];
  
  getChatKey: (chatId: string) => Promise<CryptoKey | null>;
  decapAndSaveKey: (chatId: string, ciphertext: string) => Promise<void>;
  encapAndSaveKey: (chatId: string, recipientPublicKey: string) => Promise<string>;
  
  login: (email: string, password: string) => Promise<void>;
  // FIX 1: UPDATE THE INTERFACE TO ACCEPT DURESS PASSWORD
  signup: (email: string, password: string, username: string, duressPassword?: string) => Promise<void>; 
  
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ... (FAKE DATA remains unchanged) ...

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ... (state hooks and useEffects remain unchanged) ...

  // FIX 2: UPDATE THE FUNCTION DEFINITION TO ACCEPT DURESS PASSWORD
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
      
      // DURESS HASH LOGIC
      let duressHash;
      if (duressPassword) {
        duressHash = await Crypto.hashPasswordForStorage(duressPassword); 
      }
      
      const profile: UserProfile = {
        uid: user.uid, username: username, username_normalized: normalizedUsername,
        email: user.email!, kyberPublicKey: publicKey, createdAt: Timestamp.now(), friends: [], duressHash: duressHash,
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

  // ... (All other functions remain unchanged) ...

  const value = {
    // ...
    signup, 
    // ...
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
