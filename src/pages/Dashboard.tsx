import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx'; 
import { ThemeToggle } from '../components/core/ThemeToggle';

// --- Icon components (Unchanged) ---
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
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h3.75M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);
// --- End of Icon components ---


const Dashboard: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();
  
  // State for desktop collapse
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };
  
  // Logic to hide sidebar on mobile when a chat is selected
  const isChatRoute = location.pathname.startsWith('/chat/');

  // 1. We determine the mobile position: hidden or visible (0px or full screen)
  const mobileTranslate = isChatRoute ? "-translate-x-full" : "translate-x-0";


  return (
    // The main container must be relative and hides any overflow (for mobile sliding)
    <div className="flex h-screen w-screen relative overflow-hidden">
      
      {/* 2. SIDEBAR CONTAINER: This controls both mobile position AND desktop width */}
      <div
        className={clsx(
          "h-full flex flex-col absolute inset-y-0 left-0", // Absolute positioning for mobile slide
          "bg-grey-light dark:bg-night border-r border-grey-mid/20 dark:border-grey-dark",
          "transition-all duration-300 ease-in-out z-20",
          
          // Mobile Width: Always full screen width, slides based on route
          "w-full max-w-[20rem]", // Set a max-width for the slide so it doesn't take the full screen
          mobileTranslate, // -translate-x-full if on chat route

          // Desktop (md:) Width and Position: Overrides mobile
          "md:relative md:translate-x-0 md:w-1/3 lg:w-1/4 md:p-4 md:border-r",
          
          // 3. DESKTOP COLLAPSE LOGIC (CRITICAL FIX)
          !isSidebarVisible && 
            "md:w-0 md:p-0 md:border-r-0 md:overflow-hidden" // If hidden, desktop width/padding/border is zero
        )}
      >
        <ChatSidebar /> 
      </div>

      {/* 4. CHAT WINDOW CONTAINER: This must move when the sidebar is open on mobile */}
      <div
        className={clsx(
          "absolute inset-y-0 right-0 w-full md:relative md:w-auto md:flex-1 flex flex-col",
          "transition-transform duration-300 ease-in-out",
          
          // On mobile, if sidebar is open, push chat window to the right (off-screen)
          mobileTranslate === "translate-x-0" 
            ? "translate-x-full md:translate-x-0" // Sidebar is visible, push chat away (full width)
            : "translate-x-0" // Sidebar is hidden, show chat
        )}
      >
        
        {/* 5. THE TOGGLE BUTTON (Restored and positioned correctly) */}
        {/* We use isSidebarVisible to control the arrow direction */}
        <button
          onClick={toggleSidebar}
          className={clsx(
            "hidden md:flex absolute z-10 w-8 h-8 rounded-full",
            "bg-pure-white dark:bg-grey-dark text-night dark:text-pure-white",
            "items-center justify-center top-1/2 -translate-y-1/2", 
            "transition-all duration-300 ease-in-out",
            "hover:bg-grey-light dark:hover:bg-grey-mid border-2 border-grey-light dark:border-night",
            // Position anchored to the left edge of this chat container
            "-translate-x-1/2" 
          )}
          style={{ left: 0 }} 
          title={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
        >
          {isSidebarVisible ? <ArrowLeftIcon /> : <ArrowRightIcon />}
        </button>
        
        {/* 6. TOP-RIGHT BUTTONS (Settings, Theme, Logout) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <ThemeToggle />

          <Link 
            to="/settings"
            className="p-2 text-grey-mid hover:text-night dark:text-grey-mid dark:hover:text-pure-white"
            title="Settings"
          >
            <SettingsIcon />
          </Link>

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