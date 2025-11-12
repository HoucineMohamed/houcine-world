import React, { createContext, useContext, useState } from "react";

export type Currency = "EUR" | "USD" | "TND";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (basePrice: number) => number;
}

const exchangeRates: Record<Currency, number> = {
  EUR: 1,
  USD: 1.09,
  TND: 3.36,
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>("EUR");

  const convertPrice = (basePrice: number): number => {
    return Math.round(basePrice * exchangeRates[currency]);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
