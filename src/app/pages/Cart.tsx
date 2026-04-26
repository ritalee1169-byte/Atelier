import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { X, ArrowRight } from "lucide-react";
import { useState } from "react";

const initialCartItems = [
  {
    id: 1,
    name: "Rose Whisper",
    price: 12,
    image: "https://images.unsplash.com/photo-1620567838728-6406c0366f30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    quantity: 1
  },
  {
    id: 2,
    name: "Charcoal Cleanse",
    price: 13,
    image: "https://images.unsplash.com/photo-1620567838672-a4a88a011a67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    quantity: 1
  }
];

export function Cart() {
  const [cartItems, setCartItems] = useState(initialCartItems);

  const updateQuantity = (id: number, delta: number) => {
    setCartItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removeItem = (id: number) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 5;
  const total = subtotal + shipping;

  if (cartItems.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 pb-32 text-center">
        <h1
          className="text-[3rem] tracking-tight mb-6"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Your cart is empty
        </h1>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-[0.9375rem] tracking-wide border-b border-[#1a1a1a] pb-1 transition-opacity hover:opacity-60"
        >
          Continue Shopping
          <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 pb-32">
      <h1
        className="text-[4rem] lg:text-[5rem] tracking-tight mb-16"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Shopping Cart
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2 space-y-8">
          {cartItems.map((item, i) => (
            <div
              key={item.id}
              className="flex gap-6 pb-8 border-b border-[#e5e5e0]"
              style={{ animation: `fadeIn 0.5s ease-out ${0.1 * i}s both` }}
            >
              <Link to={`/product/${item.id}`} className="w-32 h-40 bg-white flex-shrink-0">
                <ImageWithFallback
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </Link>

              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <Link
                    to={`/product/${item.id}`}
                    className="text-[1.5rem] tracking-tight hover:opacity-60 transition-opacity"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {item.name}
                  </Link>
                  <p className="text-[1rem] mt-2">${item.price}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center border border-[#e5e5e0]">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="px-4 py-2 text-[0.875rem] hover:bg-[#f5f5f3] transition-colors"
                    >
                      −
                    </button>
                    <span className="px-5 py-2 text-[0.875rem] border-x border-[#e5e5e0]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="px-4 py-2 text-[0.875rem] hover:bg-[#f5f5f3] transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 hover:opacity-60 transition-opacity"
                  >
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className="lg:col-span-1"
          style={{ animation: 'fadeIn 0.6s ease-out 0.2s both' }}
        >
          <div className="bg-white p-8 sticky top-32">
            <h2
              className="text-[2rem] tracking-tight mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Summary
            </h2>

            <div className="space-y-4 mb-6 pb-6 border-b border-[#e5e5e0]">
              <div className="flex justify-between text-[0.9375rem]">
                <span className="text-[#666]">Subtotal</span>
                <span>${subtotal}</span>
              </div>
              <div className="flex justify-between text-[0.9375rem]">
                <span className="text-[#666]">Shipping</span>
                <span>${shipping}</span>
              </div>
            </div>

            <div className="flex justify-between text-[1.25rem] mb-8">
              <span style={{ fontFamily: 'var(--font-display)' }}>Total</span>
              <span style={{ fontFamily: 'var(--font-display)' }}>${total}</span>
            </div>

            <Link
              to="/checkout"
              className="w-full bg-[#1a1a1a] text-white py-4 px-8 text-[0.9375rem] tracking-wide transition-opacity hover:opacity-90 mb-4 block text-center"
            >
              Proceed to Checkout
            </Link>

            <Link
              to="/products"
              className="block text-center text-[0.875rem] tracking-wide transition-opacity hover:opacity-60"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
