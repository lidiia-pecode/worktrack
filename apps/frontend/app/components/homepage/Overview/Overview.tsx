export const Overview = () => {
  return (
    <div className='flex flex-col items-center justify-center py-32 text-center mx-auto'>
      <div className='mb-6 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold tracking-wide uppercase'>
        Next.js 15 & TypeORM
      </div>
      <h1 className='text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight'>
        Welcome to my project
      </h1>
      <p className='text-lg text-gray-500 max-w-lg mx-auto leading-relaxed'>
        A simple and efficient way to track your projects, tasks, and time.
        Explore the Projects tab to get started.
      </p>
    </div>
  );
};
