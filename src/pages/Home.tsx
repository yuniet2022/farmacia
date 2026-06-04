import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, addDoc, getDoc, doc, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Product } from "../types";
import { formatPrice } from "../lib/utils";
import { ShoppingCart, Search, Filter, Pill, ShieldAlert, ChevronRight, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { useLanguage } from "../lib/LanguageContext";
import { useBranding } from "../lib/BrandingContext";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Don't throw here to avoid crashing the whole app, but log it for debugging
}

const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: "Nature's Bounty Vitamin B-6 100mg",
    nameEs: "Vitamina B-6 100mg Nature's Bounty",
    description: "Supports energy metabolism and nervous system health. 100 tablets.",
    descriptionEs: "Apoya el metabolismo energético y la salud del sistema nervioso. 100 tabletas.",
    price: 14.99,
    category: "vitamins",
    subCategory: "Supplements",
    prescriptionRequired: false,
    stock: 50,
    imageUrl: "input_file_2.png"
  },
  {
    name: "NAD+ Nasal Spray 300mg",
    nameEs: "NAD+ Spray Nasal 300mg",
    description: "Coenzyme for cellular energy and aging support. Prescription required.",
    descriptionEs: "Coenzima para la energía celular y el apoyo contra el envejecimiento. Requiere receta médica.",
    price: 95.00,
    category: "health",
    subCategory: "Aging Support",
    prescriptionRequired: true,
    stock: 20,
    imageUrl: "input_file_5.png"
  },
  {
    name: "Nature's Bounty Niacin 500mg",
    nameEs: "Niacina 500mg Nature's Bounty",
    description: "Flush-free hexanicotinate for nervous system and energy production.",
    descriptionEs: "Hexanicotinato sin enrojecimiento para el sistema nervioso y producción de energía.",
    price: 19.50,
    category: "health",
    subCategory: "Heart Health",
    prescriptionRequired: false,
    stock: 100,
    imageUrl: "input_file_0.png"
  },
  {
    name: "Sildenafil Tablets USP 50mg",
    nameEs: "Sildenafil Tabletas USP 50mg",
    description: "Medical treatment for erectile dysfunction. Camber Pharmaceuticals. Prescription required.",
    descriptionEs: "Tratamiento médico para la disfunción eréctil. Camber Pharmaceuticals. Requiere receta médica.",
    price: 45.00,
    category: "health",
    subCategory: "Men's Health",
    prescriptionRequired: true,
    stock: 30,
    imageUrl: "input_file_4.png"
  },
  {
    name: "Cetacaine Topical Anesthetic Liquid",
    nameEs: "Anestésico Tópico Cetacaine Líquido",
    description: "Rapid-onset topical anesthetic for localized pain relief. 24g bottle.",
    descriptionEs: "Anestésico tópico de acción rápida para el alivio del dolor localizado. Frasco de 24g.",
    price: 34.00,
    category: "health",
    subCategory: "Pain Relief",
    prescriptionRequired: false,
    stock: 40,
    imageUrl: "input_file_3.png"
  },
  {
    name: "CVS Health Baby Shampoo",
    nameEs: "CVS Health Champú para Bebé",
    description: "Mild & gentle to eyes formula, paraben and phthalate free. 13.6 fl oz.",
    descriptionEs: "Fórmula suave para los ojos, libre de parabenos y ftalatos. 13.6 fl oz.",
    price: 8.99,
    category: "baby",
    subCategory: "Baby Care",
    prescriptionRequired: false,
    stock: 60,
    imageUrl: "input_file_1.png"
  },
  {
    name: "Organic Surface Cleaner",
    nameEs: "Limpiador de Superficies Orgánico",
    description: "Eco-friendly and non-toxic surface cleaner for a healthy home.",
    descriptionEs: "Limpiador de superficies ecológico y no tóxico para un hogar saludable.",
    price: 9.50,
    category: "household",
    subCategory: "Cleaning",
    prescriptionRequired: false,
    stock: 80,
    imageUrl: "https://picsum.photos/seed/cleaner/400/400"
  }
];

export default function Home() {
  const { language, t } = useLanguage();
  const { branding, theme } = useBranding();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const PRODUCTS_PER_PAGE = 12;

  const [categories, setCategories] = useState<{ id: string, label: string, labelEs: string }[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "categories"));
        const cats = querySnapshot.docs.map(doc => ({
          id: doc.id,
          label: doc.data().name,
          labelEs: doc.data().nameEs
        }));
        setCategories([{ id: "all", label: "All", labelEs: "Todos" }, ...cats]);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setProducts([]);
      setLastDoc(null);
      setHasMore(true);
      
      try {
        const productsCol = collection(db, "products");
        
        // Admin check for stock=0 visibility
        const user = auth.currentUser;
        let isAdmin = false;
        if (user) {
          if (user.email === "yuniet2022@gmail.com") {
            isAdmin = true;
          } else {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().role === "admin") {
              isAdmin = true;
            }
          }
        }

        let q;
        const constraints = [];
        if (category !== "all") {
          constraints.push(where("categoryId", "==", category));
        }
        if (!isAdmin) {
          constraints.push(where("stock", ">", 0));
        }
        
        // We need an order to use pagination properly
        q = query(productsCol, ...constraints, orderBy("name"), limit(PRODUCTS_PER_PAGE));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty && category === "all" && isAdmin) {
          const fullSnapshot = await getDocs(productsCol);
          if (fullSnapshot.empty) {
            for (const p of INITIAL_PRODUCTS) {
              await addDoc(productsCol, p);
            }
            const newSnapshot = await getDocs(query(productsCol, limit(PRODUCTS_PER_PAGE)));
            const items = newSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Product));
            setProducts(items);
            setLastDoc(newSnapshot.docs[newSnapshot.docs.length - 1] || null);
          }
        } else {
          const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Product));
          setProducts(items);
          setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
          setHasMore(querySnapshot.docs.length === PRODUCTS_PER_PAGE);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [category]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);

    try {
      const productsCol = collection(db, "products");
      const user = auth.currentUser;
      let isAdmin = false;
      if (user?.email === "yuniet2022@gmail.com") isAdmin = true;

      const constraints = [];
      if (category !== "all") constraints.push(where("categoryId", "==", category));
      if (!isAdmin) constraints.push(where("stock", ">", 0));

      const q = query(
        productsCol, 
        ...constraints, 
        orderBy("name"), 
        startAfter(lastDoc), 
        limit(PRODUCTS_PER_PAGE)
      );

      const querySnapshot = await getDocs(q);
      const newItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Product));
      
      setProducts(prev => [...prev, ...newItems]);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMore(querySnapshot.docs.length === PRODUCTS_PER_PAGE);
    } catch (error) {
      console.error("Load more error:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const addToCart = (product: Product) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((item: any) => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    toast.success(`${language === 'es' ? product.nameEs || product.name : product.name} ${language === 'es' ? 'añadido al carrito' : 'added to cart'}`);
  };

  const filteredProducts = products.filter(p => {
    const name = language === 'es' ? p.nameEs || p.name : p.name;
    const desc = language === 'es' ? p.descriptionEs || p.description : p.description;
    return name.toLowerCase().includes(search.toLowerCase()) || 
           desc.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section - More Immersive */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 px-8 py-20 text-white shadow-3xl">
        {branding?.heroImage && (
          <div className="absolute inset-0 z-0">
            <img 
              src={branding.heroImage} 
              alt="Hero" 
              className="h-full w-full object-cover opacity-40"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
          </div>
        )}
        <div className="relative z-10 max-w-3xl space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`inline-flex items-center gap-2 rounded-full border ${theme.border} ${theme.bgLight} ${theme.text} px-4 py-1.5 text-sm font-semibold`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                theme.primary === "blue" ? "bg-blue-400" :
                theme.primary === "rose" ? "bg-rose-400" :
                theme.primary === "indigo" ? "bg-indigo-400" :
                theme.primary === "purple" ? "bg-purple-400" :
                theme.primary === "amber" ? "bg-amber-400" :
                "bg-emerald-400"
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                theme.primary === "blue" ? "bg-blue-500" :
                theme.primary === "rose" ? "bg-rose-500" :
                theme.primary === "indigo" ? "bg-indigo-500" :
                theme.primary === "purple" ? "bg-purple-500" :
                theme.primary === "amber" ? "bg-amber-500" :
                "bg-emerald-500"
              }`}></span>
            </span>
            {language === 'es' ? 'Farmacia de Confianza' : 'Trusted Pharmacy'}
          </motion.div>
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-7xl">
            {t.home.heroTitle.split(' ').map((word: string, i: number) => (
              <span key={i} className={i === 1 ? theme.text : ""}>{word} </span>
            ))}
          </h1>
          <p className="max-w-xl text-lg text-slate-400 leading-relaxed">
            {t.home.heroSubtitle}
          </p>
          <div className="flex flex-wrap gap-6 pt-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 border ${theme.border} ${theme.text}`}>
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-100">{branding?.name || "PHC Pharmacy"}</p>
                <p className="text-slate-500">Certified Quality</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 border ${theme.border} ${theme.text}`}>
                <Pill className="h-5 w-5" />
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-100">Compounding</p>
                <p className="text-slate-500">Expert Pharmacists</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className={`absolute -right-20 -top-20 h-[500px] w-[500px] rounded-full blur-[120px] opacity-20 ${
          theme.primary === "blue" ? "bg-blue-500" :
          theme.primary === "rose" ? "bg-rose-500" :
          theme.primary === "indigo" ? "bg-indigo-500" :
          theme.primary === "purple" ? "bg-purple-500" :
          theme.primary === "amber" ? "bg-amber-500" :
          "bg-emerald-500"
        }`}></div>
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-[100px]"></div>
        
        {/* Floating Product Image Placeholder */}
        <div className="absolute right-12 top-1/2 hidden -translate-y-1/2 lg:block">
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="glass-card h-80 w-64 rounded-3xl p-6 shadow-2xl"
          >
            <div className="h-full w-full rounded-2xl bg-slate-800/50 flex items-center justify-center">
              <Pill className={`h-20 w-20 opacity-30 ${theme.text}`} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filters & Search - More Structured */}
      <div className="sticky top-24 z-40 -mx-4 space-y-6 bg-slate-50/80 px-4 py-6 backdrop-blur-md sm:mx-0 sm:px-0">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t.home.searchPlaceholder}
              className={`w-full rounded-2xl border-none bg-white py-4 pl-12 pr-4 shadow-sm ring-1 ring-slate-200 focus:ring-2 ${theme.ring} outline-none transition-all`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide lg:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`whitespace-nowrap rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                  category === cat.id 
                    ? `${theme.bg} text-white shadow-lg ${theme.shadow}` 
                    : "bg-white text-slate-600 hover:bg-slate-50 ring-1 ring-slate-200"
                }`}
              >
                {language === 'es' ? cat.labelEs : cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid - Bento Style */}
      {loading ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-[420px] animate-pulse rounded-[2rem] bg-white ring-1 ring-slate-100"></div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="product-card-hover group relative flex flex-col overflow-hidden rounded-[2rem] bg-white p-3 ring-1 ring-slate-200/60"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-50">
                <img
                  src={product.imageUrl || `https://picsum.photos/seed/${product.name}/400/400`}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${product.name}/400/500`;
                  }}
                />
                <div className="absolute left-3 top-3 flex flex-col gap-2">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                    product.prescriptionRequired 
                      ? "bg-red-500/10 text-red-600 ring-1 ring-red-500/20" 
                      : `${theme.bgLight} ${theme.text} ring-1 ${theme.border}`
                  }`}>
                    {product.prescriptionRequired ? t.home.rxRequired : t.home.otc}
                  </span>
                </div>
                
                {/* Quick Add Overlay */}
                <div className="absolute inset-x-0 bottom-0 translate-y-full p-4 transition-transform duration-300 group-hover:translate-y-0">
                  <button
                    onClick={() => addToCart(product)}
                    className={`w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-xl ${theme.bgHover} active:scale-95 transition-all`}
                  >
                    {language === 'es' ? 'Añadir al Carrito' : 'Add to Cart'}
                  </button>
                </div>
              </div>
              
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {product.subCategory || product.category}
                  </span>
                  <div className="flex items-center gap-1 text-amber-400">
                    <span className="text-xs font-bold text-slate-900">4.9</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold leading-tight text-slate-900 line-clamp-1">
                  {language === 'es' ? product.nameEs || product.name : product.name}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500 leading-relaxed">
                  {language === 'es' ? product.descriptionEs || product.description : product.description}
                </p>
                <div className="mt-auto pt-6 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-400">{language === 'es' ? 'Precio' : 'Price'}</span>
                    <span className="text-2xl font-black text-slate-900">{formatPrice(product.price)}</span>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 transition-all ${theme.bgHover} hover:text-white active:scale-90`}
                  >
                    <ShoppingCart className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-100">
            <Search className="h-16 w-16 text-slate-200" />
          </div>
          <h3 className="mt-8 text-2xl font-bold text-slate-900">{t.home.noProducts}</h3>
          <p className="mt-2 text-slate-500 max-w-xs">{t.home.tryAnother}</p>
        </div>
      )}

      {/* Pagination Controls */}
      {hasMore && !loading && filteredProducts.length > 0 && (
        <div className="flex justify-center pt-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 rounded-2xl bg-white px-10 py-4 font-bold text-slate-900 shadow-lg ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className={`h-5 w-5 animate-spin ${theme.text}`} />
                {language === "es" ? "Cargando..." : "Loading..."}
              </>
            ) : (
              <>
                {language === "es" ? "Ver más productos" : "Load more products"}
                <ChevronRight className="h-5 w-5 rotate-90" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Contact & Trust Section */}
      <section className="rounded-[2.5rem] bg-white p-12 shadow-sm ring-1 ring-slate-100">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-900">
              {language === "es" ? "¿Necesitas ayuda con tu receta?" : "Need help with your prescription?"}
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed">
              {language === "es" 
                ? "Nuestros farmacéuticos expertos están disponibles 24/7 para responder tus dudas y validar tus pedidos de forma segura."
                : "Our expert pharmacists are available 24/7 to answer your questions and validate your orders securely."}
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 text-slate-700">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${theme.bgLight} ${theme.text}`}>
                  <Globe className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold">{language === "es" ? "Atención al Cliente" : "Customer Support"}</p>
                  <p className="text-sm text-slate-500">{branding?.phone || "(305) 413-5070"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-slate-700">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold">{language === "es" ? "Seguridad Garantizada" : "Guaranteed Security"}</p>
                  <p className="text-sm text-slate-500">HIPAA Compliant Data Storage</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-[2rem] bg-slate-100">
              <img 
                src={branding?.supportImage || "https://picsum.photos/seed/pharmacist/800/800"} 
                alt="Pharmacist" 
                className="h-full w-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className={`absolute -bottom-6 -right-6 rounded-3xl ${theme.bg} p-8 text-white shadow-2xl`}>
              <p className="text-4xl font-black">24/7</p>
              <p className="text-sm font-bold uppercase tracking-widest opacity-80">
                {language === "es" ? "Soporte" : "Support"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
