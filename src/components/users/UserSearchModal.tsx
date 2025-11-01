import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  getDoc,
  setDoc,
  Timestamp, // Make sure Timestamp is imported
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Chat, ChatParticipant, UserProfile } from '../../types';
import { createChatId } from '../../lib/utils';
import { Input } from '../core/Input';
import { Button } from '../core/Button';
import { LoadingSpinner } from '../core/LoadingSpinner';

// This is the 'X' icon for the close button
const CloseIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className="w-6 h-6"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [initiatingChat, setInitiatingChat] = useState(false);
  const [error, setError] = useState('');

  const { currentUser, userProfile, encapAndSaveKey } = useAuth();
  const navigate = useNavigate();

  // Reset the form when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setSearchResults([]);
      setError('');
      setLoadingSearch(false);
      setInitiatingChat(false);
    }
  }, [isOpen]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === '' || !userProfile) return;

    if (username.toLowerCase() === userProfile.username.toLowerCase()) {
      setError('You cannot start a chat with yourself.');
      return;
    }

    setLoadingSearch(true);
    setError('');
    setSearchResults([]);

    try {
      const normalizedUsername = username.toUpperCase();
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username_normalized', '==', normalizedUsername),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== currentUser?.uid) {
          users.push(doc.data() as UserProfile);
        }
      });

      if (users.length === 0) {
        setError('No users found.');
      }
      setSearchResults(users);
    } catch (err) {
      console.error('Error searching for users:', err);
      setError('An error occurred during the search.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleStartChat = async (recipient: UserProfile) => {
    if (!currentUser || !encapAndSaveKey || !userProfile) {
      setError('Fatal error: Auth context not ready.');
      return;
    }

    setInitiatingChat(true);
    setError('');

    try {
      if (!recipient.kyberPublicKey) {
        throw new Error(`Recipient's Kyber Public Key is missing.`);
      }

      const chatId = createChatId(currentUser.uid, recipient.uid);
      const chatDocRef = doc(db, 'chats', chatId);
      const chatDocSnap = await getDoc(chatDocRef);

      if (chatDocSnap.exists()) {
        // Chat already exists, close modal and navigate
        onClose();
        navigate(`/chat/${chatId}`);
      } else {
        // Create new chat
        const ciphertext = await encapAndSaveKey(
          chatId,
          recipient.kyberPublicKey
        );
        
        const me: ChatParticipant = { uid: currentUser.uid, username: userProfile.username };
        const other: ChatParticipant = { uid: recipient.uid, username: recipient.username };
        
        // This is the object that MUST match the 'Chat' type
        const newChat: Chat = {
          id: chatId,
          participants: [me, other].sort((a, b) => a.uid.localeCompare(b.uid)) as [ChatParticipant, ChatParticipant],
          users: [currentUser.uid, recipient.uid].sort() as [string, string],
          lastMessage: null,
          keyEncapsulationData: {
            recipientId: recipient.uid,
            ciphertext: ciphertext,
          },
          // --- THIS IS THE FIX ---
          // This line is required to fix the error TS2741
          lastRead: {
            [currentUser.uid]: Timestamp.now()
          }
        };

        await setDoc(chatDocRef, newChat);
        
        // New chat created, close modal and navigate
        onClose();
        navigate(`/chat/${chatId}`);
      }
    } catch (err: any) {
      console.error('--- [START CHAT FAILED] ---', err);
      setError(`Failed to start chat: ${err.message}`);
    } finally {
      setInitiatingChat(false);
    }
  };

  // --- (The JSX render is unchanged) ---
  if (!isOpen) {
    return null;
  }
  return (
    // Backdrop
    <div 
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div
        className="relative z-40 w-full max-w-md p-6 bg-pure-white dark:bg-night rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-grey-mid hover:text-night dark:hover:text-pure-white"
        >
          <CloseIcon />
        </button>

        <h3 className="text-xl font-bold text-night dark:text-pure-white mb-4">
          Find User
        </h3>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <Input
            type="text"
            placeholder="user_id..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loadingSearch || initiatingChat}
          />
          <Button
            type="submit"
            className="w-full"
            isLoading={loadingSearch}
            disabled={initiatingChat}
          >
            Search
          </Button>
        </form>

        {/* Results Area */}
        <div className="mt-4 space-y-2">
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {initiatingChat && (
            <div className="flex items-center gap-2 text-grey-dark dark:text-grey-mid">
              <LoadingSpinner />
              <span>Securing chat...</span>
            </div>
          )}

          {searchResults.map((user) => (
            <div
              key={user.uid}
              onClick={() => handleStartChat(user)}
              className="p-3 bg-grey-light/50 dark:bg-grey-dark rounded-lg cursor-pointer hover:bg-grey-light dark:hover:bg-grey-mid"
            >
              <p className="font-semibold text-night dark:text-grey-light">{user.username}</p>
              <p className="text-sm text-grey-mid">{user.email}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};