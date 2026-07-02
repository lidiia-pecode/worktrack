const Footer = () => {
  return (
    <footer className='bg-blue-400 border-t border-gray-100 py-8 mt-auto'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center items-center'>
        <p className='text-sm text-gray-100'>
          © {new Date().getFullYear()} WorkTrack. Built with Next.js 15.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
