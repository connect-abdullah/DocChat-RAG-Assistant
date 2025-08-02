import Image from "next/image";
import iconImage from "@/assets/icon.png";

interface HeaderProps {
  variant: 'mobile-top' | 'desktop' | 'mobile-sidebar';
  userEmail?: string;
  onMenuToggle?: () => void;
  onBackClick?: () => void;
}

export default function Header({ variant, userEmail, onMenuToggle, onBackClick }: HeaderProps) {
  const baseClasses = "flex items-center justify-between";
  const logoClasses = "flex items-center gap-3";
  
  const renderLogo = () => (
    <Image
      src={iconImage}
      alt="DocChat Favicon"
      width={40}
      height={40}
      className="rounded-lg shadow-lg"
    />
  );

  const renderUserInfo = () => (
    <div>
      <h1 className="font-semibold text-slate-100">DocChat</h1>
      <p className="text-xs text-slate-400">{userEmail}</p>
    </div>
  );

  const renderMenuButton = () => (
    <button
      onClick={onMenuToggle}
      className="p-2 hover:bg-slate-600/50 rounded-lg transition-all duration-200 hover:shadow-lg"
    >
      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );

  const renderBackButton = () => (
    <button
      onClick={onBackClick}
      className="p-2 hover:bg-slate-600/50 rounded-lg transition-all duration-200 hover:shadow-lg"
    >
      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  if (variant === 'mobile-top') {
    return (
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600/50 p-4 shadow-lg">
        <div className={baseClasses}>
          <div className={logoClasses}>
            {renderLogo()}
            {renderUserInfo()}
          </div>
          {renderMenuButton()}
        </div>
      </div>
    );
  }

  if (variant === 'desktop') {
    return (
      <div className="hidden md:block p-4 border-b border-slate-600/50 pb-[22.75px] bg-gradient-to-r from-slate-800/80 to-slate-700/80">
        <div className={baseClasses}>
          <div className={logoClasses}>
            {renderLogo()}
            {renderUserInfo()}
          </div>
          {renderMenuButton()}
        </div>
      </div>
    );
  }

  if (variant === 'mobile-sidebar') {
    return (
      <div className="md:hidden p-4 border-b border-slate-600/50 bg-gradient-to-r from-slate-800/80 to-slate-700/80">
        <div className={baseClasses}>
          <div className={logoClasses}>
            {renderBackButton()}
            {renderLogo()}
            {renderUserInfo()}
          </div>
        </div>
      </div>
    );
  }

  return null;
} 