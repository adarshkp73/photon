import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom'; // 1. IMPORT LINK
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx'; 
import { ThemeToggle } from '../components/core/ThemeToggle';

// --- Icon components ---
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);
const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

// 2. NEW SETTINGS ICON
const SettingsIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className="w-6 h-6"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h3.75" 
    />
  </svg>
);
// --- End of Icon components ---


const Dashboard: React.FC = () => {
  const { logout } = useAuth();
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  return (
    <div className="flex h-screen w-screen relative">
      
      {/* --- THE SIDEBAR CONTAINER --- */}
      <div
        className={clsx(
          "bg-grey-light dark:bg-night border-r border-grey-mid/20 dark:border-grey-dark flex flex-col h-full",
          "transition-all duration-300 ease-in-out", 
          isSidebarVisible
            ? "w-full md:w-1/3 lg:w-1/4 p-4"
            : "w-0 p-0 overflow-hidden" 
        )}
      >
        {isSidebarVisible && <ChatSidebar />}
      </div>

      {/* --- THE CHAT WINDOW (Outlet) --- */}
      <div className="flex-1 flex flex-col relative">
        
        {/* THE TOGGLE BUTTON */}
        <button
          onClick={toggleSidebar}
          className={clsx(
            "absolute z-10 w-8 h-8 rounded-full",
            "bg-pure-white dark:bg-grey-dark text-night dark:text-pure-white",
            "flex items-center justify-center",
            "top-1/2 -translate-y-1/2", 
            "transition-all duration-300 ease-in-out",
            "hover:bg-grey-light dark:hover:bg-grey-mid border-2 border-grey-light dark:border-night",
            isSidebarVisible ? "-translate-x-1/2" : "translate-x-1/2"
          )}
          style={{ left: 0 }} 
          title={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
        >
          {isSidebarVisible ? <ArrowLeftIcon /> : <ArrowRightIcon />}
        </button>
        
        {/* 3. TOP-RIGHT BUTTONS (NOW 3) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          
          {/* THEME TOGGLE */}
          <ThemeToggle />

          {/* NEW SETTINGS LINK */}
          <Link 
            to="/settings"
            className="p-2 text-grey-mid hover:text-night dark:text-grey-mid dark:hover:text-pure-white"
            title="Settings"
          >
            <SettingsIcon />
          </Link>

          {/* LOGOUT BUTTON */}
          <button
            onClick={logout}
            className="p-2 text-grey-mid hover:text-night dark:text-grey-mid dark:hover:text-pure-white"
            title="Logout"
          >
            <LogoutIcon />
          </button>
        </div>

        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;