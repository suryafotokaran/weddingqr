import {
  LayoutDashboard,
  CloudUpload,
  Users,
  ScrollText,
  BarChart2,
  Images,
  UserPlus,
  CheckSquare,
  TrendingUp,
  ShieldCheck,
  PlusCircle,
  Eye,
  Cloud,
  CloudCheck,
  CalendarDays,
} from "lucide-react";

export default function App() {
  return (
    <div className="text-zinc-900">
      {/* TopNavBar */}
      <nav className="fixed top-0 z-50 w-full px-8 py-4 flex justify-between items-center bg-white/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(26,28,28,0.04)]">
        <div className="flex items-center gap-12">
          <span className="text-xl font-semibold tracking-tighter text-teal-800">The Editorial Union</span>
          <div className="hidden md:flex items-center space-x-8 text-sm tracking-tight">
            <a className="text-teal-700 font-bold border-b-2 border-teal-600 transition-colors" href="#">Dashboard</a>
            <a className="text-zinc-500 font-medium hover:text-teal-600 transition-colors" href="#">Galleries</a>
            <a className="text-zinc-500 font-medium hover:text-teal-600 transition-colors" href="#">Clients</a>
            <a className="text-zinc-500 font-medium hover:text-teal-600 transition-colors" href="#">Settings</a>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button className="silk-gradient text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:opacity-90 active:scale-95 transition-all">
            Upload Photos
          </button>
          <img
            alt="Photographer Profile"
            className="w-10 h-10 rounded-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCH23UGYCh3iIqu6bNvZozNR2ZOeMm5HL9IysufePEH28li9iZBHjXv0qIENZ7cqnzG5JMLO-e_XFXGjM2MHsOf75vfImyWjXjdpGXAr8McX7YvPyQMzyDC7kVPTuoCm10S3KMUeXi0c62hDFSfkKLpKA0pg3VHDT7SztXaM6SQSGCUmOVJuTPSU0pxi-2NQY7a70A69wEOm_CyPGtJWFPA7WObt2yJ8v34KC4FaJeOzRsCFOl2dj4jQh2odhdpnc7MFUCNXIUcsKU7"
          />
        </div>
      </nav>

      <div className="flex min-h-screen pt-24">
        {/* SideNavBar */}
        <aside className="hidden lg:flex flex-col w-64 h-[calc(100vh-6rem)] p-4 space-y-2 bg-zinc-50 sticky top-24">
          <div className="mb-8 px-4">
            <h3 className="text-lg font-bold text-teal-900 tracking-tight">Editorial Union</h3>
            <p className="text-xs text-zinc-500">Photography Studio</p>
          </div>
          <a className="flex items-center gap-3 px-4 py-3 bg-orange-100 text-orange-900 rounded-xl text-sm font-medium active:scale-[0.98] transition-transform duration-200" href="#">
            <LayoutDashboard size={20} className="text-teal-700" />
            Overview
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-zinc-600 hover:bg-zinc-200/50 rounded-xl text-sm font-medium hover:translate-x-1 transition-transform duration-200" href="#">
            <CloudUpload size={20} />
            Uploads
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-zinc-600 hover:bg-zinc-200/50 rounded-xl text-sm font-medium hover:translate-x-1 transition-transform duration-200" href="#">
            <Users size={20} />
            User Management
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-zinc-600 hover:bg-zinc-200/50 rounded-xl text-sm font-medium hover:translate-x-1 transition-transform duration-200" href="#">
            <ScrollText size={20} />
            Selection Logs
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-zinc-600 hover:bg-zinc-200/50 rounded-xl text-sm font-medium hover:translate-x-1 transition-transform duration-200" href="#">
            <BarChart2 size={20} />
            Analytics
          </a>
          <div className="mt-auto p-4">
            <button className="w-full py-3 px-4 border border-zinc-200 rounded-xl text-teal-700 font-semibold text-sm hover:bg-white transition-colors">
              New Gallery
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-8 pb-12 overflow-x-hidden">
          {/* Header */}
          <header className="mb-12">
            <p className="text-amber-700 font-bold tracking-[0.05em] text-[10px] uppercase mb-2">Workspace Overview</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 mb-4">Good morning, Julian.</h1>
            <div className="flex gap-4">
              <button className="silk-gradient text-white px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-xl hover:opacity-95 transition-all">
                <PlusCircle size={16} />
                Upload Photos
              </button>
              <button className="bg-white text-amber-800 px-6 py-3 rounded-xl font-semibold text-sm border border-zinc-200 hover:bg-orange-50 transition-all">
                Create User
              </button>
            </div>
          </header>

          {/* Stats Bento Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-8 rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
              <div>
                <Images size={24} className="text-teal-600 mb-4" />
                <h4 className="text-sm font-medium text-zinc-500">Total Photos Uploaded</h4>
                <p className="text-3xl font-bold mt-2">12,482</p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold text-teal-600 bg-teal-50 w-fit px-2 py-1 rounded-lg">
                <TrendingUp size={12} />
                +12% THIS WEEK
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
              <div>
                <UserPlus size={24} className="text-amber-700 mb-4" />
                <h4 className="text-sm font-medium text-zinc-500">Total Users Created</h4>
                <p className="text-3xl font-bold mt-2">84</p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold text-amber-700 bg-orange-100 w-fit px-2 py-1 rounded-lg">
                <ShieldCheck size={12} />
                ACTIVE ACCESS
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
              <div>
                <CheckSquare size={24} className="text-teal-700 mb-4" />
                <h4 className="text-sm font-medium text-zinc-500">Total Selected Photos</h4>
                <p className="text-3xl font-bold mt-2">5,210</p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold text-teal-700 bg-zinc-100 w-fit px-2 py-1 rounded-lg">
                <BarChart2 size={12} />
                SELECTION RATE 42%
              </div>
            </div>
          </section>

          {/* Mid Section: Activity & Storage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Client Engagement */}
            <section className="lg:col-span-8 bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold tracking-tight">Client Engagement</h3>
                <button className="text-xs font-bold text-amber-700 tracking-widest uppercase hover:underline">View All Activity</button>
              </div>
              <div className="space-y-6">
                {/* Activity 1 */}
                <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-zinc-50 transition-colors group">
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 ring-2 ring-zinc-200">
                    <img
                      alt="Client Portrait"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLf7jst1tSepvMOJQbyEn_KJ6JCQrGRhrS5ZFoiTkwTkTKBss5aNIJGbeOtnidAsJDpzfERS43JHESw_HTU8xcQnS2Qg9GCK_mbCxizDk5CLE01X8HlqNAtrqzwUuCyy3bmtVNqohAdKDxuP-NvJnueq2mHpt8GvkVmlST4k3vlC-mSW_h1LCQHkavJRrXwUeRYj9vyzaLLQS2cna1NmSflMOEPvBOXAgDW929MZWkmn6qCgGpJjNUROk7IY3dewHCk_2i6DuABmNf"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-zinc-900">New Client Portal: Sarah &amp; James</p>
                      <span className="text-[10px] text-zinc-400 font-medium">2m ago</span>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">Wedding Gallery &quot;Ethereal Blooms&quot; has been published and invitation sent.</p>
                  </div>
                </div>

                {/* Activity 2 */}
                <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-zinc-50 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <Eye size={20} className="text-amber-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-zinc-900">Client Reviewing Photos</p>
                      <span className="text-[10px] text-zinc-400 font-medium">14m ago</span>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">Client is currently reviewing 45 photos in the &quot;Ceremony Highlights&quot; folder.</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-600 w-[65%] rounded-full"></div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700">65%</span>
                    </div>
                  </div>
                </div>

                {/* Activity 3 */}
                <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-zinc-50 transition-colors group">
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 ring-2 ring-zinc-200">
                    <img
                      alt="Wedding Details"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrGBvDu-bnvMEGnP6untUDJnQYKPDpx5O1mCK3m8LHt_M33lMEzphoPriOnR-139m4Fp3pqcNJQlLzs8eRLmwiC-q67YqaU8EDHw1o2nivpKRSpn7gdcMP1aWiU3t5-RyO2cDMIgkREW_BVFQydvD5vAOURZFVoDgWWVKK6iiA5O1-GPxz5faIqT0eeSd7QkWeKTpZxzwJjveVCJxyChdqEFqi2b4x-McYn4F5N25bqkqcwqRuBfL5OPJtkKee0hAhR-2yAj0vh3yT"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-zinc-900">Selection Finalized</p>
                      <span className="text-[10px] text-zinc-400 font-medium">1h ago</span>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">The Anderson Family completed their selection of 120 print-ready images.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Right Column */}
            <section className="lg:col-span-4 space-y-6">
              {/* Cloud Storage Widget */}
              <div className="bg-teal-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold text-lg">Cloud Storage</h3>
                    <CloudCheck size={20} className="opacity-50" />
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-medium mb-2 opacity-80">
                      <span>Used Space</span>
                      <span>1.2 / 2.0 TB</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-300 w-[60%] rounded-full"></div>
                    </div>
                  </div>
                  <p className="text-xs opacity-60 mb-8 leading-relaxed">Your professional archives are currently 60% full. Consider upgrading for peace of mind.</p>
                  <button className="w-full bg-white text-teal-900 py-3 rounded-xl font-bold text-sm hover:bg-teal-50 transition-colors">
                    Upgrade Storage
                  </button>
                </div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-teal-600 blur-3xl opacity-30 rounded-full"></div>
              </div>

              {/* Moodboard Card */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(26,28,28,0.04)] group">
                <div className="relative h-48">
                  <img
                    alt="Moodboard Card"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzyFKRpLf8Eu1tPOQYobLvfjmcQVipHx8vG7Cdzs_C9ju3HVlDsZ8WRtX8p2D_YRJa2aBpg_cAbIAbwttDQzBkrGEE_mJzz49RlJVT8-pnaryTOLjzRh1aNUzv_Zyzx3YZ9bcrW195K8W-qF3iRIrcDoQFGMEJ8q544vyk8i3GTnPcQ2_SpED7LXVt_ZViPzI-7KiL7NkZ91b8vhlTMyaCATlgTCzr795f6psRSop26Xkz6gMPfLZANqXYpUVDEmkcCLrdDXLFCMW7"
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-md p-3 rounded-xl flex justify-between items-center border border-white/20">
                    <div>
                      <p className="text-[10px] font-bold text-amber-700 tracking-widest uppercase">Upcoming shoot</p>
                      <p className="text-sm font-bold text-zinc-900">Monaco Coastline</p>
                    </div>
                    <CalendarDays size={20} className="text-amber-700" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="mt-20 py-8 border-t border-zinc-100 text-center">
            <p className="text-xs text-zinc-400 font-medium">© 2024 The Editorial Union. All photography rights reserved by the respective artists.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
