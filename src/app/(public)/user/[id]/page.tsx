import { Calendar, User } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ActivityGraph } from '@/features/profile/components/activity-graph';
import type { WatchActivity } from '@/features/profile/types';

interface UserProfile {
  id: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
  createdAt: string;
  activity: { date: string; watchSeconds: number }[];
}

async function getPublicProfile(id: string): Promise<UserProfile | null> {
  // Strict UUID validation to match backend compulsory requirement
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) return null;

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api';
  try {
    const res = await fetch(`${backendUrl}/user/public/${id}`, {
      next: { revalidate: 600 }, // Cache for 10 minutes
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.profile;
  } catch (_error) {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  if (!profile) {
    return {
      title: 'User Not Found | Rudra Watch',
    };
  }

  const displayName = profile.name || profile.username || 'User';
  return {
    title: `${displayName} (@${profile.username}) | Rudra Watch`,
    description: `View ${displayName}'s watch activity and profile on Rudra Watch.`,
    openGraph: {
      title: `${displayName} on Rudra Watch`,
      description: `Watch history and activity profile for ${displayName}.`,
      images: profile.profilePhoto ? [profile.profilePhoto] : [],
    },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  if (!profile) {
    notFound();
  }

  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Map API activity to Heatmap component expectations (calculating levels 0-4)
  const mappedActivity: WatchActivity[] = profile.activity.map((a) => {
    const minutes = Math.floor(a.watchSeconds / 60);
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (minutes > 0) {
      if (minutes > 120) level = 4;
      else if (minutes > 60) level = 3;
      else if (minutes > 30) level = 2;
      else level = 1;
    }
    return {
      date: a.date,
      count: minutes,
      level,
    };
  });

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a] selection:bg-[#ffcc00] selection:text-[#1a1a1a]">
      {/* Background patterns / abstract shapes for premium look */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full border-[100px] border-[#1a1a1a]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] border-[80px] border-[#1a1a1a] rotate-45" />
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-20 relative z-10">
        {/* Profile Card */}
        <div className="bg-white border-[4px] border-[#1a1a1a] neo-shadow p-8 lg:p-12 mb-12">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 lg:gap-12">
            {/* Avatar Section */}
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-[4px] border-[#1a1a1a] overflow-hidden bg-[#f1ece4] flex-shrink-0 neo-shadow-sm">
                {profile.profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profilePhoto}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#f1ece4]">
                    <User className="w-16 h-16 text-[#1a1a1a]/20" />
                  </div>
                )}
              </div>
              {/* Status Indicator (Optional badge) */}
              <div className="absolute -bottom-2 -right-2 bg-[#ffcc00] border-[2px] border-[#1a1a1a] px-3 py-1 text-[10px] font-black uppercase tracking-widest font-headline">
                PRO MEMBER
              </div>
            </div>

            {/* User Info Section */}
            <div className="flex-1 text-center md:text-left pt-2">
              <h1 className="text-4xl lg:text-5xl font-black font-headline uppercase leading-tight tracking-tight mb-2">
                {profile.name}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-[#1a1a1a]/60">
                <span className="font-headline font-black text-lg bg-[#f1ece4] px-4 py-1 border-[2px] border-[#1a1a1a] rounded-none">
                  @{profile.username || profile.id.slice(0, 8)}
                </span>
                <div className="flex items-center gap-1.5 font-headline font-bold uppercase tracking-wide text-xs">
                  <Calendar className="w-4 h-4" />
                  Joined {joinDate}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border-[3px] border-[#1a1a1a] p-4 bg-[#f5f0e8]/30">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#1a1a1a]/40 mb-1">
                    Total Watch Time
                  </div>
                  <div className="text-2xl font-black font-headline uppercase leading-none">
                    {Math.floor(
                      profile.activity.reduce(
                        (acc, curr) => acc + curr.watchSeconds,
                        0,
                      ) / 3600,
                    )}
                    h
                  </div>
                </div>
                <div className="border-[3px] border-[#1a1a1a] p-4 bg-[#f5f0e8]/30">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#1a1a1a]/40 mb-1">
                    Activity Streak
                  </div>
                  <div className="text-2xl font-black font-headline uppercase leading-none">
                    {/* Simplified streak calculation (consecutive days with activity) */}
                    {computeStreak(profile.activity)} DAYS
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Watch Activity Section */}
        <div className="bg-white border-[4px] border-[#1a1a1a] neo-shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl lg:text-3xl font-black font-headline uppercase tracking-tight">
              Watching Activity
            </h2>
            <div className="hidden sm:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[#1a1a1a]/40">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#f1ece4]" /> Less
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-3 h-3 bg-[#b3ccff]" />
                <div className="w-3 h-3 bg-[#0055ff]" />
                <div className="w-3 h-3 bg-[#ffcc00]" />
                <div className="w-3 h-3 bg-[#e63b2e]" />
              </div>
              <span>More</span>
            </div>
          </div>

          <div className="p-4 bg-[#f1ece4]/20 border-[3px] border-[#1a1a1a] overflow-x-auto overflow-y-hidden custom-scrollbar">
            <ActivityGraph
              activity={mappedActivity}
              createdAt={new Date(profile.createdAt)}
            />
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-headline font-black uppercase tracking-wider text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-[#ffcc00]" />
                Daily Achievements
              </h3>
              <p className="text-sm font-semibold text-[#1a1a1a]/60 leading-relaxed font-body">
                This user is an active consumer of high-quality cinema and
                series. Their watch patterns indicate a preference for immersive
                sessions.
              </p>
            </div>
          </div>
        </div>

        {/* Branding Footer */}
        <div className="mt-12 text-center">
          <p className="font-headline font-bold uppercase tracking-widest text-[10px] text-[#1a1a1a]/40">
            Generated by Rudra Watch &bull; Share your watching legacy
          </p>
        </div>
      </div>
    </div>
  );
}

function computeStreak(activity: { date: string; watchSeconds: number }[]) {
  if (activity.length === 0) return 0;

  // Activity is ordered by date desc in our service
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeDates = new Set(
    activity.filter((a) => a.watchSeconds > 0).map((a) => a.date),
  );

  const checkDate = new Date(today);

  // If they didn't watch anything today, check if they watched yesterday to continue streak
  if (!activeDates.has(toIso(checkDate))) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (activeDates.has(toIso(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
    if (streak > 365) break; // Hard limit
  }

  return streak;
}

const toIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
