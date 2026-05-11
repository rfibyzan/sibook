import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="bg-[#F3F4F6] min-h-screen text-on-background font-body-md text-body-md flex">
      <Sidebar />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 ml-64">
        <Header />

        {/* Main Canvas */}
        <main className="flex-1 p-container-margin mt-16 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1200px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
