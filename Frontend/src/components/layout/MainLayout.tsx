import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 print:block print:h-auto print:bg-white print:overflow-visible">
      <div className="print:hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden print:block print:overflow-visible">
        <div className="print:hidden">
          <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 print:overflow-visible print:p-0 print:block">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
