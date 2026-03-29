'use client';

import { Camera, Loader2, LogOut } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProfileOverview } from '../hooks/use-profile-overview';
import { useUpdateProfileForm } from '../hooks/use-update-profile-form';

export function UpdateProfileForm() {
  const {
    user,
    logout,
    isUploading,
    displayImage,
    fileInputRef,
    formattedJoinDate,
    handleFileClick,
    handleFileChange,
  } = useProfileOverview();

  const profileForm = useUpdateProfileForm();
  const profileFormRef = useRef<HTMLFormElement>(null);

  if (!user) return null;

  return (
    <form
      action={profileForm.action}
      ref={profileFormRef}
      className="space-y-16"
    >
      {/* Main Profile Info Section */}
      <section className="bg-white border-4 border-[#1a1a1a] p-8 neo-shadow relative flex flex-col items-center md:items-start md:flex-row gap-8 min-h-[320px]">
        {/* Avatar Section */}
        <div className="relative group shrink-0">
          <div className="overflow-hidden w-48 h-48 md:w-56 md:h-56 border-4 border-[#1a1a1a] rounded-none neo-shadow-sm transition-transform group-hover:-translate-y-1">
            {displayImage ? (
              <img
                src={displayImage}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#f1ece4] flex items-center justify-center">
                <span className="text-4xl md:text-5xl font-black font-headline uppercase text-[#1a1a1a]">
                  {user.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleFileClick}
            disabled={isUploading}
            className="absolute -bottom-2 -right-2 p-4 bg-[#ffcc00] border-4 border-[#1a1a1a] neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 group/btn"
            title="Update Photo"
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-[#1a1a1a]" />
            ) : (
              <Camera className="w-6 h-6 text-[#1a1a1a]" />
            )}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* User Info & Quick Actions */}
        <div className="flex-1 flex flex-col gap-6 w-full text-center md:text-left mt-4 md:mt-0">
          <div className="space-y-2">
            {/* Display Name - Mobile position (under photo) */}
            <div className="md:hidden text-2xl font-headline font-black text-[#1a1a1a] uppercase">
              <div className="min-w-0 grid grid-cols-1 items-baseline relative group">
                <span className="col-start-1 row-start-1 pointer-events-none text-[#1a1a1a] underline decoration-4 underline-offset-4 font-headline font-bold uppercase truncate group-focus-within:invisible">
                  {profileForm.name || user.name}
                </span>
                <input
                  name="name_mobile"
                  required
                  value={profileForm.name}
                  onChange={(e) => profileForm.setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      profileFormRef.current?.requestSubmit();
                    }
                  }}
                  onBlur={() => {
                    if (profileForm.hasChanges) {
                      profileFormRef.current?.requestSubmit();
                    }
                  }}
                  className="col-start-1 row-start-1 w-full text-[#1a1a1a] outline-none caret-[#0055ff] bg-transparent border-none p-0 focus:underline focus:decoration-4 underline-offset-4 focus:bg-[#ffcc00] focus:text-[#1a1a1a] rounded-sm font-headline font-bold uppercase transition-all opacity-0 focus:opacity-100"
                />
              </div>
            </div>

            {/* Username Selection Header */}
            <h1 className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-3 text-4xl md:text-7xl font-black font-headline uppercase tracking-tighter text-[#1a1a1a] leading-none mb-2 justify-center md:justify-start">
              <span className="inline-flex items-center gap-1.5 md:gap-3 justify-center md:justify-start">
                <span className="text-[#0055ff] leading-none translate-y-[-2px] md:translate-y-[-4px]">
                  @
                </span>
                <div className="min-w-0 flex-1 grid grid-cols-1 items-baseline relative group">
                  <span className="col-start-1 row-start-1 pointer-events-none text-[#1a1a1a] underline decoration-4 md:decoration-8 underline-offset-[6px] md:underline-offset-8 font-black font-headline uppercase truncate group-focus-within:invisible">
                    {profileForm.username ||
                      (profileForm.isPending ? '' : user.username)}
                  </span>
                  <input
                    name="username"
                    id="username"
                    value={profileForm.username}
                    onChange={(e) => {
                      const val = e.target.value;
                      profileForm.setUsername(
                        val.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        profileFormRef.current?.requestSubmit();
                      }
                    }}
                    onBlur={() => {
                      if (
                        profileForm.hasChanges &&
                        profileForm.isAvailable !== false
                      ) {
                        profileFormRef.current?.requestSubmit();
                      }
                    }}
                    className="col-start-1 row-start-1 w-full text-[#1a1a1a] outline-none caret-[#0055ff] bg-transparent border-none p-0 focus:underline focus:decoration-4 md:focus:decoration-8 underline-offset-[6px] md:underline-offset-8 focus:bg-[#ffcc00] focus:text-[#1a1a1a] rounded-sm font-black font-headline uppercase leading-none tracking-tighter transition-all opacity-0 focus:opacity-100 placeholder:text-transparent"
                    aria-label="Username"
                  />
                </div>
              </span>
            </h1>
            <input type="hidden" name="username" value={profileForm.username} />

            {/* Display Name - Desktop position (grouped with username) */}
            <div className="hidden md:block text-xl md:text-2xl font-headline font-bold text-[#1a1a1a] w-full max-w-lg uppercase">
              <div className="min-w-0 grid grid-cols-1 items-baseline relative group">
                <label
                  htmlFor="name"
                  className="col-start-1 row-start-1 pointer-events-none text-[#1a1a1a] underline decoration-4 underline-offset-4 font-headline font-bold uppercase truncate group-focus-within:invisible"
                >
                  {profileForm.name || user.name}
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  value={profileForm.name}
                  onChange={(e) => profileForm.setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      profileFormRef.current?.requestSubmit();
                    }
                  }}
                  onBlur={() => {
                    if (profileForm.hasChanges) {
                      profileFormRef.current?.requestSubmit();
                    }
                  }}
                  className="col-start-1 row-start-1 w-full text-[#1a1a1a] outline-none caret-[#0055ff] bg-transparent border-none p-0 focus:underline focus:decoration-4 underline-offset-4 focus:bg-[#ffcc00] focus:text-[#1a1a1a] rounded-sm font-headline font-bold uppercase transition-all opacity-0 focus:opacity-100 placeholder:text-transparent"
                  aria-label="Display Name"
                />
                <input type="hidden" name="name" value={profileForm.name} />
              </div>
            </div>

            <div className="text-base md:text-lg font-headline font-medium text-[#1a1a1a] max-w-lg border-l-4 border-[#0055ff] pl-3 uppercase">
              <span className="opacity-80">
                {user.email} • JOINED {formattedJoinDate}
              </span>
            </div>

            {/* Username Check Feedback */}
            {profileForm.username !== user?.username &&
              profileForm.username.length > 0 && (
                <p
                  className={cn(
                    'text-sm font-bold uppercase font-headline flex items-center gap-2',
                    profileForm.isAvailable === false
                      ? 'text-[#e63b2e]'
                      : profileForm.isAvailable
                        ? 'text-emerald-600'
                        : 'text-[#1a1a1a]/50',
                  )}
                >
                  {profileForm.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {profileForm.username.length < 3
                    ? 'Min 3 chars'
                    : profileForm.isAvailable === false
                      ? 'Already taken'
                      : profileForm.isAvailable
                        ? 'Available'
                        : 'Checking...'}
                </p>
              )}
          </div>

          <div className="md:absolute md:top-8 md:right-8 flex flex-col items-center md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
            {profileForm.isPending && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#ffcc00] text-[#1a1a1a] font-headline font-bold uppercase border-2 border-[#1a1a1a] neo-shadow-sm animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            <Button
              type="button"
              variant="neo-red"
              size="neo"
              onClick={(e) => {
                e.preventDefault();
                logout();
              }}
              className="min-w-[140px] justify-center md:justify-end"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 stroke-[3px]" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
            <button
              type="submit"
              className="hidden pointer-events-none"
              disabled={
                profileForm.isPending ||
                (profileForm.username.length > 0 &&
                  profileForm.username.length < 3) ||
                profileForm.isAvailable === false
              }
            >
              Save Changes
            </button>
          </div>
        </div>
      </section>

      {/* Public Profile Sharing */}
      <section className="bg-white border-4 border-[#1a1a1a] p-8 neo-shadow flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl font-black font-headline uppercase tracking-tighter text-[#1a1a1a]">
            Public Identity
          </h2>
          <p className="text-sm font-bold uppercase font-headline text-[#1a1a1a]/40">
            Share your watching legacy publicly via your unique ID.
          </p>
          <div className="bg-[#f5f0e8] border-[3px] border-[#1a1a1a] px-4 py-2 mt-4 font-mono text-xs md:text-sm font-black break-all text-[#1a1a1a]/60 select-all">
            {user.id}
          </div>
        </div>

        <Button
          type="button"
          variant="neo-yellow"
          size="neo-lg"
          onClick={() => {
            const url = `${window.location.origin}/user/${user.id}`;
            navigator.clipboard.writeText(url);
          }}
          className="w-full md:w-auto text-xl"
        >
          COPY PUBLIC LINK
        </Button>
      </section>

      {/* Server Selection */}
      <section className="bg-white border-4 border-[#1a1a1a] p-8 neo-shadow">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-black font-headline uppercase tracking-tighter text-[#1a1a1a]">
            Server Selection
          </h2>
          {profileForm.isPending && (
            <Loader2 className="w-8 h-8 animate-spin text-[#1a1a1a]" />
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 's1' as const, label: 'Netflix', sub: 'Standard' },
            { id: 's2' as const, label: 'Balanced', sub: 'Performance' },
            { id: 's3' as const, label: 'High Quality', sub: 'HLS 4K' },
          ].map((s) => {
            const isSelected = profileForm.preferredServer === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  profileForm.setPreferredServer(s.id);
                  // Immediate save for server selection
                  setTimeout(() => profileFormRef.current?.requestSubmit(), 0);
                }}
                className={cn(
                  'flex flex-col items-start gap-2 p-6 border-4 border-[#1a1a1a] transition-all active:translate-x-[2px] active:translate-y-[2px]',
                  isSelected
                    ? 'bg-[#0055ff] text-white neo-shadow-yellow -translate-y-1'
                    : 'bg-[#f5f0e8] hover:bg-white text-[#1a1a1a] neo-shadow-sm',
                )}
              >
                <span className="font-black text-2xl font-headline tracking-tighter uppercase">
                  {s.label}
                </span>
                <span className="text-sm uppercase opacity-90 font-body font-bold">
                  {s.sub}
                </span>
              </button>
            );
          })}
        </div>
        <input
          type="hidden"
          name="preferredServer"
          value={profileForm.preferredServer}
        />
      </section>
    </form>
  );
}
