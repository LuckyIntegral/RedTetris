import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logoutUser } from '../store/authSlice';
import { Link } from 'react-router';

export function Welcome() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    void dispatch(logoutUser());
  };

  // Mock stats for now - these would come from the backend later
  const userStats = {
    gamesPlayed: 42,
    highScore: 15420,
    bestCombo: 8,
    averageScore: 7830,
    winRate: 68,
    totalPlayTime: '24h 15m'
  };

  return (
    <main className='min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <header className='text-center mb-12'>
          <h1 className='text-6xl font-bold text-white mb-4 drop-shadow-lg'>
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400'>
              RED TETRIS
            </span>
          </h1>
          <p className='text-xl text-gray-300'>The Ultimate Multiplayer Tetris Experience</p>
        </header>

        {user && (
          <div className='max-w-6xl mx-auto space-y-8'>
            {/* Profile Section - Above play button on all devices */}
            <div className='max-w-md mx-auto'>
              <div className='bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl'>
                <div className='text-center mb-6'>
                  <div className='w-20 h-20 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center'>
                    <span className='text-2xl font-bold text-white'>
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h2 className='text-2xl font-bold text-white mb-2'>{user.username}</h2>
                  <p className='text-gray-300 text-sm'>{user.email}</p>
                  <p className='text-gray-400 text-xs mt-1'>
                    Member since {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <button
                  onClick={handleLogout}
                  className='w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border border-red-400/30 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 backdrop-blur-sm'
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Game Action Section */}
            <div className='text-center'>
              <Link
                to='/game'
                className='inline-block bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold text-2xl px-12 py-6 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 hover:shadow-cyan-500/25'
              >
                🎮 PLAY NOW
              </Link>
              <p className='text-gray-300 mt-4 text-lg'>Ready to drop some blocks?</p>
            </div>

            {/* Stats Grid */}
            <div className='bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl'>
              <h3 className='text-2xl font-bold text-white mb-6 text-center'>Your Stats</h3>
              <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                <div className='bg-white/5 rounded-xl p-4 text-center border border-white/10'>
                  <div className='text-2xl font-bold text-cyan-400'>{userStats.gamesPlayed}</div>
                  <div className='text-gray-300 text-sm'>Games Played</div>
                </div>
                <div className='bg-white/5 rounded-xl p-4 text-center border border-white/10'>
                  <div className='text-2xl font-bold text-purple-400'>{userStats.highScore.toLocaleString()}</div>
                  <div className='text-gray-300 text-sm'>High Score</div>
                </div>
                <div className='bg-white/5 rounded-xl p-4 text-center border border-white/10'>
                  <div className='text-2xl font-bold text-green-400'>{userStats.bestCombo}x</div>
                  <div className='text-gray-300 text-sm'>Best Combo</div>
                </div>
                <div className='bg-white/5 rounded-xl p-4 text-center border border-white/10'>
                  <div className='text-2xl font-bold text-yellow-400'>{userStats.averageScore.toLocaleString()}</div>
                  <div className='text-gray-300 text-sm'>Avg Score</div>
                </div>
                <div className='bg-white/5 rounded-xl p-4 text-center border border-white/10'>
                  <div className='text-2xl font-bold text-blue-400'>{userStats.winRate}%</div>
                  <div className='text-gray-300 text-sm'>Win Rate</div>
                </div>
                <div className='bg-white/5 rounded-xl p-4 text-center border border-white/10'>
                  <div className='text-2xl font-bold text-pink-400'>{userStats.totalPlayTime}</div>
                  <div className='text-gray-300 text-sm'>Play Time</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

