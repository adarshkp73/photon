import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // <-- 1. IMPORT useNavigate
import { useAuth } from '../hooks/useAuth';
import { Chat, Message, ChatListItem } from '../types';
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  Timestamp,
  updateDoc,
  query,
  orderBy,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import * as Crypto from '../lib/crypto';
import { ChatInput } from '../components/chat/ChatInput';
import { ChatMessage } from '../components/chat/ChatMessage';
import { LoadingSpinner } from '../components/core/LoadingSpinner';
import { DateSeparator } from '../components/chat/DateSeparator';
import { formatDateSeparator } from '../lib/dateUtils';

// 2. Icon for the mobile back button
const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);


const ChatRoom: React.FC = () => {
  const { id: chatId } = useParams<{ id: string }>();
  const { currentUser, getChatKey, decapAndSaveKey } = useAuth();
  
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const messageListRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate(); // <-- 3. Initialize useNavigate

  // ... (All useEffect and handleSendMessage logic is unchanged) ...
  // [Lines 45-210 are unchanged from the previous version of ChatRoom.tsx]
  useEffect(() => {
    if (!chatId || !currentUser) return;
    setLoading(true);
    const unsubChat = onSnapshot(doc(db, 'chats', chatId), async (doc) => {
      if (!doc.exists()) {
        console.error("Chat does not exist");
        setLoading(false);
        return;
      }
      const chatData = { id: doc.id, ...doc.data() } as Chat;
      setChat(chatData);
      const kemData = chatData.keyEncapsulationData;
      if (kemData && kemData.recipientId === currentUser.uid) {
        try {
          await decapAndSaveKey(chatId, kemData.ciphertext);
          await updateDoc(doc.ref, { keyEncapsulationData: null });
        } catch (err) {
          console.error("Failed to decapsulate key:", err);
        }
      }
      setLoading(false);
    });
    return () => unsubChat();
  }, [chatId, currentUser, decapAndSaveKey]);

  useEffect(() => {
    if (!chatId || !currentUser || !chat) {
      return;
    }
    const lastMsg = chat.lastMessage;
    const myLastRead = (chat.lastRead && chat.lastRead[currentUser.uid]) ? chat.lastRead[currentUser.uid] : null;
    let needsReadUpdate = false;
    if (lastMsg && lastMsg.senderId !== currentUser.uid) {
      if (!myLastRead || myLastRead.toMillis() < lastMsg.timestamp.toMillis()) {
        needsReadUpdate = true;
      }
    }
    if (needsReadUpdate) {
      console.log(`Marking chat ${chatId} as read...`);
      setDoc(doc(db, 'chats', chatId), {
        lastRead: {
          [currentUser.uid]: Timestamp.now()
        }
      }, { merge: true })
      .catch(err => console.error("Error marking chat as read:", err));
    }
  }, [chat, chatId, currentUser]); 

  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc')); 
    const unsubMessages = onSnapshot(
      q, 
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach(doc => {
          msgs.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(msgs);
      }
    );
    return () => unsubMessages();
  }, [chatId]);

  useEffect(() => {
    if (messages.length === 0) return;
    const decryptAll = async () => {
      const key = await getChatKey(chatId!);
      if (!key) {
        setDecryptedMessages(new Map()); 
        return;
      }
      const newDecrypted = new Map(decryptedMessages);
      let needsUpdate = false;
      for (const msg of messages) {
        if (msg.id && !newDecrypted.has(msg.id)) { 
          try {
            const plaintext = await Crypto.decryptWithAES(key, msg.encryptedText);
            newDecrypted.set(msg.id, plaintext);
            needsUpdate = true;
          } catch (err) {
            console.warn("Failed to decrypt message (key was present):", msg.id, err);
            newDecrypted.set(msg.id, "[DECRYPTION FAILED]");
            needsUpdate = true;
          }
        }
      }
      if (needsUpdate) {
        setDecryptedMessages(newDecrypted);
      }
    };
    decryptAll();
  }, [messages, chatId, getChatKey, decryptedMessages]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [decryptedMessages]); 
  
  const handleSendMessage = async (text: string) => {
    if (!chatId || !currentUser) return;
    const key = await getChatKey(chatId);
    if (!key) {
      alert("Error: Chat key is not available. Cannot send message.");
      return;
    }
    const encryptedText = await Crypto.encryptWithAES(key, text);
    const newMessage = {
      senderId: currentUser.uid,
      encryptedText: encryptedText,
      timestamp: Timestamp.now(), 
    };
    await addDoc(collection(db, 'chats', chatId, 'messages'), newMessage);
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: {
        senderId: currentUser.uid, 
        encryptedText: encryptedText,
        timestamp: newMessage.timestamp,
      }
    });
  };
  
  const groupedChatItems = useMemo(() => {
    const items: ChatListItem[] = [];
    let lastDate: string | null = null;
    messages.forEach((message) => {
      if (message.timestamp) {
        const messageDate = message.timestamp.toDate();
        const dateString = messageDate.toLocaleDateString();
        if (dateString !== lastDate) {
          items.push({ type: 'date', date: messageDate });
          lastDate = dateString;
        }
      }
      items.push({ type: 'message', data: message });
    });
    return items;
  }, [messages]);
  // --- End of Unchanged Logic ---


  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><LoadingSpinner /></div>;
  }
  if (!chat || !currentUser) { 
    return <div className="flex-1 flex items-center justify-center">Chat not found.</div>;
  }
  
  const recipient = chat.participants?.find(p => p.uid !== currentUser.uid);

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  let showReadReceipt = false;
  
  if (recipient && lastMessage && lastMessage.senderId === currentUser.uid) {
    const recipientLastRead = (chat.lastRead && chat.lastRead[recipient.uid]) ? chat.lastRead[recipient.uid] : null;
    if (recipientLastRead && recipientLastRead.toMillis() >= lastMessage.timestamp.toMillis()) {
      showReadReceipt = true;
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      
      {/* 4. CHAT HEADER WITH BACK BUTTON */}
      <div className="p-4 border-b border-grey-mid/20 dark:border-grey-dark flex items-center">
        {/* MOBILE BACK BUTTON (Visible only on mobile/small screens) */}
        <button
            onClick={() => navigate('/')} // Navigate back to the index (sidebar)
            className="p-1 mr-2 text-night dark:text-pure-white md:hidden"
            title="Back to Chats"
        >
            <BackIcon />
        </button>

        <h2 className="text-xl font-bold">
          Chat with {recipient ? recipient.username : '...'}
        </h2>
      </div>

      <div 
        ref={messageListRef} 
        className="flex-1 p-4 space-y-4 overflow-y-auto"
      >
        {groupedChatItems.map((item, index) => {
          if (item.type === 'date') {
            return (
              <DateSeparator 
                key={item.date.toISOString()} 
                date={formatDateSeparator(item.date)} 
              />
            );
          }
          const msg = item.data;
          const plaintext = msg.id ? decryptedMessages.get(msg.id) || "..." : "...";
          return (
            <ChatMessage
              key={msg.id || index}
              text={plaintext}
              isSender={msg.senderId === currentUser.uid}
              timestamp={msg.timestamp || null}
            />
          );
        })}
      </div>

      <div className="h-6 px-4 pb-2 text-right">
        {showReadReceipt && (
          <span className="text-sm text-grey-mid">
            Read
          </span>
        )}
      </div>

      <ChatInput onSend={handleSendMessage} />
    </div>
  );
};

export default ChatRoom;
