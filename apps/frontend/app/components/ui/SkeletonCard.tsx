const SkeletonCard = () => {
  return (
    <div className='p-6 border rounded-xl shadow-sm bg-white border-gray-100 animate-pulse'>
      <div className='flex justify-between items-start mb-4'>
        <div className='h-7 bg-gray-200 rounded-md w-1/2' />
        <div className='h-6 bg-gray-100 rounded-full w-24' />
      </div>
      <div className='space-y-2 mb-6'>
        <div className='h-4 bg-gray-100 rounded w-full' />
        <div className='h-4 bg-gray-100 rounded w-5/6' />
      </div>
      <div className='flex gap-4'>
        <div className='h-4 bg-gray-50 rounded w-20' />
        <div className='h-4 bg-gray-50 rounded w-24' />
      </div>
    </div>
  );
};

export default SkeletonCard;
