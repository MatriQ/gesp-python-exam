import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { LevelSidebar } from './LevelSidebar';
import { LevelTabs } from './LevelTabs';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex pt-16">
        <LevelSidebar />
        <div className="flex-1 flex flex-col min-h-[calc(100vh-4rem)]">
          <LevelTabs />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
      <footer className="text-xs text-gray-400 text-center py-4">
        题目来源：CCF GESP 编程能力等级认证 (gesp.ccf.org.cn)
      </footer>
    </div>
  );
}
