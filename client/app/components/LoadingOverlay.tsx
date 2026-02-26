export function LoadingOverlay() {
  return (
    <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
      <div className='bg-gray-900 rounded-xl p-6 border border-gray-600'>
        <div className='text-center'>
          <div className='w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-300 font-medium'>Loading...</p>
        </div>
      </div>
    </div>
  );
}
