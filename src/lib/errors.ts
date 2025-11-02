/**
 * Translates Firebase and custom errors into user-friendly messages.
 */
export function getFriendlyErrorMessage(error: any): string {
  if (error && error.code) {
    switch (error.code) {
      // --- THIS IS THE NEW CASE ---
      case 'auth/wrong-password':
        return 'The current password you entered is incorrect.';
      
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again.';
      
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      
      case 'auth/too-many-requests':
        return 'Access temporarily disabled. Please reset your password or try again later.';

      case 'auth/email-already-in-use':
        return 'An account with this email address already exists.';

      case 'Invalid password.':
        return 'Invalid password. Vault decryption failed.';
      
      default:
        return 'An unknown error occurred. Please try again.';
    }
  }
  
  if (error && error.message) {
    if (error.message === 'Username is already taken.') {
      return 'This username is already taken. Please choose another.';
    }
    // This will catch our "Vault re-encryption failed" error
    return error.message;
  }

  return 'An unknown error occurred.';
}