import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { ShoppingCart, User as UserIcon, LogOut, Package, ShieldCheck, Pill, Globe } from "lucide-react";
import { Toaster, toast } from "sonner";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Admin from "./pages/Admin";
import Logistics from "./pages/Logistics";
import DriverDashboard from "./pages/DriverDashboard";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Orders from "./pages/Orders";
import { UserProfile } from "./types";
import { LanguageProvider, useLanguage } from "./lib/LanguageContext";
import { BrandingProvider, useBranding } from "./lib/BrandingContext";

function Navbar({ cartCount, profile, user, handleLogin, handleLogout }: any) {
  const { language, setLanguage, t } = useLanguage();
  const { branding, allBranches, changeBranch, theme } = useBranding();

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className={`flex items-center gap-2 text-2xl font-bold tracking-tight ${theme.text}`}>
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
          ) : (
            <Pill className="h-8 w-8" />
          )}
          <span>{language === "es" ? branding?.nameEs || branding?.name : branding?.name}</span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* Branch Switcher Dropdown */}
          {allBranches.length > 1 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                aria-label="Seleccionar sucursal"
                value={branding?.id || ""}
                onChange={(e) => changeBranch(e.target.value)}
                className={`rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-100 focus:border-slate-300 transition-all cursor-pointer`}
              >
                {allBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    📍 {language === "es" ? branch.nameEs || branch.name : branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
            <button
              onClick={() => setLanguage("en")}
              className={`px-2 py-1 text-[10px] font-bold rounded-full transition-all ${language === "en" ? `bg-white ${theme.text} shadow-sm` : "text-slate-400"}`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("es")}
              className={`px-2 py-1 text-[10px] font-bold rounded-full transition-all ${language === "es" ? `bg-white ${theme.text} shadow-sm` : "text-slate-400"}`}
            >
              ES
            </button>
          </div>

          <Link to="/cart" className={`relative flex items-center gap-2 text-slate-600 ${theme.textHover} transition-colors`}>
            <ShoppingCart className="h-6 w-6" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
            <span className="hidden md:inline font-medium">{t.nav.cart}</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/orders" className={`flex items-center gap-2 text-slate-600 ${theme.textHover} transition-colors`}>
                <Package className="h-6 w-6" />
                <span className="hidden md:inline font-medium">{language === "es" ? "Mis Pedidos" : "My Orders"}</span>
              </Link>
              {profile?.role === "admin" && (
                <Link to="/admin" className={`flex items-center gap-2 text-slate-600 ${theme.textHover} transition-colors`}>
                  <ShieldCheck className="h-6 w-6" />
                  <span className="hidden md:inline font-medium">{t.nav.admin}</span>
                </Link>
              )}
              {profile?.role === "driver" && (
                <Link to="/driver" className={`flex items-center gap-2 text-slate-600 ${theme.textHover} transition-colors`}>
                  <Package className="h-6 w-6" />
                  <span className="hidden md:inline font-medium">Panel Repartidor</span>
                </Link>
              )}
              <div className="flex items-center gap-2">
                <img src={user.photoURL || ""} alt="" className="h-8 w-8 rounded-full border border-slate-200" />
                <button onClick={handleLogout} className="text-slate-600 hover:text-red-600 transition-colors">
                  <LogOut className="h-6 w-6" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className={`flex items-center gap-2 rounded-full ${theme.bg} px-4 py-2 text-sm font-semibold text-white shadow-lg ${theme.shadow} ${theme.bgHover} transition-all active:scale-95 sm:px-6`}
            >
              <UserIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.nav.login}</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  const { t, language } = useLanguage();
  const { branding, theme } = useBranding();
  return (
    <footer className="border-t border-slate-200 bg-white py-12 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
              ) : (
                <Pill className={`h-6 w-6 ${theme.text}`} />
              )}
              <h3 className="text-lg font-bold text-slate-900">{language === "es" ? branding?.nameEs || branding?.name : branding?.name}</h3>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              {t.home.heroSubtitle}
            </p>
            <div className="flex gap-4 pt-2">
              <div className={`h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:${theme.text} cursor-pointer transition-colors`}>
                <Globe className="h-4 w-4" />
              </div>
              <div className={`h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:${theme.text} cursor-pointer transition-colors`}>
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-900">
              {language === "es" ? "Pagos Seguros" : "Secure Payments"}
            </h4>
            <p className="mt-4 text-xs text-slate-500 mb-4">
              {language === "es" ? "Aceptamos las principales tarjetas y PayPal." : "We accept all major cards and PayPal."}
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex h-8 w-12 items-center justify-center rounded border border-slate-200 bg-white font-black text-[10px] text-blue-800 shadow-sm">VISA</div>
              <div className="flex h-8 w-12 items-center justify-center rounded border border-slate-200 bg-white font-black text-[10px] text-blue-600 italic shadow-sm">PayPal</div>
              <div className="flex h-8 w-12 items-center justify-center rounded border border-slate-200 bg-white font-black text-[10px] text-orange-600 shadow-sm">MC</div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-900">
              {language === "es" ? "Legal" : "Legal"}
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-slate-500">
              <li>
                <Link to="/privacy" className={`hover:${theme.text} transition-colors flex items-center gap-2`}>
                  <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                  {language === "es" ? "Política de Privacidad" : "Privacy Policy"}
                </Link>
              </li>
              <li>
                <Link to="/terms" className={`hover:${theme.text} transition-colors flex items-center gap-2`}>
                  <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                  {language === "es" ? "Términos y Condiciones" : "Terms & Conditions"}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-900">
              {language === "es" ? "Contacto" : "Contact"}
            </h4>
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              {branding?.address && (
                <p className="flex items-start gap-2">
                  <span className="font-bold text-slate-900">{language === "es" ? "Dir:" : "Addr:"}</span>
                  <span>{language === "es" ? branding.addressEs || branding.address : branding.address}</span>
                </p>
              )}
              <p className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Tel:</span> {branding?.phone || "(305) 413-5070"}
              </p>
              <p className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Email:</span> {branding?.email || "info@phcpharmacy.com"}
              </p>
              <div className={`mt-4 rounded-xl ${theme.bgLight} p-3 ${theme.text} text-xs font-semibold`}>
                {language === "es" ? "Soporte 24/7 disponible para emergencias." : "24/7 Support available for emergencies."}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-slate-100 pt-8 text-center text-xs text-slate-400 font-sans">
          © {new Date().getFullYear()} {language === "es" ? branding?.nameEs || branding?.name : branding?.name}. {language === "es" ? "Todos los derechos reservados." : "All rights reserved."}
        </div>
      </div>
    </footer>
  );
}

function AppInner() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const { branding, isLoadingBranding } = useBranding();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          if (user.email === "yuniet2022@gmail.com" && data.role !== "admin") {
            const updatedProfile = { ...data, role: "admin" as const };
            await setDoc(docRef, updatedProfile);
            setProfile(updatedProfile);
          } else {
            setProfile(data);
          }
        } else {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            role: user.email === "yuniet2022@gmail.com" ? "admin" : "customer",
            createdAt: new Date().toISOString(),
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
    });

    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(cart.reduce((acc: number, item: any) => acc + item.quantity, 0));
    };
    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("cart-updated", updateCartCount);
    
    // Listen to branding changes to update state
    const handleBrandingReload = () => {
      updateCartCount();
    };
    window.addEventListener("branding-updated", handleBrandingReload);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cart-updated", updateCartCount);
      window.removeEventListener("branding-updated", handleBrandingReload);
    };
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success(localStorage.getItem("language") === "es" ? "Sesión iniciada correctamente" : "Logged in successfully");
    } catch (error) {
      toast.error(localStorage.getItem("language") === "es" ? "Error al iniciar sesión" : "Error logging in");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast.success(localStorage.getItem("language") === "es" ? "Sesión cerrada" : "Logged out");
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased flex flex-col justify-between">
        <div>
          <Navbar 
            cartCount={cartCount} 
            profile={profile} 
            user={user} 
            handleLogin={handleLogin} 
            handleLogout={handleLogout} 
          />

          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/admin/*" element={<Admin profile={profile} />} />
              <Route path="/admin/logistics" element={<Logistics profile={profile} />} />
              <Route path="/driver" element={<DriverDashboard user={user} />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
            </Routes>
          </main>
        </div>

        <Footer />
        <Toaster position="top-center" richColors />
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <BrandingProvider>
      <LanguageProvider>
        <AppInner />
      </LanguageProvider>
    </BrandingProvider>
  );
}

