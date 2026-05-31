import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem } from '../types/product';
import { toast } from 'sonner';
import { getEffectivePrice } from '../utils/multibuy';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartSubtotal: () => number;
  getCustomerDiscount: () => number;
  getCartCount: () => number;
  getItemPrice: (item: CartItem) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  // Load cart from localStorage on mount
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        console.log('[CartContext] Loaded cart from localStorage:', parsed);
        return parsed;
      }
    } catch (e) {
      console.error('[CartContext] Failed to load cart from localStorage:', e);
    }
    return [];
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
      console.log('[CartContext] Saved cart to localStorage:', cart);
    } catch (e) {
      console.error('[CartContext] Failed to save cart to localStorage:', e);
    }
  }, [cart]);

  const addToCart = (product: Product, quantity: number = 1) => {
    console.log('[CartContext] addToCart called:', {
      name: product.name,
      promotionalPrice: (product as any).promotionalPrice,
      regularPrice: product.price
    });

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        toast.success(`Updated ${product.name}`, {
          description: `Quantity: ${newQuantity}`,
        });

        // Update product to preserve promotional price if it exists
        const updatedProduct = (product as any).promotionalPrice
          ? { ...existingItem.product, promotionalPrice: (product as any).promotionalPrice }
          : existingItem.product;

        console.log('[CartContext] Updating existing item:', {
          oldProduct: existingItem.product,
          newProduct: updatedProduct,
          newQuantity
        });

        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, product: updatedProduct, quantity: newQuantity }
            : item
        );
      }

      console.log('[CartContext] Adding new item to cart');
      toast.success('Added to cart', {
        description: `${product.name} (${quantity})`,
      });
      return [...prevCart, { product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => {
      const item = prevCart.find((item) => item.product.id === productId);
      if (item) {
        toast.info('Removed from cart', {
          description: item.product.name,
        });
      }
      return prevCart.filter((item) => item.product.id !== productId);
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('cart');
  };

  // Get effective price for a cart item (considering multibuy)
  const getItemPrice = (item: CartItem): number => {
    const price = getEffectivePrice(item.product, item.quantity);
    console.log('[CartContext] getItemPrice:', {
      name: item.product.name,
      quantity: item.quantity,
      promotionalPrice: (item.product as any).promotionalPrice,
      effectivePrice: price
    });
    return price;
  };

  // Get cart subtotal (before customer discount %)
  const getCartSubtotal = () => {
    console.log('[CartContext] ================================================');
    console.log('[CartContext] CALCULATING CART SUBTOTAL');
    console.log('[CartContext] Current cart (full):', JSON.stringify(cart, null, 2));
    console.log('[CartContext] Cart items summary:', cart.map(item => ({
      name: item.product.name,
      id: item.product.id,
      promotionalPrice: (item.product as any).promotionalPrice,
      regularPrice: item.product.price,
      quantity: item.quantity,
      productKeys: Object.keys(item.product)
    })));
    console.log('[CartContext] ================================================');

    const subtotal = cart.reduce((total, item) => {
      console.log(`[CartContext] >>> Processing item: ${item.product.name}`);
      console.log(`[CartContext] >>> Item product object:`, item.product);
      const effectivePrice = getItemPrice(item);
      const itemTotal = effectivePrice * item.quantity;
      console.log(`[CartContext] >>> Item: ${item.product.name}, EffectivePrice: $${effectivePrice}, Qty: ${item.quantity}, Total: $${itemTotal}`);
      return total + itemTotal;
    }, 0);

    console.log(`[CartContext] ================================================`);
    console.log(`[CartContext] FINAL SUBTOTAL: $${subtotal.toFixed(2)}`);
    console.log(`[CartContext] ================================================`);
    return subtotal;
  };

  // Get customer discount amount (for discount % customers)
  const getCustomerDiscount = () => {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return 0;
    }
    
    try {
      const customerStr = localStorage.getItem('customer');
      if (!customerStr) return 0;
      
      const customer = JSON.parse(customerStr);
      const discountPercentage = customer?.discount_percentage || 0;
      
      // Only apply discount for discount % customers (not cost price customers)
      const canBuyAtCostPrice = customer?.can_see_cost_price || false;
      if (canBuyAtCostPrice) return 0;
      
      if (discountPercentage > 0) {
        const subtotal = getCartSubtotal();
        return subtotal * (discountPercentage / 100);
      }
      
      return 0;
    } catch (e) {
      return 0;
    }
  };

  // Get cart total (after customer discount %)
  const getCartTotal = () => {
    const subtotal = getCartSubtotal();
    const discount = getCustomerDiscount();
    return subtotal - discount;
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartSubtotal,
        getCustomerDiscount,
        getCartCount,
        getItemPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}