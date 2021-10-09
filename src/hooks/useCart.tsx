import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find((product) => product.id === productId);
      if (!productInCart) {
        const product = await api.get(`products/${productId}`);
        setCart((prev) => {
          const state = [...prev, { ...product.data, amount: 1 }];
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(state));
          return state;
        });
        return;
      }

      const stock = await api.get<Stock>(`stock/${productId}`);
      if (productInCart.amount + 1 > stock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      setCart((prev) => {
        const state = prev.map((product) =>
          product.id === productId
            ? { ...product, amount: product.amount + 1 }
            : product
        );
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(state));
        return state;
      });
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    if (cart.some((product) => product.id === productId)) {
      const products = cart.filter((product) => product.id !== productId);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
      setCart(products);
      return;
    }
    toast.error('Erro na remoção do produto');
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) return;
    const product = cart.find((product) => product.id === productId);
    if (product) {
      if (
        cart.some((product) => product.id === productId && product.amount <= 0)
      ) {
        return;
      }

      const stock = await api.get<Stock>(`stock/${productId}`);
      if (amount > stock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      setCart((prev) => {
        const state = prev.map((product) =>
          product.id === productId ? { ...product, amount } : product
        );
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(state));
        return state;
      });
      return;
    }
    toast.error('Erro na alteração de quantidade do produto');
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
