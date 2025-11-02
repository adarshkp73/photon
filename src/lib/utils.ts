/**
 * Creates a composite chat ID from two user IDs.
 * Always sorts them alphabetically to ensure uniqueness.
 * e.g., createChatId('user_b', 'user_a') -> 'user_a_user_b'
 */
export function createChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}