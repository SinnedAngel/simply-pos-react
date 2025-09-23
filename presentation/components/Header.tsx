import React, { useState, useRef, useEffect } from 'react';
import { UsersIcon } from './icons/UsersIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { MenuIcon } from './icons/MenuIcon';
import { UserSession } from '../../domain/entities';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { TagIcon } from './icons/TagIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { CubeIcon } from './icons/CubeIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { CogIcon } from './icons/CogIcon';
import { HamburgerMenuIcon } from './icons/HamburgerMenuIcon';
import { XIcon } from './icons/XIcon';
import { UploadIcon } from './icons/UploadIcon';
import { ArchiveIcon } from './icons/ArchiveIcon';

type AppView = 'pos' | 'menu' | 'categories' | 'inventory' | 'conversions' | 'media' | 'accounts' | 'roles' | 'reporting' | 'purchasing';

interface HeaderProps {
  onLogout: () => void;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  session: UserSession | null;
}

const NavButton: React.FC<{
  view: AppView;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  children: React.ReactNode;
  isMobile?: boolean;
}> = ({ view, currentView, onNavigate, children, isMobile = false }) => {
  const isActive = view === currentView;
  const baseClasses = `transition-colors flex items-center gap-3 w-full text-left`;
  const mobileClasses = `px-4 py-3 text-lg font-semibold`;
  const desktopClasses = `px-4 py-2 rounded-md text-sm font-semibold gap-2`;
  
  const activeClasses = isMobile ? 'text-white bg-brand-secondary/80' : 'bg-brand-secondary text-white';
  const inactiveClasses = isMobile ? 'text-text-secondary hover:bg-surface-card' : 'text-text-secondary hover:bg-surface-card hover:text-text-primary';
  
  const classes = `${baseClasses} ${isMobile ? mobileClasses : desktopClasses} ${isActive ? activeClasses : inactiveClasses}`;

  return (
    <button onClick={() => onNavigate(view)} className={classes}>
      {children}
    </button>
  );
};


const MenuDropdown: React.FC<{
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  hasPermission: (permission: string) => boolean;
  isMobile?: boolean;
  closeMobileMenu?: () => void;
}> = ({ currentView, onNavigate, hasPermission, isMobile = false, closeMobileMenu }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = ['menu', 'categories', 'inventory', 'conversions', 'purchasing'].includes(currentView);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const handleNavigate = (view: AppView) => {
    onNavigate(view);
    setIsOpen(false);
    if (isMobile && closeMobileMenu) {
      closeMobileMenu();
    }
  };
  
  const mobileBaseClasses = 'w-full text-left px-8 py-2 text-md flex items-center gap-3';
  const desktopBaseClasses = 'w-full text-left px-4 py-2 text-sm flex items-center gap-2';
  const mobileActive = 'text-white';
  const mobileInactive = 'text-text-secondary';
  const desktopActive = 'text-white';
  const desktopInactive = 'text-text-secondary';
  const hoverClass = isMobile ? 'hover:bg-brand-secondary/50' : 'hover:bg-surface-main';


  if (isMobile) {
    return (
      <div className="w-full">
         {hasPermission('manage_menu') && (<button onClick={() => handleNavigate('menu')} className={`${mobileBaseClasses} ${currentView === 'menu' ? mobileActive : mobileInactive} ${hoverClass}`}> <MenuIcon className="w-5 h-5" /> Manage Products </button>)}
         {hasPermission('manage_categories') && (<button onClick={() => handleNavigate('categories')} className={`${mobileBaseClasses} ${currentView === 'categories' ? mobileActive : mobileInactive} ${hoverClass}`}><TagIcon className="w-5 h-5" /> Manage Categories</button>)}
         {hasPermission('manage_inventory') && (<button onClick={() => handleNavigate('inventory')} className={`${mobileBaseClasses} ${currentView === 'inventory' ? mobileActive : mobileInactive} ${hoverClass}`}><CubeIcon className="w-5 h-5" /> Manage Inventory</button>)}
         {hasPermission('manage_purchases') && (<button onClick={() => handleNavigate('purchasing')} className={`${mobileBaseClasses} ${currentView === 'purchasing' ? mobileActive : mobileInactive} ${hoverClass}`}><ArchiveIcon className="w-5 h-5" /> Purchasing</button>)}
         {hasPermission('manage_conversions') && (<button onClick={() => handleNavigate('conversions')} className={`${mobileBaseClasses} ${currentView === 'conversions' ? mobileActive : mobileInactive} ${hoverClass}`}><ScaleIcon className="w-5 h-5" /> Manage Conversions</button>)}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
          isActive
            ? 'bg-brand-secondary text-white'
            : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
        }`}
      >
        <MenuIcon className="w-4 h-4" />
        Manage
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-56 bg-surface-card rounded-md shadow-lg z-20 animate-fade-in">
          {hasPermission('manage_menu') && (<button onClick={() => handleNavigate('menu')} className={`${desktopBaseClasses} ${currentView === 'menu' ? desktopActive : desktopInactive} ${hoverClass}`}> <MenuIcon className="w-4 h-4" /> Manage Products </button>)}
          {hasPermission('manage_categories') && (<button onClick={() => handleNavigate('categories')} className={`${desktopBaseClasses} ${currentView === 'categories' ? desktopActive : desktopInactive} ${hoverClass}`}><TagIcon className="w-4 h-4" /> Manage Categories</button>)}
          {hasPermission('manage_inventory') && (<button onClick={() => handleNavigate('inventory')} className={`${desktopBaseClasses} ${currentView === 'inventory' ? desktopActive : desktopInactive} ${hoverClass}`}><CubeIcon className="w-4 h-4" /> Manage Inventory</button>)}
          {hasPermission('manage_purchases') && (<button onClick={() => handleNavigate('purchasing')} className={`${desktopBaseClasses} ${currentView === 'purchasing' ? desktopActive : desktopInactive} ${hoverClass}`}><ArchiveIcon className="w-4 h-4" /> Purchasing</button>)}
          {hasPermission('manage_conversions') && (<button onClick={() => handleNavigate('conversions')} className={`${desktopBaseClasses} ${currentView === 'conversions' ? desktopActive : desktopInactive} ${hoverClass}`}><ScaleIcon className="w-4 h-4" /> Manage Conversions</button>)}
        </div>
      )}
    </div>
  );
};

const AdminDropdown: React.FC<{
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  hasPermission: (permission: string) => boolean;
  isMobile?: boolean;
  closeMobileMenu?: () => void;
}> = ({ currentView, onNavigate, hasPermission, isMobile=false, closeMobileMenu }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = ['accounts', 'roles'].includes(currentView);
  
  const handleNavigate = (view: AppView) => {
    onNavigate(view);
    setIsOpen(false);
    if (isMobile && closeMobileMenu) {
      closeMobileMenu();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const mobileBaseClasses = 'w-full text-left px-8 py-2 text-md flex items-center gap-3';
  const desktopBaseClasses = 'w-full text-left px-4 py-2 text-sm flex items-center gap-2';
  const mobileActive = 'text-white';
  const mobileInactive = 'text-text-secondary';
  const desktopActive = 'text-white';
  const desktopInactive = 'text-text-secondary';
  const hoverClass = isMobile ? 'hover:bg-brand-secondary/50' : 'hover:bg-surface-main';

  if (isMobile) {
    return (
      <div className="w-full">
         {hasPermission('manage_accounts') && (<button onClick={() => handleNavigate('accounts')} className={`${mobileBaseClasses} ${currentView === 'accounts' ? mobileActive : mobileInactive} ${hoverClass}`}> <UsersIcon className="w-5 h-5" /> Manage Accounts</button>)}
         {hasPermission('manage_roles') && (<button onClick={() => handleNavigate('roles')} className={`${mobileBaseClasses} ${currentView === 'roles' ? mobileActive : mobileInactive} ${hoverClass}`}><ShieldCheckIcon className="w-5 h-5" /> Manage Roles</button>)}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
          isActive
            ? 'bg-brand-secondary text-white'
            : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
        }`}
      >
        <CogIcon className="w-4 h-4" />
        Admin
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-surface-card rounded-md shadow-lg z-20 animate-fade-in">
          {hasPermission('manage_accounts') && (<button onClick={() => handleNavigate('accounts')} className={`${desktopBaseClasses} ${currentView === 'accounts' ? desktopActive : desktopInactive} ${hoverClass}`}><UsersIcon className="w-4 h-4" /> Manage Accounts</button>)}
          {hasPermission('manage_roles') && (<button onClick={() => handleNavigate('roles')} className={`${desktopBaseClasses} ${currentView === 'roles' ? desktopActive : desktopInactive} ${hoverClass}`}><ShieldCheckIcon className="w-4 h-4" /> Manage Roles</button>)}
        </div>
      )}
    </div>
  );
};


const Header: React.FC<HeaderProps> = ({ onLogout, currentView, onNavigate, session }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hasPermission = (permission: string) => session?.permissions?.includes(permission) ?? false;
  
  const canManageStore = ['manage_menu', 'manage_categories', 'manage_inventory', 'manage_conversions', 'manage_purchases'].some(hasPermission);
  const canManageAdmin = ['manage_accounts', 'manage_roles'].some(hasPermission);
  
  const handleMobileNav = (view: AppView) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="flex justify-between items-center pb-4 border-b border-gray-700">
      <div className="flex items-center gap-6">
        <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">Danum POS</h1>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2 p-1 bg-surface-main rounded-lg">
           <NavButton view="pos" currentView={currentView} onNavigate={onNavigate}>Point of Sale</NavButton>
           {canManageStore && (<MenuDropdown currentView={currentView} onNavigate={onNavigate} hasPermission={hasPermission}/>)}
           {hasPermission('view_reports') && (<NavButton view="reporting" currentView={currentView} onNavigate={onNavigate}><ChartBarIcon className="w-4 h-4" />Reporting</NavButton>)}
           {hasPermission('manage_media') && (<NavButton view="media" currentView={currentView} onNavigate={onNavigate}>Media Library</NavButton>)}
           {canManageAdmin && (<AdminDropdown currentView={currentView} onNavigate={onNavigate} hasPermission={hasPermission}/>)}
        </nav>
      </div>
      
      {/* Desktop User Info */}
      <div className="hidden md:flex items-center gap-4">
        <span className="text-sm text-text-secondary">Welcome, <span className="font-semibold text-text-primary">{session?.username}</span>!</span>
        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-md bg-surface-card hover:bg-gray-700 text-text-secondary font-semibold transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Mobile Hamburger Menu */}
      <div className="md:hidden">
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2">
            <HamburgerMenuIcon className="w-6 h-6 text-text-primary" />
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-50 animate-fade-in" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="fixed top-0 right-0 h-full w-4/5 max-w-sm bg-surface-sidebar shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="font-bold text-lg">Menu</h2>
                    <button onClick={() => setIsMobileMenuOpen(false)}><XIcon className="w-6 h-6 text-text-secondary"/></button>
                </div>
                <nav className="flex flex-col gap-1 py-4">
                    <NavButton view="pos" currentView={currentView} onNavigate={handleMobileNav} isMobile={true}>Point of Sale</NavButton>
                    
                    {canManageStore && (
                      <div className="w-full">
                        <p className="px-4 py-2 text-sm font-semibold text-text-accent">Manage</p>
                        <MenuDropdown currentView={currentView} onNavigate={handleMobileNav} hasPermission={hasPermission} isMobile={true} closeMobileMenu={() => setIsMobileMenuOpen(false)} />
                      </div>
                    )}

                    {hasPermission('view_reports') && (<NavButton view="reporting" currentView={currentView} onNavigate={handleMobileNav} isMobile={true}><ChartBarIcon className="w-5 h-5" />Reporting</NavButton>)}
                    {hasPermission('manage_media') && (<NavButton view="media" currentView={currentView} onNavigate={handleMobileNav} isMobile={true}><UploadIcon className="w-5 h-5" />Media Library</NavButton>)}
                    
                    {canManageAdmin && (
                      <div className="w-full">
                         <p className="px-4 py-2 text-sm font-semibold text-text-accent">Admin</p>
                         <AdminDropdown currentView={currentView} onNavigate={handleMobileNav} hasPermission={hasPermission} isMobile={true} closeMobileMenu={() => setIsMobileMenuOpen(false)} />
                      </div>
                    )}
                </nav>
                 <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 bg-surface-sidebar">
                    <p className="text-sm text-center text-text-secondary">Welcome, <span className="font-semibold text-text-primary">{session?.username}</span>!</p>
                    <button onClick={onLogout} className="w-full mt-3 px-4 py-3 rounded-md bg-surface-card hover:bg-gray-700 text-text-secondary font-semibold transition-colors">
                      Sign Out
                    </button>
                </div>
            </div>
        </div>
      )}
    </header>
  );
};

export default Header;
