import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-[#F3F4F6] min-h-screen text-on-background font-body-md text-body-md flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />

        {/* Main Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-container-margin mt-16 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1200px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
