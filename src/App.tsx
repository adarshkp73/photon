import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import { ProtectedRoute } from './components/core/ProtectedRoute';
import AuthLayout from './components/auth/AuthLayout';
import ChatRoom from './pages/ChatRoom';
import VerifyEmail from './pages/VerifyEmail';
import { VerificationGate } from './components/core/VerificationGate';
import Settings from './pages/Settings'; // <-- This is the secure "Change Password" page

function App() {
  return (
    <Routes>
      {/* 1. Public Auth Routes (for logged-out users) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        {/* The insecure /forgot-password route is now GONE */}
      </Route>

      {/* 2. Verification Route (for logged-in, unverified users) */}
      <Route 
        path="/verify-email"
        element={
          <VerificationGate>
            <VerifyEmail />
          </VerificationGate>
        } 
      />

      {/* 3. Protected Main App Routes (for logged-in, VERIFIED users) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >
        <Route path="chat/:id" element={<ChatRoom />} />
        
        {/* This is the new, secure "Change Password" route */}
        <Route path="settings" element={<Settings />} />
        
        {/* 'index' is the default child route for '/' */}
        <Route index element={
          <div className="flex items-center justify-center h-full">
            <p className="text-grey-dark dark:text-grey-mid">
              Select a chat to begin
            </p>
          </div>
        } />
      </Route>
    </Routes>
  );
}

export default App;