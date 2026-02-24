export function LoadingOverlay() {
  return (
    <div className='fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50'>
      <div className='bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl'>
        <div className='text-center'>
          <div className='w-12 h-12 mx-auto mb-4'>
            <div className='grid grid-cols-3 gap-1 w-12 h-12'>
              <div
                className='bg-cyan-400 rounded-sm animate-pulse'
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className='bg-purple-400 rounded-sm animate-pulse'
                style={{ animationDelay: '100ms' }}
              ></div>
              <div
                className='bg-cyan-400 rounded-sm animate-pulse'
                style={{ animationDelay: '200ms' }}
              ></div>
              <div
                className='bg-purple-400 rounded-sm animate-pulse'
                style={{ animationDelay: '300ms' }}
              ></div>
              <div
                className='bg-cyan-400 rounded-sm animate-pulse'
                style={{ animationDelay: '400ms' }}
              ></div>
              <div
                className='bg-purple-400 rounded-sm animate-pulse'
                style={{ animationDelay: '500ms' }}
              ></div>
              <div
                className='bg-cyan-400 rounded-sm animate-pulse'
                style={{ animationDelay: '600ms' }}
              ></div>
              <div
                className='bg-purple-400 rounded-sm animate-pulse'
                style={{ animationDelay: '700ms' }}
              ></div>
              <div
                className='bg-cyan-400 rounded-sm animate-pulse'
                style={{ animationDelay: '800ms' }}
              ></div>
            </div>
          </div>
          <p className='text-white font-medium animate-pulse'>Loading...</p>
        </div>
      </div>
    </div>
  );
}
