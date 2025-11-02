import React, { useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Chat, ChatParticipant, UserProfile } from '../../types';
import { createChatId } from '../../lib/utils';
import { Input } from '../core/Input';
import { Button } from '../core/Button';
import { LoadingSpinner } from '../core/LoadingSpinner';

export const UserSearch: React.FC = () => {
  const [username, setUsername] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [initiatingChat, setInitiatingChat] = useState(false);
  const [error, setError] = useState('');

  const { currentUser, userProfile, encapAndSaveKey } = useAuth();
  const navigate = useNavigate();

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
        navigate(`/chat/${chatId}`);
      } else {
        const ciphertext = await encapAndSaveKey(
          chatId,
          recipient.kyberPublicKey
        );
        
        const me: ChatParticipant = { uid: currentUser.uid, username: userProfile.username };
        const other: ChatParticipant = { uid: recipient.uid, username: recipient.username };
        
        const newChat: Chat = {
          id: chatId,
          participants: [me, other].sort((a, b) => a.uid.localeCompare(b.uid)) as [ChatParticipant, ChatParticipant],
          users: [currentUser.uid, recipient.uid].sort() as [string, string],
          lastMessage: null,
          keyEncapsulationData: {
            recipientId: recipient.uid,
            ciphertext: ciphertext,
          },
        };

        await setDoc(chatDocRef, newChat);
        navigate(`/chat/${chatId}`);
      }
    } catch (err: any) {
      console.error('--- [START CHAT FAILED] ---', err);
      setError(`Failed to start chat: ${err.message}`);
    } finally {
      setInitiatingChat(false);
    }
  };

  return (
    <div className="mb-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Find user to chat..."
          disabled={loadingSearch || initiatingChat}
        />
        <Button
          type="submit"
          className="w-auto px-4"
          isLoading={loadingSearch}
          disabled={initiatingChat}
        >
          Search
        </Button>
      </form>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {initiatingChat && (
        // Theme-aware loading text
        <div className="flex items-center gap-2 text-grey-dark dark:text-grey-mid mt-2">
          <LoadingSpinner />
          <span>Securing chat...</span>
        </div>
      )}

      {/* Theme-aware search results */}
      <div className="mt-2 space-y-1">
        {searchResults.map((user) => (
          <div
            key={user.uid}
            onClick={() => handleStartChat(user)}
            className="p-2 bg-grey-light/50 dark:bg-grey-dark rounded-lg cursor-pointer hover:bg-grey-light dark:hover:bg-grey-mid"
          >
            <p className="font-semibold text-night dark:text-grey-light">{user.username}</p>
            <p className="text-sm text-grey-mid">{user.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
};