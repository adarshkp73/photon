import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { rtdb } from '../lib/firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp, off } from 'firebase/database';

interface PresenceStatus {
  state: 'online' | 'offline';
  last_changed: number; // Unix timestamp
}

/**
 * Hook to manage and listen for a specific user's presence status.
 *
 * It has two modes:
 * 1. Called with no UID: It SETS the current user's presence.
 * 2. Called with a UID: It MONITORS another user's presence.
 */
export const usePresence = (uidToMonitor?: string) => { // Renamed for clarity
  const { currentUser, isVaultUnlocked } = useAuth();
  
  // The UID we are targeting (either current user or external user)
  const targetUid = uidToMonitor || currentUser?.uid;

  // --- Logic for MONITORING ANOTHER USER (Always runs) ---
  const [status, setStatus] = useState<PresenceStatus>({
    state: 'offline',
    last_changed: 0,
  });

  useEffect(() => {
    if (!targetUid) return;

    const statusRef = ref(rtdb, 'status/' + targetUid);

    const handleStatusChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        setStatus({
          state: data.state,
          last_changed: data.last_changed || Date.now(),
        });
      } else {
        // If data is null, assume offline
        setStatus({
          state: 'offline',
          last_changed: 0,
        });
      }
    };

    // Start listening to the target user's status
    onValue(statusRef, handleStatusChange);

    // Stop listening when the UID changes or component unmounts
    return () => off(statusRef, 'value', handleStatusChange);
  }, [targetUid]);


  // --- Logic for the CURRENT USER (Setting Presence) ---
  useEffect(() => {
    // Only set presence if we have a user, the vault is unlocked, and we are NOT monitoring another UID
    if (!currentUser || !currentUser.uid || !isVaultUnlocked || uidToMonitor) {
        // We only explicitly set the user offline if we were previously logged in
        if (currentUser && currentUser.uid) {
            set(ref(rtdb, 'status/' + currentUser.uid), {
                state: 'offline',
                last_changed: serverTimestamp(),
            });
        }
        return;
    }

    const userStatusDatabaseRef = ref(rtdb, 'status/' + currentUser.uid);
    const isOnlineForDatabase = {
      state: 'online',
      last_changed: serverTimestamp(),
    };
    const isOfflineForDatabase = {
      state: 'offline',
      last_changed: serverTimestamp(),
    };

    // 1. Set the onDisconnect hook (CRITICAL STEP)
    onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
        // 2. Set the status to online immediately after setting onDisconnect
        set(userStatusDatabaseRef, isOnlineForDatabase);
    }).catch(err => {
      console.error("Failed to set RTDB presence/onDisconnect:", err);
    });

    // 3. Cleanup: Clear the onDisconnect handler when the component unmounts/state changes
    return () => {
      // Clear the onDisconnect hook to prevent it from firing when the app closes normally
      onDisconnect(userStatusDatabaseRef).cancel();
      // Set status to offline explicitly
      set(userStatusDatabaseRef, isOfflineForDatabase);
    };
  }, [currentUser, isVaultUnlocked, uidToMonitor]); // uidToMonitor ensures this only runs when setting self-presence

  return status;
};