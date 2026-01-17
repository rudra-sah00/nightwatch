'use client';

/**
 * User Profile Page
 * Shows watch activity graph, stats, and settings
 */

import { ArrowLeft, Calendar, Clock, Flame, Key, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChangePasswordForm, ContributionGraph } from '@/components/profile';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'security'>('overview');
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch profile and activity data
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        const [profileData, activityData] = await Promise.all([
          getUserProfile(),
          getWatchActivity(),
        ]);
        setProfile(profileData);
        setActivity(activityData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  if (authLoading || loading) {
    return (
      <div className="profile-page">
        <div className="container">
          <Skeleton className="header-skeleton" />
          <Skeleton className="stats-skeleton" />
          <Skeleton className="graph-skeleton" />
        </div>
        <style jsx>{`
          .profile-page {
            min-height: 100vh;
            background: var(--bg-primary, #0d1117);
            padding: 24px;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page error-page">
        <p>{error}</p>
        <Button onClick={() => router.push('/')}>Go Home</Button>
      </div>
    );
  }

  const stats = profile?.stats;

  return (
    <div className="profile-page">
      <div className="container">
        {/* Header */}
        <header className="profile-header">
          <button type="button" className="back-button" onClick={() => router.push('/')}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="user-info">
            <div className="avatar">
              {profile?.name
                ? profile.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : profile?.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="user-details">
              <h1>{profile?.name || profile?.username}</h1>
              <p>@{profile?.username}</p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <nav className="tabs">
          <button
            type="button"
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <TrendingUp size={18} />
            Overview
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Key size={18} />
            Security
          </button>
        </nav>

        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <Clock className="stat-icon" size={24} />
                <div className="stat-content">
                  <span className="stat-value">
                    {formatWatchTimeDetailed(stats?.total_watch_time_seconds || 0)}
                  </span>
                  <span className="stat-label">Total Watch Time</span>
                </div>
              </div>

              <div className="stat-card">
                <Calendar className="stat-icon" size={24} />
                <div className="stat-content">
                  <span className="stat-value">{stats?.total_days_active || 0} days</span>
                  <span className="stat-label">Days Active</span>
                </div>
              </div>

              <div className="stat-card">
                <Flame className="stat-icon fire" size={24} />
                <div className="stat-content">
                  <span className="stat-value">{stats?.current_streak || 0} days</span>
                  <span className="stat-label">Current Streak</span>
                </div>
              </div>

              <div className="stat-card">
                <TrendingUp className="stat-icon" size={24} />
                <div className="stat-content">
                  <span className="stat-value">{stats?.longest_streak || 0} days</span>
                  <span className="stat-label">Longest Streak</span>
                </div>
              </div>
            </div>

            {/* Contribution Graph */}
            <section className="activity-section">
              <h2>Watch Activity</h2>
              <p className="section-subtitle">
                {activity?.total_days || 0} days of activity in the last year
              </p>

              <div className="graph-wrapper">
                <ContributionGraph activities={activity?.activities || []} />
              </div>
            </section>
          </>
        )}

        {activeTab === 'security' && (
          <section className="security-section">
            <h2>Change Password</h2>
            <p className="section-subtitle">Update your password to keep your account secure</p>

            <ChangePasswordForm />
          </section>
        )}
      </div>

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background: var(--bg-primary, #0d1117);
          padding: 24px;
        }
        
        .container {
          max-width: 1000px;
          margin: 0 auto;
        }
        
        .profile-header {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 32px;
        }
        
        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: var(--text-secondary, #8b949e);
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        
        .back-button:hover {
          color: var(--text-primary, #e6edf3);
          background: var(--bg-secondary, #161b22);
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 600;
          color: white;
          border: 3px solid rgba(255, 255, 255, 0.15);
        }
        
        .user-details h1 {
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary, #e6edf3);
          margin: 0;
        }
        
        .user-details p {
          font-size: 14px;
          color: var(--text-secondary, #8b949e);
          margin: 4px 0 0 0;
        }
        
        .tabs {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--border-color, #30363d);
          margin-bottom: 32px;
        }
        
        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: var(--text-secondary, #8b949e);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.2s ease;
        }
        
        .tab:hover {
          color: var(--text-primary, #e6edf3);
        }
        
        .tab.active {
          color: var(--text-primary, #e6edf3);
          border-bottom-color: var(--accent-primary, #f78166);
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 40px;
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: var(--bg-secondary, #161b22);
          border: 1px solid var(--border-color, #30363d);
          border-radius: 12px;
        }
        
        .stat-icon {
          color: var(--accent-primary, #58a6ff);
          flex-shrink: 0;
        }
        
        .stat-icon.fire {
          color: #f78166;
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #e6edf3);
        }
        
        .stat-label {
          font-size: 13px;
          color: var(--text-secondary, #8b949e);
        }
        
        .activity-section,
        .security-section {
          background: var(--bg-secondary, #161b22);
          border: 1px solid var(--border-color, #30363d);
          border-radius: 12px;
          padding: 24px;
        }
        
        .activity-section h2,
        .security-section h2 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #e6edf3);
          margin: 0 0 4px 0;
        }
        
        .section-subtitle {
          font-size: 14px;
          color: var(--text-secondary, #8b949e);
          margin: 0 0 24px 0;
        }
        
        .graph-wrapper {
          overflow-x: auto;
          padding: 8px 0;
        }
        
        .error-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
      `}</style>
    </div>
  );
}
