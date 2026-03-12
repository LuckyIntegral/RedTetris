import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import ErrorButton from '../components/ErrorButton';
import { gamesService, type Game, type UserStats } from '../services/games';
import { logoutUser } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

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
    <main className='min-h-screen bg-slate-900'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <header className='text-center mb-12'>
          <h1 className='text-6xl font-bold text-red-500 mb-4'>RED TETRIS</h1>
          <p className='text-lg text-gray-400'>Multiplayer Tetris</p>
        </header>

        {user && (
          <div className='max-w-6xl mx-auto space-y-8'>
            {/* Profile Section */}
            <div className='max-w-md mx-auto'>
              <div className='bg-gray-900 rounded-xl p-6 border border-gray-600'>
                <div className='text-center mb-6'>
                  <div className='w-20 h-20 bg-red-500/20 border border-red-500/30 rounded-full mx-auto mb-4 flex items-center justify-center'>
                    <span className='text-2xl font-bold text-red-400'>{user.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <h2 className='text-2xl font-bold text-white mb-2'>{user.username}</h2>
                  <p className='text-gray-300 text-sm'>{user.email}</p>
                  <p className='text-gray-400 text-xs mt-1'>
                    Member since {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className='w-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-600 rounded-lg px-4 py-2 text-sm font-medium transition-colors'
                >
                  Logout
                </button>
                {import.meta.env.DEV && (
                  <div className='text-center mt-3'>
                    <ErrorButton />
                  </div>
                )}
              </div>
            </div>

            {/* Game Action Section */}
            <div className='text-center'>
              <Link
                to='/game'
                className='inline-block bg-red-600 hover:bg-red-500 text-white font-bold text-2xl px-12 py-6 rounded-xl transition-colors'
              >
                PLAY NOW
              </Link>
              <p className='text-gray-300 mt-4 text-lg'>Ready to drop some blocks?</p>
            </div>

            {/* Stats Grid */}
            <div className='bg-gray-900 rounded-xl p-6 border border-gray-600'>
              <h3 className='text-2xl font-bold text-white mb-6 text-center'>Your Stats</h3>
              {statsLoading ? (
                <div className='text-center py-8'>
                  <div className='w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3'></div>
                  <p className='text-gray-500 text-sm'>Loading stats...</p>
                </div>
              ) : stats && stats.gamesPlayed > 0 ? (
                <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                  <div className='bg-gray-800 rounded-lg p-4 text-center border border-gray-600'>
                    <div className='text-2xl font-bold text-white'>{stats.gamesPlayed}</div>
                    <div className='text-gray-400 text-sm'>Games Played</div>
                  </div>
                  <div className='bg-gray-800 rounded-lg p-4 text-center border border-gray-600'>
                    <div className='text-2xl font-bold text-white'>{stats.highScore.toLocaleString()}</div>
                    <div className='text-gray-400 text-sm'>High Score</div>
                  </div>
                  <div className='bg-gray-800 rounded-lg p-4 text-center border border-gray-600'>
                    <div className='text-2xl font-bold text-green-400'>{stats.wins}</div>
                    <div className='text-gray-400 text-sm'>Wins</div>
                  </div>
                  <div className='bg-gray-800 rounded-lg p-4 text-center border border-gray-600'>
                    <div className='text-2xl font-bold text-white'>{stats.averageScore.toLocaleString()}</div>
                    <div className='text-gray-400 text-sm'>Avg Score</div>
                  </div>
                  <div className='bg-gray-800 rounded-lg p-4 text-center border border-gray-600'>
                    <div className='text-2xl font-bold text-white'>{stats.winRate}%</div>
                    <div className='text-gray-400 text-sm'>Win Rate</div>
                  </div>
                  <div className='bg-gray-800 rounded-lg p-4 text-center border border-gray-600'>
                    <div className='text-2xl font-bold text-white'>#{stats.bestPlace}</div>
                    <div className='text-gray-400 text-sm'>Best Place</div>
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
              <div className='bg-gray-900 rounded-xl p-6 border border-gray-600'>
                <h3 className='text-2xl font-bold text-white mb-6 text-center'>Recent Games</h3>
                <div className='space-y-3'>
                  {recentGames.map((game) => {
                    const myRecord = game.players.find((p) => p.player.id === user.id);
                    return (
                      <div
                        key={game.game_id}
                        className='bg-gray-800 rounded-lg p-4 border border-gray-600 flex items-center justify-between'
                      >
                        <div className='flex items-center gap-4'>
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              myRecord?.place === 1
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                : 'bg-gray-700 text-gray-300 border border-gray-600'
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
                          <div className='text-white font-bold'>{myRecord?.score.toLocaleString() ?? 0}</div>
                          <div className='text-gray-500 text-xs'>points</div>
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
