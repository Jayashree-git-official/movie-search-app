import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import CartModal from './components/CartModal';

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Fetch products from Fake Store API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('https://fakestoreapi.com/products');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  // 2. Add product to cart logic
  const addToCart = (product) => {
    const isProductInCart = cart.some(item => item.id === product.id);

    if (isProductInCart) {
      alert('Item already added to the cart');
      return;
    }

    setCart([...cart, product]);
  };

  // 3. Remove product from cart logic
  const removeFromCart = (productId) => {
    const updatedCart = cart.filter(item => item.id !== productId);
    setCart(updatedCart);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar with Cart Count and Modal Trigger */}
      <Navbar
        cartCount={cart.length}
        onCartClick={() => setIsModalOpen(true)}
      />

      <main className="container mx-auto p-4">
        <h1 className="text-3xl font-bold text-center my-6 text-gray-800">
          🛍️ Our Product Catalog
        </h1>
        
        {/* Product Grid - Responsive Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
            />
          ))}
        </div>
      </main>

      {/* Cart Modal Component */}
      <CartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cartItems={cart}
        onRemoveFromCart={removeFromCart}
      />
    </div>
  );
}

export default App;