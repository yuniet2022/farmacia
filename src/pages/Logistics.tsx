import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, orderBy, getDocs, updateDoc, doc, where, onSnapshot } from "firebase/firestore";
import { Order, Driver, Route as DeliveryRoute } from "../types";
import { 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Printer, 
  ExternalLink, 
  Navigation, 
  User as UserIcon,
  ChevronRight,
  Package,
  Calendar,
  Layers,
  Zap,
  Map as MapIcon
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "../lib/LanguageContext";
import { formatPrice } from "../lib/utils";

export default function Logistics({ profile }: { profile: any }) {
  const { language } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "dispatched" | "completed">("pending");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    if (profile?.role !== "admin") return;

    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    });

    const driversQuery = query(collection(db, "drivers"));
    const unsubscribeDrivers = onSnapshot(driversQuery, (snapshot) => {
      setDrivers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Driver)));
    });

    return () => {
      unsubscribeOrders();
      unsubscribeDrivers();
    };
  }, [profile]);

  const handlePrint = (order: Order) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Order #${order.id?.slice(0, 8)}</title>
          <style>
            @media print {
              body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0; padding: 5mm; }
              .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5mm; margin-bottom: 5mm; }
              .item { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2mm; }
              .total { border-top: 1px dashed #000; padding-top: 2mm; margin-top: 5mm; font-weight: bold; text-align: right; }
              .address { font-size: 11px; margin-top: 5mm; background: #eee; padding: 2mm; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h2 style="margin:0">PHC PHARMACY</h2>
            <p style="margin:2mm 0 0">Order: ${order.id?.slice(0, 8)}</p>
            <p style="margin:1mm 0 0">${new Date(order.createdAt).toLocaleString()}</p>
          </div>
          ${order.items.map(item => `
            <div class="item">
              <span>${item.quantity}x ${item.name}</span>
              <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join("")}
          <div class="total">TOTAL: $${order.total.toFixed(2)}</div>
          <div class="address">
            <strong>DELIVER TO:</strong><br/>
            ${order.shippingAddress?.name}<br/>
            ${order.shippingAddress?.street}<br/>
            ${order.shippingAddress?.city}, ${order.shippingAddress?.state} ${order.shippingAddress?.zip}<br/>
            Tel: ${order.shippingAddress?.phone}
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const dispatchToExternal = async (type: "uber" | "doordash", order: Order) => {
    setDispatching(true);
    try {
      const response = await fetch(`/api/delivery/${type}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          dropoffAddress: order.shippingAddress,
          customerInfo: { email: order.userId }
        })
      });

      if (!response.ok) throw new Error("Dispatch failed");
      const data = await response.json();

      await updateDoc(doc(db, "orders", order.id!), {
        status: "out_for_delivery",
        deliveryInfo: {
          type,
          status: "dispatched",
          externalDeliveryId: data.deliveryId,
          trackingUrl: data.trackingUrl,
          courierName: type === "uber" ? "Uber Direct Courier" : "DoorDash Dasher"
        }
      });

      toast.success(`${type.toUpperCase()} Dispatched!`);
    } catch (error) {
      toast.error("External delivery failed to initialize");
    } finally {
      setDispatching(false);
    }
  };

  const assignToInternalRoute = async (driverId: string) => {
    if (selectedOrders.length === 0) return;
    
    setDispatching(true);
    try {
      const ordersToOptimize = orders.filter(o => selectedOrders.includes(o.id!));
      
      // 1. Optimize Route via API
      const optimizeRes = await fetch("/api/logistics/optimize-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId,
          orders: ordersToOptimize,
          startLocation: { lat: 25.7617, lng: -80.1918 } // Pharmacy Base (Miami)
        })
      });

      const routeData = await optimizeRes.json();

      // 2. Update all selected orders
      for (const orderId of selectedOrders) {
        const stopInfo = routeData.optimizedStops.find((s: any) => s.orderId === orderId);
        await updateDoc(doc(db, "orders", orderId), {
          status: "out_for_delivery",
          deliveryInfo: {
            type: "internal",
            status: "dispatched",
            assignedDriverId: driverId,
            routeId: routeData.routeId,
            sequence: stopInfo.sequence,
            scheduledFor: stopInfo.estimatedArrival
          }
        });
      }

      toast.success(language === "es" ? "Ruta asignada!" : "Route assigned!");
      setSelectedOrders([]);
    } catch (error) {
      toast.error("Failed to assign route");
    } finally {
      setDispatching(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (o.status === "pending_approval") return false;
    if (activeTab === "pending") return !o.deliveryInfo || o.deliveryInfo.status === "pending";
    if (activeTab === "dispatched") return o.deliveryInfo && o.deliveryInfo.status !== "completed";
    return o.deliveryInfo?.status === "completed";
  });

  if (profile?.role !== "admin") return <div className="py-20 text-center">Unauthorized</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {language === "es" ? "Logística y Entregas" : "Logistics & Delivery"}
          </h1>
          <p className="text-slate-500">{language === "es" ? "Gestiona repartos urgentes y rutas propias." : "Manage urgent shipments and local routes."}</p>
        </div>

        <div className="flex gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {(["pending", "dispatched", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-6 py-2 text-sm font-bold transition-all ${
                activeTab === tab ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {tab.charAt(0) + tab.slice(1)}
              <span className="ml-2 opacity-50">
                ({orders.filter(o => {
                  if (o.status === "pending_approval") return false;
                  if (tab === "pending") return !o.deliveryInfo || o.deliveryInfo.status === "pending";
                  if (tab === "dispatched") return o.deliveryInfo && o.deliveryInfo.status !== "completed";
                  return o.deliveryInfo?.status === "completed";
                }).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Orders Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              {activeTab === "pending" ? (language === "es" ? "Pedidos por Despachar" : "Orders to Dispatch") : (language === "es" ? "Enviados" : "Dispatched")}
            </h2>
            {selectedOrders.length > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold animate-pulse">
                {selectedOrders.length} {language === "es" ? "seleccionados" : "selected"}
              </span>
            )}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center text-slate-400">
              <Truck className="mx-auto h-12 w-12 mb-4 opacity-20" />
              {language === "es" ? "No hay pedidos en esta categoría" : "No orders in this category"}
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.id} className={`group relative rounded-3xl border transition-all ${selectedOrders.includes(order.id!) ? "border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-500/10" : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      {activeTab === "pending" && (
                        <input 
                          type="checkbox" 
                          checked={selectedOrders.includes(order.id!)}
                          onChange={() => {
                            setSelectedOrders(prev => 
                              prev.includes(order.id!) ? prev.filter(id => id !== order.id) : [...prev, order.id!]
                            );
                          }}
                          className="mt-1 h-5 w-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Order #{order.id?.slice(0, 8)}</p>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{order.shippingAddress?.name}</h3>
                          {order.orderType === "scheduled" && (
                            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              <Clock className="h-3 w-3" />
                              {language === "es" ? "PROGRAMADO" : "SCHEDULED"}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="h-4 w-4" />
                          {order.shippingAddress?.street}, {order.shippingAddress?.city}
                        </div>
                        {order.scheduledDate && (
                          <div className="mt-1 flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg w-fit">
                            <Calendar className="h-3 w-3" />
                            {language === "es" ? "Entrega solicitada:" : "Requested delivery:"} {new Date(order.scheduledDate).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-900">{formatPrice(order.total)}</p>
                      <span className="text-xs font-medium text-slate-400">{new Date(order.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {order.items.map((item, i) => (
                      <span key={i} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                        {item.quantity}x {item.name}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handlePrint(order)}
                        className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        <Printer className="h-4 w-4" />
                        {language === "es" ? "Imprimir Ticket" : "Print Ticket"}
                      </button>
                      {order.deliveryInfo?.trackingUrl && (
                        <a 
                          href={order.deliveryInfo.trackingUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-xl bg-blue-100 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-200"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Tracking
                        </a>
                      )}
                    </div>

                    {activeTab === "pending" && (
                      <div className="flex gap-2">
                        <button 
                          disabled={dispatching}
                          onClick={() => dispatchToExternal("uber", order)}
                          className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
                        >
                          <Zap className="h-4 w-4 inline mr-2" /> Uber
                        </button>
                        <button 
                          disabled={dispatching}
                          onClick={() => dispatchToExternal("doordash", order)}
                          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          DoorDash
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Fleet Column */}
        <div className="space-y-6">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <MapIcon className="h-6 w-6 text-emerald-600" />
              {language === "es" ? "Flota Interna" : "Internal Fleet"}
            </h2>

            <div className="space-y-4">
              {drivers.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No drivers registered</p>
              ) : (
                drivers.map(driver => (
                  <div key={driver.id} className="rounded-2xl border border-slate-100 p-4 transition-all hover:border-emerald-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${driver.status === "available" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                          <UserIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{driver.name}</p>
                          <span className={`text-[10px] uppercase font-black ${driver.status === "available" ? "text-emerald-500" : "text-amber-500"}`}>
                            {driver.status}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => assignToInternalRoute(driver.id)}
                        disabled={selectedOrders.length === 0 || dispatching}
                        className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-30 transition-all"
                      >
                        {language === "es" ? "Asignar" : "Assign"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === "es" 
                  ? "Selecciona múltiples pedidos para crear una ruta de entrega optimizada." 
                  : "Select multiple orders to create an optimized delivery route."}
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] bg-emerald-900 p-8 text-white shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-800/50">
              <Zap className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold">Smart Routing</h3>
            <p className="mt-2 text-sm text-emerald-100 leading-relaxed">
              Our routing engine calculates the most efficient path to reduce fuel costs and delivery times.
            </p>
            <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-emerald-900 shadow-lg transition-transform active:scale-95">
              <Navigation className="h-4 w-4" />
              {language === "es" ? "Configurar Rutas" : "Configure Routes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
