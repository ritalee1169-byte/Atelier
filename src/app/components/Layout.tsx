import { Link, Outlet, useLocation } from "react-router";
import { ShoppingBag, Package, Menu, X, User, Search } from "lucide-react";
import { useState } from "react";

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/products", label: "Products" },
  ];

  // Close search on ESC key
  useState(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };

    if (searchOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  });

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#1a1a1a]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#fafaf8]/80 backdrop-blur-md border-b border-[#e5e5e0]">
        <nav className="max-w-[1400px] mx-auto px-6 lg:px-12 py-6 flex items-center justify-between">
          <Link
            to="/"
            className="text-[2rem] tracking-tight transition-opacity hover:opacity-60"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Atelier
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-[0.9375rem] tracking-wide transition-opacity hover:opacity-60 ${
                  location.pathname === link.path ? 'opacity-100' : 'opacity-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="hidden md:flex transition-opacity hover:opacity-60"
              title="Search"
            >
              <Search className="w-5 h-5" strokeWidth={1.5} />
            </button>

            <div
              className="hidden md:flex opacity-40 cursor-not-allowed"
              title="Coming Soon"
            >
              <User className="w-5 h-5" strokeWidth={1.5} />
            </div>

            <Link
              to="/cart"
              className="relative transition-opacity hover:opacity-60"
              title="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
            </Link>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden transition-opacity hover:opacity-60"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {searchOpen && (
          <div className="border-t border-[#e5e5e0] bg-[#fafaf8] px-6 lg:px-12 py-6">
            <div className="max-w-[1400px] mx-auto">
              <form className="relative" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="text"
                  placeholder="Search for products..."
                  className="w-full px-6 py-4 pr-24 bg-white border border-[#1a1a1a] focus:outline-none text-[1.0625rem]"
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="p-2 transition-opacity hover:opacity-60"
                  >
                    <Search className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="p-2 transition-opacity hover:opacity-60"
                  >
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {menuOpen && (
          <div className="md:hidden border-t border-[#e5e5e0] bg-[#fafaf8] px-6 py-8">
            {navLinks.map((link, i) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className="block py-3 text-[1.125rem] tracking-wide transition-opacity hover:opacity-60"
                style={{
                  fontFamily: 'var(--font-display)',
                  animation: `slideIn 0.3s ease-out ${i * 0.1}s both`
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="pt-24">
        <Outlet />
      </main>

      <footer className="border-t border-[#e5e5e0] bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <h3
                className="text-[2rem] tracking-tight mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Atelier
              </h3>
              <p className="text-[0.9375rem] leading-[1.8] text-[#666] max-w-[360px]">
                Natural handmade soap from Southwest China. Crafted with botanical ingredients and traditional methods.
              </p>
            </div>

            <div>
              <h4 className="text-[0.8125rem] tracking-widest uppercase mb-4">Shop</h4>
              <nav className="space-y-3">
                <Link to="/products" className="block text-[0.9375rem] text-[#666] hover:text-[#1a1a1a] transition-colors">
                  All Products
                </Link>
                <Link to="/cart" className="block text-[0.9375rem] text-[#666] hover:text-[#1a1a1a] transition-colors">
                  Shopping Cart
                </Link>
                <Link to="/orders" className="block text-[0.9375rem] text-[#666] hover:text-[#1a1a1a] transition-colors">
                  Orders
                </Link>
              </nav>
            </div>

            <div>
              <h4 className="text-[0.8125rem] tracking-widest uppercase mb-4">Connect</h4>
              <nav className="space-y-3">
                <a href="#" className="block text-[0.9375rem] text-[#666] hover:text-[#1a1a1a] transition-colors">
                  Instagram
                </a>
                <a href="#" className="block text-[0.9375rem] text-[#666] hover:text-[#1a1a1a] transition-colors">
                  Facebook
                </a>
                <a href="#" className="block text-[0.9375rem] text-[#666] hover:text-[#1a1a1a] transition-colors">
                  Email Us
                </a>
              </nav>
            </div>
          </div>

          <div className="pt-8 border-t border-[#e5e5e0] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[0.8125rem] text-[#999]">
              © 2026 Atelier. All rights reserved.
            </p>
            <div className="flex gap-8">
              <a href="#" className="text-[0.8125rem] text-[#999] hover:text-[#1a1a1a] transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-[0.8125rem] text-[#999] hover:text-[#1a1a1a] transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
