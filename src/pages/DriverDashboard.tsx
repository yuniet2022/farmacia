import React, { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { Order, Driver } from "../types";
import { 
  Navigation, 
  MapPin, 
  Phone, 
  Package, 
  CheckCircle2, 
  Clock, 
  User as UserIcon,
  ChevronRight,
  LogOut,
  Map as MapIcon,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "../lib/utils";
import { useLanguage } from "../lib/LanguageContext";

export default function DriverDashboard({ user }: { user: any }) {
  const { language } = useLanguage();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // 1. Get Driver Profile
    const driverRef = doc(db, "drivers", user.uid);
    const unsubscribeDriver = onSnapshot(driverRef, (snap) => {
      if (snap.exists()) {
        setDriver({ id: snap.id, ...snap.data() } as Driver);
      } else {
        // Fallback for demo: if doc doesn't exist, maybe they aren't registered as driver
        console.error("No driver profile found");
      }
    });

    // 2. Get Assigned Orders
    const ordersQuery = query(
      collection(db, "orders"), 
      where("deliveryInfo.assignedDriverId", "==", user.uid),
      where("deliveryInfo.status", "in", ["dispatched", "pickup", "in_transit"])
    );

    const unsubscribeOrders = onSnapshot(ordersQuery, (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      // Sort by optimized sequence
      const sorted = orders.sort((a, b) => (a.deliveryInfo?.sequence || 0) - (b.deliveryInfo?.sequence || 0));
      setAssignedOrders(sorted);
      setLoading(false);
    });

    return () => {
      unsubscribeDriver();
      unsubscribeOrders();
    };
  }, [user]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: status === "completed" ? "delivered" : "out_for_delivery",
        deliveryInfo: {
          ...assignedOrders.find(o => o.id === orderId)?.deliveryInfo,
          status: status
        }
      });
      toast.success("Status Updated!");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const openInMaps = (address: any) => {
    const query = encodeURIComponent(`${address.street}, ${address.city}, ${address.state} ${address.zip}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  if (!user) return <div className="py-20 text-center">{language === "es" ? "Por favor, inicia sesión" : "Please login"}</div>;
  if (loading) return <div className="py-20 text-center">{language === "es" ? "Cargando logística del conductor..." : "Loading driver logistics..."}</div>;

  return (
    <div className="mx-auto max-w-md pb-20 font-sans">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <UserIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{driver?.name || (language === "es" ? "Conductor" : "Driver")}</h1>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">
                {language === "es" ? "En Línea" : "Online"}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => auth.signOut()} className="text-slate-400 hover:text-red-500 transition-colors">
          <LogOut className="h-6 w-6" />
        </button>
      </div>

      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
        <Package className="h-5 w-5 text-emerald-600" />
        {language === "es" ? `Mis Entregas (${assignedOrders.length})` : `My Deliveries (${assignedOrders.length})`}
      </h2>

      <div className="space-y-4">
        {assignedOrders.length === 0 ? (
          <div className="rounded-[2.5rem] bg-white p-12 text-center text-slate-400 border border-slate-100 italic font-medium">
            {language === "es" ? "No tienes entregas activas asignadas." : "No active deliveries assigned."}
          </div>
        ) : (
          assignedOrders.map((order, idx) => (
            <div key={order.id} className="relative overflow-hidden rounded-[2.5rem] bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-100">
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {language === "es" ? `Parada #${idx + 1}` : `Stop #${idx + 1}`}
                    </span>
                    {order.orderType === "scheduled" && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black text-amber-600 uppercase tracking-widest">
                        <Clock className="h-3 w-3" />
                        {language === "es" ? "Programado" : "Scheduled"}
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-black text-emerald-600">{formatPrice(order.total)}</p>
                </div>

                <h3 className="text-xl font-bold text-slate-900">{order.shippingAddress?.name}</h3>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {order.shippingAddress?.street}
                  </p>
                  {order.scheduledDate && (
                    <p className="text-xs font-bold text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg w-fit">
                      <Clock className="h-3 w-3" />
                      {language === "es" ? "Solicitado" : "Requested"}: {new Date(order.scheduledDate).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <button 
                    onClick={() => openInMaps(order.shippingAddress)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white shadow-lg transition-transform active:scale-95"
                  >
                    <Navigation className="h-5 w-5" />
                    {language === "es" ? "Ver en Google Maps" : "Open in Google Maps"}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <a 
                      href={`tel:${order.shippingAddress?.phone}`}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-4 text-sm font-bold text-slate-600 active:scale-95"
                    >
                      <Phone className="h-5 w-5 text-slate-500" />
                      {language === "es" ? "Llamar" : "Call"}
                    </a>
                    <button 
                      onClick={() => updateOrderStatus(order.id!, "completed")}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-bold text-white shadow-md active:scale-95"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      {language === "es" ? "Entregado" : "Complete"}
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-50">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">
                    {language === "es" ? "Contenido del Envío" : "Package Contents"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item, i) => (
                      <span key={i} className="text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl">
                        {item.quantity}x {language === "es" ? item.nameEs || item.name : item.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Map Preview Mock */}
      <div className="mt-8 overflow-hidden rounded-[2.5rem] bg-slate-900 aspect-square relative shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/map/800/800')] opacity-50 grayscale contrast-125 mix-blend-overlay"></div>
        <div className="relative h-full w-full flex items-center justify-center">
          <div className="text-center p-8">
            <MapIcon className="h-12 w-12 text-emerald-400 mx-auto mb-4 animate-bounce" />
            <h4 className="text-lg font-bold text-white">
              {language === "es" ? "Visualización de la Ruta en Vivo" : "Live Route View"}
            </h4>
            <p className="text-sm text-emerald-100/60 mt-2">
              {language === "es" 
                ? "El rastreo GPS y la visualización GIS activa están optimizados para este recorrido." 
                : "Enhanced GIS visualization and live GPS tracking are active for precise navigation."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
