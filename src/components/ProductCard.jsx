import React from 'react';

const ProductCard = ({ product, onAddToCart }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-lg hover:shadow-xl transition duration-300 flex flex-col justify-between">
      {/* Product Image */}
      <div className="h-48 flex items-center justify-center overflow-hidden mb-4">
        <img
          src={product.image}
          alt={product.title}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      {/* Product Details */}
      <h2 className="text-lg font-semibold text-gray-800 line-clamp-2 mb-2">
        {product.title}
      </h2>
      <p className="text-xl font-bold text-green-600 mb-4">
        ${product.price.toFixed(2)}
      </p>

      {/* Add to Cart Button */}
      <button
        onClick={() => onAddToCart(product)}
        className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
      >
        Add to Cart
      </button>
    </div>
  );
};

export default ProductCard;