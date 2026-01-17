'use client';

/**
 * User Profile Page
 * Premium OLED Dark Design
 */

import {
  Activity,
  ArrowLeft,
  Calendar,
  Clock,
  Flame,
  Shield,
  TrendingUp,
  User as UserIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChangePasswordForm, ContributionGraph, ProfileSettingsForm } from '@/components/profile';
import { Button, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile, WatchActivitySummary } from '@/services/api/user';
import { formatWatchTimeDetailed, getUserProfile, getWatchActivity } from '@/services/api/user';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState<WatchActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'security'>('overview');
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    try {
      const [profileData, activityData] = await Promise.all([getUserProfile(), getWatchActivity()]);
      setProfile(profileData);
      setActivity(activityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
  }, [isAuthenticated, fetchData]);

  const handleProfileUpdate = () => {
    // Refresh profile data
    getUserProfile().then(setProfile);
  };

  if (authLoading || loading) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="header-skeleton">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="w-48 h-8" />
              <Skeleton className="w-32 h-4" />
            </div>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-12 h-64 rounded-xl" />
        </div>
        <style jsx>{`
          .profile-page {
            min-height: 100vh;
            background: #000000;
            padding: 40px 24px;
            color: #fff;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
          }
          .header-skeleton {
            display: flex;
            gap: 24px;
            align-items: center;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page error-page">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-red-500">Something went wrong</h2>
          <p className="text-zinc-400">{error}</p>
          <Button onClick={() => router.push('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  const stats = profile?.stats;

  return (
    <div className="profile-page">
      <div className="container">
        {/* Navigation */}
        <nav className="nav-header">
          <button type="button" className="back-button" onClick={() => router.push('/')}>
            <ArrowLeft size={20} />
            <span>Home</span>
          </button>
        </nav>

        {/* Profile Header */}
        <header className="profile-header">
          <div className="avatar-wrapper">
            <div className="avatar">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image fails
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('fallback');
                  }}
                />
              ) : null}

              {/* Fallback Initials (shown if no url or error) */}
              <span className="initials">
                {profile?.name
                  ? profile.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : profile?.username.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="avatar-glow" />
          </div>

          <div className="user-details">
            <h1>{profile?.name || profile?.username}</h1>
            <p>@{profile?.username}</p>
            <div className="join-date">
              Joined{' '}
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })
                : 'recently'}
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Activity size={18} />
              <span>Overview</span>
              {activeTab === 'overview' && <div className="active-indicator" />}
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <UserIcon size={18} />
              <span>Profile</span>
              {activeTab === 'profile' && <div className="active-indicator" />}
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Shield size={18} />
              <span>Security</span>
              {activeTab === 'security' && <div className="active-indicator" />}
            </button>
          </div>
        </div>

        <main className="content-area">
          {activeTab === 'overview' && (
            <div className="tab-content overview-content">
              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon-wrapper blue">
                    <Clock size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">
                      {formatWatchTimeDetailed(stats?.total_watch_time_seconds || 0)}
                    </span>
                    <span className="stat-label">Total Watch Time</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper purple">
                    <Calendar size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{stats?.total_days_active || 0} days</span>
                    <span className="stat-label">Days Active</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper orange">
                    <Flame size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{stats?.current_streak || 0} days</span>
                    <span className="stat-label">Current Streak</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper green">
                    <TrendingUp size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{stats?.longest_streak || 0} days</span>
                    <span className="stat-label">Longest Streak</span>
                  </div>
                </div>
              </div>

              {/* Contribution Graph Section */}
              <section className="graph-section">
                <div className="section-header">
                  <h2>Watch Activity</h2>
                  <div className="year-badge">Last 365 Days</div>
                </div>

                <ContributionGraph activities={activity?.activities || []} />
              </section>
            </div>
          )}

          {activeTab === 'profile' && profile && (
            <div className="tab-content profile-content">
              <div className="settings-container">
                <ProfileSettingsForm initialData={profile} onUpdate={handleProfileUpdate} />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="tab-content security-content">
              <div className="settings-container">
                <ChangePasswordForm />
              </div>
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background: #000000;
          color: #ffffff;
          padding: 2px 0; /* Minimized padding */
        }
        
        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px;
        }

        /* Navigation */
        .nav-header {
            margin-bottom: 40px;
        }

        .back-button {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #a1a1aa;
            cursor: pointer;
            padding: 8px 16px;
            border-radius: 99px;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }

        .back-button:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            transform: translateX(-2px);
        }
        
        /* Profile Header */
        .profile-header {
          display: flex;
          align-items: flex-end;
          gap: 32px;
          margin-bottom: 48px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .avatar-wrapper {
            position: relative;
        }

        .avatar {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: 700;
          color: white;
          position: relative;
          z-index: 2;
          border: 4px solid #000;
        }

        .avatar-glow {
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            filter: blur(20px);
            opacity: 0.5;
            z-index: 1;
        }
        
        .user-details h1 {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -0.5px;
          margin: 0;
          background: linear-gradient(to right, #fff, #a1a1aa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .user-details p {
          font-size: 18px;
          color: #a1a1aa; /* Zinc-400 */
          margin: 4px 0 8px 0;
        }

        .join-date {
            font-size: 13px;
            color: #52525b; /* Zinc-600 */
            display: flex;
            align-items: center;
            gap: 6px;
        }

        /* Tabs */
        .tabs-container {
            margin-bottom: 32px;
        }

        .tabs {
          display: flex;
          gap: 8px;
        }
        
        .tab {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .tab:hover {
          color: #fff;
        }
        
        .tab.active {
          color: #fff;
        }

        .active-indicator {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: #fff;
            border-radius: 2px;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }
        
        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 48px;
        }
        
        .stat-card {
          padding: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: transform 0.2s;
        }

        .stat-card:hover {
            background: rgba(255, 255, 255, 0.05);
        }
        
        .stat-icon-wrapper {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .stat-icon-wrapper.blue { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        .stat-icon-wrapper.purple { background: rgba(139, 92, 246, 0.1); color: #a78bfa; }
        .stat-icon-wrapper.orange { background: rgba(249, 115, 22, 0.1); color: #fb923c; }
        .stat-icon-wrapper.green { background: rgba(16, 185, 129, 0.1); color: #34d399; }
        
        .stat-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
        }
        
        .stat-label {
          font-size: 13px;
          color: #a1a1aa;
        }
        
        /* Graph Section */
        .graph-section {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .section-header h2 {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
        }

        .year-badge {
            font-size: 12px;
            padding: 4px 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 99px;
            color: #a1a1aa;
        }

        .overview-content, .security-content, .profile-content {
            animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .error-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #000;
          padding: 24px;
        }
      `}</style>
    </div>
  );
}
