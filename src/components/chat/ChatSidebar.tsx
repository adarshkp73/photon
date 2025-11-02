import React, { useEffect, useState, useMemo } from 'react'; // useMemo is no longer needed, but safe to keep
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Chat, UserProfile, ChatWithRecipient } from '../../types';
import { useNavigate, useParams } from 'react-router-dom';
import { UserSearchModal } from '../users/UserSearchModal';
import { LoadingSpinner } from '../core/LoadingSpinner';
import { Button } from '../core/Button';
import clsx from 'clsx';

// ... (PlusIcon is unchanged) ...
const PlusIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className="w-5 h-5 mr-2"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// The DeleteIcon component is now GONE

// We revert to just using ChatWithRecipient
interface ChatSidebarItem extends ChatWithRecipient {
  isUnread: boolean;
}

export const ChatSidebar: React.FC = () => {
  // 'userProfile' and 'deleteChat' are GONE from useAuth()
  const { currentUser } = useAuth();
  
  const [chats, setChats] = useState<ChatSidebarItem[]>([]); // This now holds our main list
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();
  const { id: activeChatId } = useParams<{ id: string }>();

  useEffect(() => {
    if (!currentUser?.uid) {
        setLoading(false);
        setChats([]); 
        return;
    };

    setLoading(true);
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('users', 'array-contains', currentUser.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setError(''); 
        
        const loadedChats: ChatSidebarItem[] = [];
        
        snapshot.forEach((docRef) => {
          const chat = { id: docRef.id, ...docRef.data() } as Chat;

          // We filter out any "hidden" chats right here
          // (This logic is safe even if 'hidden_chats' was never created)
          // ... Wait, we removed this. We no longer need to filter.

          const recipientParticipant = chat.participants?.find(
            (p) => p.uid !== currentUser.uid
          );

          // This handles the "zombie chat" case if the other user deleted their account
          if (!recipientParticipant) {
            console.warn(`Chat ${chat.id} has no other participant. Skipping.`);
            return; 
          }
          
          const recipient: UserProfile = {
            uid: recipientParticipant.uid,
            username: recipientParticipant.username,
            email: '', kyberPublicKey: '', createdAt: new Timestamp(0, 0),
            friends: [], username_normalized: '',
          };

          // Unread logic
          const lastMsg = chat.lastMessage;
          const myLastRead = (chat.lastRead && chat.lastRead[currentUser.uid]) ? chat.lastRead[currentUser.uid] : null;
          
          let isUnread = false;
          if (lastMsg && lastMsg.senderId !== currentUser.uid) {
            if (!myLastRead || myLastRead.toMillis() < lastMsg.timestamp.toMillis()) {
              isUnread = true;
            }
          }

          loadedChats.push({ chat, recipient, isUnread });
        });
        
        // Sort by last message time (newest first)
        loadedChats.sort((a, b) => {
          const timeA = a.chat.lastMessage?.timestamp?.toMillis() || a.chat.id.length;
          const timeB = b.chat.lastMessage?.timestamp?.toMillis() || b.chat.id.length;
          return timeB - timeA;
        });

        setChats(loadedChats); // Set the final list
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to chats:', err);
        setError('Failed to load chats.'); 
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]); // We no longer depend on userProfile

  // The 'visibleChats' useMemo hook is now GONE

  // The 'handleDeleteChat' function is now GONE

  return (
    <div className="flex flex-col h-full"> 
      <h2 className="text-2xl font-bold text-night dark:text-pure-white mb-4">Photon</h2>
      
      <h3 className="text-lg font-semibold text-grey-dark dark:text-grey-mid mb-2">
        Conversations
      </h3>
      
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center mt-4">
            <LoadingSpinner />
          </div>
        )}
        
        {/* We check the main `chats` array now */}
        {!loading && error && chats.length === 0 && (
          <p className="text-red-600 dark:text-red-500 text-center">{error}</p>
        )}
        {!loading && !error && chats.length === 0 && (
          <p className="text-grey-dark dark:text-grey-mid text-center">
            No chats yet. Find a user to start a conversation.
          </p>
        )}
        
        {/* We map over the main `chats` array now */}
        <div className="space-y-2">
          {chats.map(({ chat, recipient, isUnread }) => (
            <div
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              className={clsx(
                'group p-3 rounded-lg cursor-pointer transition-colors flex justify-between items-center',
                chat.id === activeChatId
                  ? 'bg-night/10 dark:bg-pure-white text-night dark:text-pure-black'
                  : 'bg-pure-white/50 dark:bg-grey-dark text-night dark:text-grey-light hover:bg-pure-white dark:hover:bg-grey-mid'
              )}
            >
              {/* Left Side (Name & Message) */}
              <div>
                <p className={clsx("font-bold", isUnread && "text-night dark:text-pure-white")}>
                  {recipient.username}
                </p>
                <p className={clsx(
                  "text-sm",
                  chat.id === activeChatId 
                    ? 'text-grey-dark dark:text-grey-dark' 
                    : (isUnread ? "font-bold text-night dark:text-pure-white" : "text-grey-mid dark:text-grey-mid")
                )}>
                  {chat.lastMessage ? 'Encrypted Message' : 'No messages yet'}
                </p>
              </div>

              {/* Unread Dot & Delete Button Container */}
              <div className="flex items-center space-x-2">
                {isUnread && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" title="Unread messages" />
                )}
                
                {/* The delete button is now GONE */}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* "Find User" Button (unchanged) */}
      <div className="pt-4 mt-4 border-t border-grey-mid/20 dark:border-grey-dark">
        <Button 
          variant="secondary" 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center w-full"
        >
          <PlusIcon />
          Find User
        </Button>
      </div>

      <UserSearchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};