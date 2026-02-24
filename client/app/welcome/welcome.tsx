import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logoutUser } from '../store/authSlice';
import { Link } from 'react-router';
import { gamesService, type Game, type UserStats } from '../services/games';

export function Welcome() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const allGames = await gamesService.getAllGames();
        if (cancelled) return;
        const computed = gamesService.computeStats(allGames, user.id);
        setStats(computed);
        setRecentGames(allGames.slice(0, 5));
      } catch (err) {
        console.warn('Failed to load game stats', err);
        if (!cancelled) setStats({ gamesPlayed: 0, wins: 0, winRate: 0, highScore: 0, averageScore: 0, bestPlace: 0 });
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleLogout = () => {
    void dispatch(logoutUser());
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
            {/* Profile Section */}
            <div className='max-w-md mx-auto'>
              <div className='bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl'>
                <div className='text-center mb-6'>
                  <div className='w-20 h-20 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center'>
                    <span className='text-2xl font-bold text-white'>{user.username.charAt(0).toUpperCase()}</span>
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
              {statsLoading ? (
                <div className='text-center py-8'>
                  <div className='w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3'></div>
                  <p className='text-gray-400 text-sm'>Loading stats...</p>
                </div>
              ) : stats && stats.gamesPlayed > 0 ? (
                <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                  <div className='bg-white/5 rounded-xl p-4 text-center border border-white/10'>
                    <div className='text-2xl font-bold text-cyan-400'>{stats.gamesPlayed}</div>
                    <div className='text-gray-300 text-sm'>Games Played</div>
                  </div>
                  <div className='bg-white/5 rounded-xl p-4 text-center border border-white/10'>
                    <div className='text-2xl font-bold text-purple-400'>{stats.highScore.toLocaleString()}</div>
                    <div className='text-gray-300 text-sm'>High Score</div>
                  </div>
                  <div className='bg-white/5 rounded-xl p-4 text-center border border-white/10'>
                    <div className='text-2xl font-bold text-green-400'>{stats.wins}</div>
                    <div className='text-gray-300 text-sm'>Wins</div>
                  </div>
                  <div className='bg-white/5 rounded-xl p-4 text-center border border-white/10'>
                    <div className='text-2xl font-bold text-yellow-400'>{stats.averageScore.toLocaleString()}</div>
                    <div className='text-gray-300 text-sm'>Avg Score</div>
                  </div>
                  <div className='bg-white/5 rounded-xl p-4 text-center border border-white/10'>
                    <div className='text-2xl font-bold text-blue-400'>{stats.winRate}%</div>
                    <div className='text-gray-300 text-sm'>Win Rate</div>
                  </div>
                  <div className='bg-white/5 rounded-xl p-4 text-center border border-white/10'>
                    <div className='text-2xl font-bold text-pink-400'>#{stats.bestPlace}</div>
                    <div className='text-gray-300 text-sm'>Best Place</div>
                  </div>
                </div>
              ) : (
                <div className='text-center py-8'>
                  <p className='text-gray-400 text-lg'>No games played yet</p>
                  <p className='text-gray-500 text-sm mt-1'>Play your first game to see your stats!</p>
                </div>
              )}
            </div>

            {/* Recent Games */}
            {recentGames.length > 0 && (
              <div className='bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl'>
                <h3 className='text-2xl font-bold text-white mb-6 text-center'>Recent Games</h3>
                <div className='space-y-3'>
                  {recentGames.map((game) => {
                    const myRecord = game.players.find((p) => p.player.id === user.id);
                    return (
                      <div
                        key={game.game_id}
                        className='bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between'
                      >
                        <div className='flex items-center gap-4'>
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              myRecord?.place === 1
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30'
                                : 'bg-white/10 text-gray-300 border border-white/10'
                            }`}
                          >
                            #{myRecord?.place ?? '?'}
                          </div>
                          <div>
                            <div className='text-white font-medium'>
                              {game.players.length} player{game.players.length !== 1 ? 's' : ''}
                            </div>
                            <div className='text-gray-400 text-xs'>
                              {new Date(game.finished_at).toLocaleDateString()} at{' '}
                              {new Date(game.finished_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='text-cyan-400 font-bold'>{myRecord?.score.toLocaleString() ?? 0}</div>
                          <div className='text-gray-400 text-xs'>points</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
