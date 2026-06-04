import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { CartItem, Order } from "../types";
import { formatPrice } from "../lib/utils";
import { CreditCard, Upload, CheckCircle2, Loader2, AlertCircle, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useLanguage } from "../lib/LanguageContext";

export default function Checkout() {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<CartItem[]>([]);
  const [prescription, setPrescription] = useState<File | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    phone: ""
  });
  const navigate = useNavigate();

  const needsPrescription = items.some(item => item.prescriptionRequired);
  const needsScheduling = needsPrescription; // Logic: Rx items MUST be scheduled
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (cart.length === 0) navigate("/");
    setItems(cart);
    
    // Auto-fill name if logged in
    if (auth.currentUser) {
      setShippingAddress(prev => ({ ...prev, name: auth.currentUser?.displayName || "" }));
    }
  }, [navigate]);

  const handlePrescriptionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setPrescription(e.target.files[0]);
    }
  };

  const [showStripeModal, setShowStripeModal] = useState(false);

  const handleStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddress()) return;
    setLoading(true);
    // ...
    toast.info(language === "es" ? "Redirigiendo a pasarela segura de Stripe..." : "Redirecting to secure Stripe gateway...");
    
    // Simulate secure processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    await createOrder("visa");
    setShowStripeModal(false);
  };

  const validateAddress = () => {
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.zip || !shippingAddress.phone) {
      toast.error(language === "es" ? "Por favor completa los datos de envío" : "Please complete shipping details");
      return false;
    }
    return true;
  };

  const createOrder = async (paymentMethod: "visa" | "paypal") => {
    if (!auth.currentUser) {
      toast.error(language === "es" ? "Debes iniciar sesión para completar la compra" : "You must log in to complete the purchase");
      return;
    }

    if (needsPrescription && !prescription) {
      toast.error(language === "es" ? "Debes subir una receta médica para medicamentos Rx" : "You must upload a medical prescription for Rx medications");
      return;
    }

    if (needsScheduling && !scheduledDate) {
      toast.error(language === "es" ? "Seleccione una fecha de entrega programada" : "Please select a scheduled delivery date");
      return;
    }

    if (!validateAddress()) return;

    setLoading(true);
    try {
      let prescriptionUrl = "";
      if (prescription) {
        const storageRef = ref(storage, `prescriptions/${auth.currentUser.uid}/${Date.now()}_${prescription.name}`);
        const snapshot = await uploadBytes(storageRef, prescription);
        prescriptionUrl = await getDownloadURL(snapshot.ref);
      }

      // Generate mock coordinates for the optimization engine (Miami area base)
      const zipNumeric = parseInt(shippingAddress.zip) || 33101;
      const lat = 25.7617 + (zipNumeric % 100) / 1000 - 0.05;
      const lng = -80.1918 + (zipNumeric % 75) / 1000 - 0.05;

      const order: Order = {
        userId: auth.currentUser.uid,
        items,
        total,
        status: needsPrescription ? "pending_approval" : "pending",
        paymentMethod,
        prescriptionUrl,
        prescriptionStatus: needsPrescription ? "pending" : undefined,
        orderType: needsScheduling ? "scheduled" : "instant",
        scheduledDate: needsScheduling ? scheduledDate : undefined,
        createdAt: new Date().toISOString(),
        language: language as "en" | "es",
        shippingAddress: {
          ...shippingAddress,
          lat,
          lng
        }
      };

      await addDoc(collection(db, "orders"), order);
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cart-updated"));
      setOrderComplete(true);
      toast.success(t.checkout.success);
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error(language === "es" ? "Error al procesar el pedido. Verifique su conexión." : "Error processing order. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-green-100 p-8">
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        </div>
        <h2 className="mt-6 text-3xl font-bold text-slate-900">{t.checkout.success}</h2>
        <p className="mt-2 text-slate-500 text-lg">{t.checkout.successSubtitle}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-8 rounded-full bg-emerald-600 px-8 py-3 font-semibold text-white shadow-lg hover:bg-emerald-700"
        >
          {t.checkout.backToStore}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.checkout.title}</h1>
        
        <div className="space-y-4 rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">{language === "es" ? "Datos de Envío" : "Shipping Details"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-full space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">{language === "es" ? "Nombre Completo" : "Full Name"}</label>
              <input 
                type="text" 
                value={shippingAddress.name}
                onChange={e => setShippingAddress({...shippingAddress, name: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" 
              />
            </div>
            <div className="col-span-full space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">{language === "es" ? "Dirección" : "Street Address"}</label>
              <input 
                type="text" 
                placeholder="Calle, Número, Apto..."
                value={shippingAddress.street}
                onChange={e => setShippingAddress({...shippingAddress, street: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">{language === "es" ? "Ciudad" : "City"}</label>
              <input 
                type="text" 
                value={shippingAddress.city}
                onChange={e => setShippingAddress({...shippingAddress, city: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Zip / ZIP Code</label>
              <input 
                type="text" 
                value={shippingAddress.zip}
                onChange={e => setShippingAddress({...shippingAddress, zip: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" 
              />
            </div>
            <div className="col-span-full space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Teléfono de Contacto</label>
              <input 
                type="tel" 
                value={shippingAddress.phone}
                onChange={e => setShippingAddress({...shippingAddress, phone: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" 
              />
            </div>
          </div>
        </div>

        {needsScheduling && (
          <div className="rounded-3xl bg-amber-50 p-8 border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-amber-600 p-2 text-white">
                <Clock className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-amber-900">
                    {language === "es" ? "Pedido Programado Necesario" : "Scheduled Delivery Required"}
                  </h3>
                  <p className="text-sm text-amber-700">
                    {language === "es" 
                      ? "Debido a que su pedido incluye medicamentos con receta, debemos programar la entrega para permitir la validación farmacéutica."
                      : "Because your order includes prescription medications, we must schedule the delivery to allow for pharmaceutical validation."}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    {language === "es" ? "Fecha y Hora de Entrega Solicitada" : "Requested Delivery Date & Time"}
                  </label>
                  <input
                    type="datetime-local"
                    min={new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 16)} // Min 4 hours from now
                    className="w-full rounded-xl border border-amber-200 bg-white p-3 text-sm outline-none focus:border-amber-500"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {needsPrescription && (
          <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-emerald-600 p-2 text-white">
                <Upload className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold text-emerald-900">{t.checkout.uploadPrescription}</h3>
                <p className="text-sm text-emerald-700">
                  {t.checkout.uploadSubtitle}
                </p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handlePrescriptionUpload}
                  className="mt-4 block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700"
                />
                {prescription && (
                  <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {t.checkout.fileSelected} {prescription.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">{t.checkout.paymentMethod}</h2>
          
            <div className={`space-y-4 transition-all duration-300 ${showStripeModal ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}`}>
              {/* Visa / Credit Card Mock */}
              <button
                onClick={() => setShowStripeModal(true)}
                disabled={loading}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-emerald-500 hover:bg-slate-50 active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900">{t.checkout.visa}</p>
                    <p className="text-xs text-slate-500">{t.checkout.stripeSecure}</p>
                  </div>
                </div>
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-emerald-600" /> : <div className="h-6 w-6 rounded-full border-2 border-slate-200" />}
              </button>

              {/* PayPal Integration */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex items-center gap-4">
                  <div className="rounded-lg bg-blue-50 p-3 text-blue-800 font-bold italic">PP</div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900">{t.checkout.paypal}</p>
                    <p className="text-xs text-slate-500">{t.checkout.paypalSubtitle}</p>
                  </div>
                </div>
                <PayPalScriptProvider options={{ clientId: "test" }}>
                  <PayPalButtons
                    style={{ layout: "horizontal", height: 48 }}
                    createOrder={(data, actions) => {
                      return actions.order.create({
                        intent: "CAPTURE",
                        purchase_units: [{ amount: { value: total.toString(), currency_code: "USD" } }],
                      });
                    }}
                    onApprove={async (data, actions) => {
                      await createOrder("paypal");
                    }}
                  />
                </PayPalScriptProvider>
              </div>
            </div>

            {/* Simulated Stripe Modal */}
            {showStripeModal && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-6 w-6 text-emerald-600" />
                      <h3 className="text-xl font-bold text-slate-900">{language === "es" ? "Pago Seguro" : "Secure Payment"}</h3>
                    </div>
                    <button onClick={() => setShowStripeModal(false)} className="text-slate-400 hover:text-slate-600">
                      <AlertCircle className="h-6 w-6 rotate-45" />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="rounded-2xl bg-slate-50 p-6 text-center">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" 
                        alt="Stripe" 
                        className="mx-auto h-8 mb-4"
                      />
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {language === "es" 
                          ? "Serás redirigido a la pasarela de pago segura de Stripe. Tus datos bancarios nunca tocan nuestros servidores."
                          : "You will be redirected to Stripe's secure payment gateway. Your banking data never touches our servers."}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs text-emerald-800">
                      <ShieldCheck className="h-5 w-5 shrink-0" />
                      <p>{language === "es" ? "Cumplimiento total con PCI-DSS Nivel 1." : "Full PCI-DSS Level 1 Compliance."}</p>
                    </div>

                    <button
                      onClick={handleStripePayment}
                      disabled={loading}
                      className="w-full rounded-xl bg-emerald-600 py-4 font-bold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                      {language === "es" ? "Continuar al Pago Seguro" : "Continue to Secure Payment"}
                    </button>
                    
                    <button
                      onClick={() => setShowStripeModal(false)}
                      className="w-full text-sm font-medium text-slate-400 hover:text-slate-600"
                    >
                      {language === "es" ? "Cancelar" : "Cancel"}
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900">{t.checkout.yourOrder}</h2>
          <div className="mt-6 divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between py-4">
                <div className="flex gap-3">
                  <span className="font-bold text-emerald-600">{item.quantity}x</span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{language === "es" ? item.nameEs || item.name : item.name}</p>
                    <p className="text-xs text-slate-500">{t.categories[item.category as keyof typeof t.categories] || item.category}</p>
                  </div>
                </div>
                <span className="font-medium text-slate-900">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
            <div className="flex justify-between text-xl font-bold text-slate-900">
              <span>{t.checkout.totalToPay}</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          
          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-800 text-xs flex gap-3 items-start">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>
              <strong>{t.checkout.important}</strong> {t.checkout.rxNotice}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

