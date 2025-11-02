import { Timestamp } from 'firebase/firestore';

// New interface for fast sidebar loading
export interface ChatParticipant {
  uid: string;
  username: string;
}

// Stored in `users/{userId}`
export interface UserProfile {
  uid: string;
  username: string;
  username_normalized: string;
  email: string;
  kyberPublicKey: string; // Base64 encoded
  createdAt: Timestamp;
  friends: string[]; // array of UIDs
  // --- FINAL SYNCHRONIZED FIELD ---
  duressHash?: string; // Hashed duress password (optional)
}

// Stored in `keyVaults/{userId}`
export interface KeyVault {
  encryptedPrivateKey: string; // Base64, AES-GCM encrypted
  encryptedSharedSecrets: string; // Base64, AES-GCM encrypted JSON blob
}

// This is the structure of the JSON blob *inside* encryptedSharedSecrets
export type SharedSecretsMap = {
  [chatId: string]: string; // [chatId]: sharedSecret (Base64)
};

// Stored in `chatRequests/{docId}`
export interface ChatRequest {
  id?: string;
  senderId: string;
  recipientUsername: string;
  status: 'pending' | 'accepted' | 'denied';
  createdAt: Timestamp;
}

// This object is stored in the `chats` doc during KEM
export interface KeyEncapsulationData {
  recipientId: string;
  ciphertext: string; // Base64 encoded
}

// Stored in `chats/{chatId}`
export interface Chat {
  id: string; // e.g., uid1_uid2
  participants: [ChatParticipant, ChatParticipant]; // For fast display
  users: [string, string]; // For rules and queries
  lastMessage: {
    senderId: string;
    encryptedText: string;
    timestamp: Timestamp;
  } | null;
  keyEncapsulationData: KeyEncapsulationData | null;
  lastRead?: {
    [key: string]: Timestamp;
  };
}

// Stored in `chats/{chatId}/messages/{messageId}`
export interface Message {
  id?: string;
  senderId: string;
  encryptedText: string;
  timestamp: Timestamp;
}

// For our new date-grouped chat list
export type ChatListItem = 
  | { type: 'message'; data: Message }
  | { type: 'date'; date: Date };

// A helper type for the ChatSidebar
export interface ChatWithRecipient {
  chat: Chat;
  recipient: UserProfile;
}