export function ErrorButton() {
  return (
    <button
      onClick={() => {
        throw new Error('This is a test error from the ErrorButton component');
      }}
      className='mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition-colors'
    >
      Break the world
    </button>
  );
}

export default ErrorButton;
