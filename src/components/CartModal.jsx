import React from 'react';

const CartModal = ({ isOpen, onClose, cartItems, onRemoveFromCart }) => {
  if (!isOpen) return null;

  return (
    // Modal Overlay
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      
      {/* Modal Content */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            Shopping Cart ({cartItems.length} Items)
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl leading-none">
            &times; {/* HTML entity for multiplication sign / close button */}
          </button>
        </div>

        {/* Cart Items List */}
        <div className="p-5 overflow-y-auto flex-grow">
          {cartItems.length === 0 ? (
            <p className="text-center text-gray-500 py-10">Your cart is empty. Start shopping!</p>
          ) : (
            <div className="space-y-4">
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                  <div className="flex items-center space-x-4">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-16 object-contain rounded"
                    />
                    <div>
                      <h3 className="font-medium line-clamp-2">{item.title}</h3>
                      <p className="text-green-600 font-semibold">${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => onRemoveFromCart(item.id)}
                    className="ml-4 px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition duration-300 flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer/Summary */}
        <div className="p-5 border-t">
          <p className="text-xl font-bold flex justify-between">
            <span>Total:</span>
            <span className="text-indigo-600">
              ${cartItems.reduce((acc, item) => acc + item.price, 0).toFixed(2)}
            </span>
          </p>
          <button
            onClick={onClose}
            className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
          >
            Close & Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartModal;