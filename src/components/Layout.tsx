import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  UserPlus, 
  ArrowLeftRight, 
  Search, 
  BarChart3, 
  Users, 
  LogOut, 
  ClipboardList,
  Menu,
  X,
  Settings,
  ChevronRight,
  Wrench,
  FilePlus,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Admin', 'Staff', 'Store Officer', 'Management'] },
    { name: 'Asset Inventory', path: '/assets', icon: Package, roles: ['Admin', 'Store Officer', 'Inventory Officer'] },
    { name: 'Request Asset', path: '/requests', icon: FilePlus, roles: ['Admin', 'Staff', 'Store Officer', 'Inventory Officer', 'Management'] },
    { name: 'Approve Requests', path: '/request-approval', icon: CheckSquare, roles: ['Admin'] },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench, roles: ['Admin', 'Store Officer', 'Inventory Officer'] },
    { name: 'Allocations', path: '/allocations', icon: ArrowLeftRight, roles: ['Admin', 'Store Officer'] },
    { name: 'Return Log', path: '/return', icon: ArrowLeftRight, roles: ['Admin', 'Store Officer'] },
    { name: 'Reporting', path: '/reports', icon: BarChart3, roles: ['Admin', 'Management'] },
    { name: 'User Management', path: '/users', icon: Users, roles: ['Admin'] },
    { name: 'System Config', path: '/settings', icon: Settings, roles: ['Admin'] },
    { name: 'Audit Trail', path: '/audit', icon: ClipboardList, roles: ['Admin'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="min-h-screen bg-bg-deep flex text-text-primary">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-sidebar transition-all duration-500 ease-in-out flex flex-col fixed inset-y-0 z-50 shadow-2xl",
          isSidebarOpen ? "w-[260px]" : "w-20"
        )}
      >
        <div className="p-8 flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-black text-sidebar shadow-lg shadow-accent/20 transition-transform hover:scale-110">C</div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-black text-base leading-tight tracking-tighter text-white">CRESCENT</span>
              <span className="text-[10px] font-bold text-accent tracking-[0.2em] uppercase">Inventory</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "bg-bg-deep text-accent shadow-inner border border-border/10" 
                    : "text-white/70 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                )}
                <item.icon size={isActive ? 20 : 18} className={cn("transition-colors", isActive ? "text-accent" : "group-hover:text-accent")} />
                {isSidebarOpen && (
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-widest transition-all",
                    isActive ? "translate-x-1" : "group-hover:translate-x-1"
                  )}>
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          {isSidebarOpen && (
            <div className="bg-bg-deep/10 border border-white/10 p-4 rounded-xl mb-6 backdrop-blur-sm">
              <p className="text-[9px] text-white/50 uppercase tracking-[0.2em] font-black mb-2">System Status</p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <p className="text-[10px] text-white font-bold">THREE-TIER ARCHITECTURE</p>
              </div>
            </div>
          )}
          <div className="pt-6 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-4 py-3 text-white/70 hover:text-red-300 transition-all group rounded-xl hover:bg-red-500/5"
            >
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-widest">Logout</span>}
            </button>
            {isSidebarOpen && (
              <div className="mt-6 px-4 text-[9px] text-white/40 leading-relaxed font-medium uppercase tracking-widest">
                v3.1.0-STABLE<br/>
                &copy; 2024 ICT DEPT
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col transition-all duration-500 ease-in-out",
        isSidebarOpen ? "ml-[260px]" : "ml-20"
      )}>
        {/* Header */}
        <header className="h-24 bg-bg-deep/50 backdrop-blur-md flex items-center justify-between px-10 sticky top-0 z-40 border-b border-border/50">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 hover:bg-bg-card rounded-xl text-text-secondary transition-all hover:text-accent border border-transparent hover:border-border"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-text-secondary">Current Module</span>
              <span className="text-sm font-bold text-text-primary tracking-tight">
                {navItems.find(i => i.path === location.pathname)?.name || 'System Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 bg-bg-card pl-2 pr-5 py-2 rounded-full border border-border shadow-lg transition-all hover:border-accent group cursor-pointer">
              <div className="w-9 h-9 bg-bg-deep rounded-full border border-border flex items-center justify-center text-accent text-sm font-black group-hover:scale-105 transition-transform">
                {user?.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-text-primary tracking-tight">{user?.name}</span>
                <span className="text-[9px] text-accent uppercase tracking-widest font-black">{user?.role}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="px-10 py-10 flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
