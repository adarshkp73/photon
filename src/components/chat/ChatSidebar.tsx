import React, { useEffect, useState, useMemo } from 'react'; 
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
import { usePresence } from '../../hooks/usePresence'; // Used for presence feature

// Icon for "Find User"
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

interface ChatSidebarItem extends ChatWithRecipient {
  isUnread: boolean;
}

// Component to render status, uses the hook
const StatusIndicator: React.FC<{ uid: string }> = ({ uid }) => {
  const status = usePresence(uid); // Monitor the specific user
  const isOnline = status.state === 'online';

  return (
    <div
      className={clsx(
        "w-2 h-2 rounded-full flex-shrink-0 ml-2",
        isOnline ? "bg-green-500" : "bg-grey-mid/50"
      )}
      title={isOnline ? "Online" : "Offline"}
    />
  );
};


export const ChatSidebar: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [chats, setChats] = useState<ChatSidebarItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();
  const { id: activeChatId } = useParams<{ id: string }>();

  // 1. New: Call usePresence without arguments to SET the current user's presence state
  usePresence(); 

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

          const recipientParticipant = chat.participants?.find(
            (p) => p.uid !== currentUser.uid
          );
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

        setChats(loadedChats); 
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to chats:', err);
        setError('Failed to load chats.'); 
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // We filter out hidden chats (now removed, but keeping a simple filter)
  const visibleChats = useMemo(() => {
    // Since hidden_chats is removed from the type, this is just a dummy filter that returns all chats
    return chats.filter(chat => true); 
  }, [chats]);

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
        
        {!loading && error && visibleChats.length === 0 && (
          <p className="text-red-600 dark:text-red-500 text-center">{error}</p>
        )}
        {!loading && !error && visibleChats.length === 0 && (
          <p className="text-grey-dark dark:text-grey-mid text-center">
            No chats yet. Find a user to start a conversation.
          </p>
        )}
        
        <div className="space-y-2">
          {visibleChats.map(({ chat, recipient, isUnread }) => (
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
              {/* Left Side (Name & Status) */}
              <div className='flex items-center'> 
                <p className={clsx("font-bold", isUnread && "text-night dark:text-pure-white")}>
                  {recipient.username}
                </p>
                {/* Status indicator remains */}
                <StatusIndicator uid={recipient.uid} /> 
              </div>

              {/* Right Side (Message & Dot) */}
              <div className="flex items-center space-x-2">
                <p className={clsx(
                  "text-sm",
                  chat.id === activeChatId 
                    ? 'text-grey-dark dark:text-grey-dark' 
                    : (isUnread ? "font-bold text-night dark:text-pure-white" : "text-grey-mid dark:text-grey-mid")
                )}>
                  {chat.lastMessage ? 'Encrypted Message' : 'No messages yet'}
                </p>

                {isUnread && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" title="Unread messages" />
                )}
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