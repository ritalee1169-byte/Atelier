import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ArrowLeft, Lock, Search } from "lucide-react";
import { useState } from "react";

const cartItems = [
  {
    id: 1,
    name: "Rose Whisper",
    price: 12,
    image: "https://images.unsplash.com/photo-1620567838728-6406c0366f30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    quantity: 2
  },
  {
    id: 2,
    name: "Charcoal Cleanse",
    price: 13,
    image: "https://images.unsplash.com/photo-1620567838672-a4a88a011a67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    quantity: 1
  }
];

export function Checkout() {
  const [promoCode, setPromoCode] = useState("");
  const [useShippingForBilling, setUseShippingForBilling] = useState(true);
  const [savePaymentInfo, setSavePaymentInfo] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 5;
  const tax = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + shipping + tax;

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8 pb-32">
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-[0.875rem] tracking-wide mb-8 transition-opacity hover:opacity-60"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back to Cart
        </Link>

        <h1
          className="text-[3.5rem] lg:text-[4.5rem] tracking-tight mb-16"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
          {/* Left Column - Form */}
          <div className="lg:col-span-3">
            <form className="space-y-12">
              {/* Contact Information */}
              <section>
                <h2
                  className="text-[2rem] tracking-tight mb-6"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Contact
                </h2>
                <div>
                  <label htmlFor="email" className="block text-[0.875rem] mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 bg-white border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                    placeholder="your@email.com"
                  />
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-[0.875rem] text-[#666]">
                      Email me with news and offers
                    </span>
                  </label>
                </div>
              </section>

              {/* Shipping Information */}
              <section>
                <h2
                  className="text-[2rem] tracking-tight mb-6"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Delivery
                </h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="country" className="block text-[0.875rem] mb-2">
                      Country / Region
                    </label>
                    <select
                      id="country"
                      className="w-full px-4 py-3 bg-white border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                    >
                      <option>United States</option>
                      <option>Canada</option>
                      <option>United Kingdom</option>
                      <option>Australia</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-[0.875rem] mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        className="w-full px-4 py-3 bg-white border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-[0.875rem] mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        className="w-full px-4 py-3 bg-white border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-[0.875rem] mb-2">
                      Company (optional)
                    </label>
                    <input
                      type="text"
                      id="company"
                      className="w-full px-4 py-3 bg-white border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-[0.875rem] mb-2">
                      Address
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="address"
                        className="w-full px-4 py-3 pr-10 bg-white border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                        placeholder="Search address"
                      />
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" strokeWidth={1.5} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="apartment" className="block text-[0.875rem] mb-2">
                      Apartment, suite, etc. (optional)
                    </label>
                    <input
                      type="text"
                      id="apartment"
                      className="w-full px-4 py-3 bg-white border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-[0.875rem] mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        id="city"
                        className="w-full px-4 py-3 bg-white border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="state" className="block text-[0.875rem] mb-2">
                        State / Province
                      </label>
                      <select
                        id="state"
                        className="w-full px-4 py-3 bg-white border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                      >
                        <option>Select...</option>
                        <option>California</option>
                        <option>New York</option>
                        <option>Texas</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="zip" className="block text-[0.875rem] mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        id="zip"
                        className="w-full px-4 py-3 bg-white border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-[0.875rem] mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      className="w-full px-4 py-3 bg-white border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </section>

              {/* Shipping Method */}
              <section>
                <h2
                  className="text-[2rem] tracking-tight mb-4"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Shipping Method
                </h2>
                <p className="text-[0.875rem] text-[#666] mb-4">
                  Select your preferred shipping method
                </p>
                <div className="bg-white border border-[#e5e5e0] divide-y divide-[#e5e5e0]">
                  <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#fafaf8] transition-colors">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="shipping" defaultChecked className="w-4 h-4" />
                      <span className="text-[0.9375rem]">Standard Shipping</span>
                    </div>
                    <span className="text-[0.9375rem]">$5.00</span>
                  </label>
                  <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#fafaf8] transition-colors">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="shipping" className="w-4 h-4" />
                      <span className="text-[0.9375rem]">Express Shipping</span>
                    </div>
                    <span className="text-[0.9375rem]">$15.00</span>
                  </label>
                </div>
              </section>

              {/* Payment */}
              <section>
                <h2
                  className="text-[2rem] tracking-tight mb-4"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Payment
                </h2>
                <p className="text-[0.875rem] text-[#666] mb-6">
                  All transactions are secure and encrypted.
                </p>

                <div className="bg-white border border-[#e5e5e0] p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-[0.9375rem]">Credit Card</span>
                    <div className="flex gap-1 ml-auto">
                      <div className="w-8 h-5 bg-[#1434CB] rounded flex items-center justify-center text-white text-[0.5rem]">VISA</div>
                      <div className="w-8 h-5 bg-[#EB001B] rounded"></div>
                      <div className="w-8 h-5 bg-[#016FD0] rounded"></div>
                      <div className="w-8 h-5 bg-[#FF6000] rounded"></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="cardNumber" className="block text-[0.875rem] mb-2">
                        Card Number
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="cardNumber"
                          className="w-full px-4 py-3 bg-[#f9f7f4] border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                          placeholder="1234 5678 9012 3456"
                        />
                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" strokeWidth={1.5} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="expiry" className="block text-[0.875rem] mb-2">
                          Expiration (MM/YY)
                        </label>
                        <input
                          type="text"
                          id="expiry"
                          className="w-full px-4 py-3 bg-[#f9f7f4] border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                          placeholder="MM / YY"
                        />
                      </div>
                      <div>
                        <label htmlFor="cvv" className="block text-[0.875rem] mb-2">
                          Security Code
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="cvv"
                            className="w-full px-4 py-3 bg-[#f9f7f4] border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                            placeholder="CVV"
                          />
                          <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" strokeWidth={1.5} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="cardName" className="block text-[0.875rem] mb-2">
                        Name on Card
                      </label>
                      <input
                        type="text"
                        id="cardName"
                        className="w-full px-4 py-3 bg-[#f9f7f4] border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
                      />
                    </div>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useShippingForBilling}
                        onChange={(e) => setUseShippingForBilling(e.target.checked)}
                        className="w-4 h-4 mt-0.5"
                      />
                      <span className="text-[0.875rem] text-[#666]">
                        Use shipping address as billing address
                      </span>
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={savePaymentInfo}
                      onChange={(e) => setSavePaymentInfo(e.target.checked)}
                      className="w-4 h-4 mt-0.5"
                    />
                    <span className="text-[0.875rem] text-[#666]">
                      Save my information for faster checkout next time
                    </span>
                  </label>
                </div>
              </section>

              <button
                type="submit"
                className="w-full bg-[#1a1a1a] text-white py-4 px-8 text-[0.9375rem] tracking-wide transition-opacity hover:opacity-90"
              >
                Complete Order
              </button>

              <p className="text-[0.75rem] text-[#999] text-center">
                By placing your order, you agree to our{" "}
                <a href="#" className="underline hover:text-[#666]">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="underline hover:text-[#666]">Privacy Policy</a>
              </p>
            </form>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-32">
              <div className="bg-white p-8 border border-[#e5e5e0]">
                <h2
                  className="text-[1.75rem] tracking-tight mb-6"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Order Summary
                </h2>

                <div className="space-y-4 mb-6 pb-6 border-b border-[#e5e5e0]">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="relative w-20 h-20 bg-[#f5f5f3] flex-shrink-0 rounded">
                        <ImageWithFallback
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover rounded"
                        />
                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#1a1a1a] text-white text-[0.75rem] rounded-full flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <p className="text-[0.9375rem]">{item.name}</p>
                        <p className="text-[0.875rem] text-[#666]">${item.price}</p>
                      </div>
                      <div className="flex items-center">
                        <p className="text-[0.9375rem]">${item.price * item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mb-6 pb-6 border-b border-[#e5e5e0]">
                  <label htmlFor="promoCode" className="block text-[0.875rem] mb-2">
                    Discount Code or Gift Card
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="promoCode"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 px-4 py-2 bg-[#f9f7f4] border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors text-[0.875rem]"
                      placeholder="Enter code"
                    />
                    <button className="px-6 py-2 border border-[#1a1a1a] text-[0.875rem] tracking-wide hover:bg-[#1a1a1a] hover:text-white transition-colors">
                      Apply
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mb-6 pb-6 border-b border-[#e5e5e0]">
                  <div className="flex justify-between text-[0.9375rem]">
                    <span className="text-[#666]">Subtotal · {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</span>
                    <span>${subtotal}</span>
                  </div>
                  <div className="flex justify-between text-[0.9375rem]">
                    <span className="text-[#666]">Shipping</span>
                    <span>Calculated at next step</span>
                  </div>
                  <div className="flex justify-between text-[0.9375rem]">
                    <span className="text-[#666]">Estimated Tax</span>
                    <span>${tax}</span>
                  </div>
                </div>

                <div className="flex justify-between text-[1.25rem] mb-2">
                  <span style={{ fontFamily: 'var(--font-display)' }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-display)' }}>
                    <span className="text-[0.75rem] text-[#999] mr-2">USD</span>
                    ${total}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
