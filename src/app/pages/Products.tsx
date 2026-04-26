import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useState, useEffect } from "react";
import { useShopifyProducts } from "../../hooks/useShopifyProducts";

// Mock data as fallback (used when Shopify is not configured)
const mockProducts = [
  {
    id: "rose-whisper",
    name: "Rose Whisper",
    price: "$12",
    image: "https://images.unsplash.com/photo-1620567838728-6406c0366f30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    category: "Classic"
  },
  {
    id: "charcoal-cleanse",
    name: "Charcoal Cleanse",
    price: "$13",
    image: "https://images.unsplash.com/photo-1620567838672-a4a88a011a67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    category: "Deep Clean"
  },
  {
    id: "jasmine-garden",
    name: "Jasmine Garden",
    price: "$12",
    image: "https://images.unsplash.com/photo-1624459310096-78ea56ad7e05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    category: "Soothing"
  },
  {
    id: "lavender-dream",
    name: "Lavender Dream",
    price: "$12",
    image: "https://images.unsplash.com/photo-1618840392854-0adfa1a86798?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    category: "Soothing"
  },
  {
    id: "orange-blossom",
    name: "Orange Blossom",
    price: "$13",
    image: "https://images.unsplash.com/photo-1620567927898-a39a7d926659?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    category: "Classic"
  },
  {
    id: "white-tea-essence",
    name: "White Tea Essence",
    price: "$13",
    image: "https://images.unsplash.com/photo-1652233172336-6efc037a3766?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    category: "Fresh"
  },
  {
    id: "herbal-balance",
    name: "Herbal Balance",
    price: "$12",
    image: "https://images.unsplash.com/photo-1620567838715-4fc924689483?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    category: "Deep Clean"
  },
  {
    id: "rainbow-collection",
    name: "Rainbow Collection",
    price: "$28",
    image: "https://images.unsplash.com/photo-1774124055560-37a5ff05617e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    category: "Gift Set"
  }
];

const categories = ["All", "Classic", "Deep Clean", "Soothing", "Fresh", "Gift Set"];

export function Products() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { products: shopifyProducts, loading, error } = useShopifyProducts();

  // Use Shopify products if available, otherwise use mock data
  const allProducts = shopifyProducts.length > 0 ? shopifyProducts : mockProducts;

  const filteredProducts = selectedCategory === "All"
    ? allProducts
    : allProducts.filter(p => p.category === selectedCategory);

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 pb-32">
      <h1
        className="text-[4rem] lg:text-[5rem] tracking-tight mb-12"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        All Products
      </h1>

      <div className="flex gap-4 mb-16 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 text-[0.875rem] tracking-wide whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white text-[#666] hover:bg-[#f5f5f3] font-light'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
        {filteredProducts.map((product, i) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="group"
            style={{ animation: `fadeIn 0.5s ease-out ${0.05 * i}s both` }}
          >
            <div className="aspect-[3/4] bg-white mb-5 overflow-hidden">
              <ImageWithFallback
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[0.75rem] tracking-widest uppercase text-[#999]">
                {product.category}
              </p>
              <h3
                className="text-[1.25rem] tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {product.name}
              </h3>
              <p className="text-[0.9375rem]">{product.price}</p>
            </div>
          </Link>
        ))}
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
