import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartItem } from "../types";
import { formatPrice } from "../lib/utils";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

export default function Cart() {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<CartItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    setItems(cart);
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const removeItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-slate-100 p-8">
          <ShoppingBag className="h-16 w-16 text-slate-300" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-slate-900">{t.cart.empty}</h2>
        <p className="mt-2 text-slate-500">{t.cart.emptySubtitle}</p>
        <Link
          to="/"
          className="mt-8 rounded-full bg-emerald-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:bg-emerald-700 active:scale-95"
        >
          {t.cart.explore}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.cart.title}</h1>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <img
                src={item.imageUrl || `https://picsum.photos/seed/${item.name}/100/100`}
                alt={language === "es" ? item.nameEs || item.name : item.name}
                className="h-24 w-24 rounded-xl object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{language === "es" ? item.nameEs || item.name : item.name}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      item.prescriptionRequired ? "text-red-500" : "text-green-500"
                    }`}>
                      {item.prescriptionRequired ? t.home.rxRequired : t.home.otc}
                    </span>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-emerald-600">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-emerald-600">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">{formatPrice(item.price * item.quantity)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900">{t.cart.summary}</h2>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between text-slate-500">
              <span>{t.cart.subtotal}</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>{t.cart.shipping}</span>
              <span className="text-green-600 font-medium">{t.cart.free}</span>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <div className="flex justify-between text-xl font-bold text-slate-900">
                <span>{t.cart.total}</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/checkout")}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-4 font-bold text-white shadow-xl shadow-emerald-100 transition-all hover:bg-emerald-700 active:scale-95"
          >
            {t.cart.checkout}
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-4 text-center text-xs text-slate-400">
            {t.cart.terms}
          </p>
        </div>
      </div>
    </div>
  );
}

