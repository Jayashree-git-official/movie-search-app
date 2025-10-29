import React from 'react';

const Navbar = ({ cartCount, onCartClick }) => {
  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="text-2xl font-extrabold text-indigo-600">
          BuyBestOne
        </div>
        
        {/* Cart Button with Count */}
        <button
          onClick={onCartClick}
          className="relative px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition duration-300"
        >
          🛒 Cart
          <span className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-red-500 text-xs font-bold rounded-full border-2 border-white">
            {cartCount}
          </span>
        </button>
      </nav>
    </header>
  );
};

export default Navbar;