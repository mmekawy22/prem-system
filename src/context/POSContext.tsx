import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Product } from '../db';

// --- Interfaces ---
export interface CartItem extends Product {
  quantity: number;
}

export interface Session {
  id: number;
  name: string;
  cart: CartItem[];
  isWholesale: boolean;
}

interface POSContextType {
  sessions: Session[];
  activeSessionId: number;
  handleNewSession: () => void;
  handleCloseSession: (sessionIdToClose: number) => void;
  setActiveSessionId: (id: number) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  updateCartForActiveSession: (newCart: CartItem[]) => void;
  getActiveCart: () => CartItem[];
  toggleWholesale: (sessionId: number) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<Session[]>([{ id: Date.now(), name: 'Session 1', cart: [], isWholesale: false }]);
  const [activeSessionId, setActiveSessionId] = useState<number>(sessions[0].id);

  const getActiveCart = () => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    return activeSession ? activeSession.cart : [];
  };

  const updateCartForActiveSession = (newCart: CartItem[]) => {
    setSessions(currentSessions =>
      currentSessions.map(s => (s.id === activeSessionId ? { ...s, cart: newCart } : s))
    );
  };
  
  const handleNewSession = () => {
    const newSessionId = Date.now();
    const existingNumbers = sessions.map(s => parseInt(s.name.replace('Session ', ''), 10)).filter(n => !isNaN(n));
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    const newSession: Session = {
      id: newSessionId,
      name: `Session ${nextNumber}`,
      cart: [],
      isWholesale: false,
    };
    setSessions(prevSessions => [...prevSessions, newSession]);
    setActiveSessionId(newSessionId);
  };

  const handleCloseSession = (sessionIdToClose: number) => {
    if (sessions.length <= 1) return;
    const remainingSessions = sessions.filter(s => s.id !== sessionIdToClose);
    setSessions(remainingSessions);
    if (activeSessionId === sessionIdToClose) {
      setActiveSessionId(remainingSessions[0].id);
    }
  };

  // ✅ This is the fully corrected function
  const addToCart = (product: Product) => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession) return;

    // 1. Determine the correct price based on the session type
    const priceToUse = activeSession.isWholesale && product.wholesale_price != null
      ? product.wholesale_price 
      : product.price;

    const activeCart = activeSession.cart;
    const existingItem = activeCart.find(item => item.id === product.id);
    let newCart;

    if (existingItem) {
      // 2. If the item exists, update its quantity AND its price to the correct one
      newCart = activeCart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1, price: priceToUse } : item
      );
    } else {
      // 3. If it's a new item, add it with the correct price
      newCart = [...activeCart, { ...product, quantity: 1, price: priceToUse }];
    }
    updateCartForActiveSession(newCart);
  };

  const removeFromCart = (id: number) => {
    const newCart = getActiveCart().filter(item => item.id !== id);
    updateCartForActiveSession(newCart);
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(id);
    } else {
      const newCart = getActiveCart().map(item => (item.id === id ? { ...item, quantity } : item));
      updateCartForActiveSession(newCart);
    }
  };
  
  const toggleWholesale = (sessionId: number) => {
    setSessions(currentSessions =>
      currentSessions.map(s => s.id === sessionId ? { ...s, isWholesale: !s.isWholesale } : s)
    );
  };
  
  const value = {
    sessions, activeSessionId, setActiveSessionId, handleNewSession,
    handleCloseSession, addToCart, removeFromCart, updateQuantity,
    updateCartForActiveSession, getActiveCart, toggleWholesale
  };

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
};

export const usePOS = (): POSContextType => {
  const context = useContext(POSContext);
  if (context === undefined) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};