import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Order } from "../types";
import { formatPrice } from "../lib/utils";
import { Package, Clock, CheckCircle2, XCircle, MapPin, Calendar, FileText } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { motion } from "motion/react";

export default function Orders() {
  const { language } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "orders"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          {language === "es" ? "Mis Pedidos" : "My Orders"}
        </h1>
        <p className="text-slate-500">
          {language === "es" ? "Sigue el estado de tus compras y recetas." : "Track the status of your purchases and prescriptions."}
        </p>
      </div>

      <div className="space-y-6">
        {orders.length === 0 ? (
          <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white p-20 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500">
              {language === "es" ? "Aún no tienes pedidos." : "You don't have any orders yet."}
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/50"
            >
              <div className="p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        ID: #{order.id?.slice(0, 8)}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
                      order.status === "delivered" ? "bg-emerald-100 text-emerald-700" :
                      order.status === "cancelled" ? "bg-red-100 text-red-700" :
                      order.status === "pending_approval" ? "bg-purple-100 text-purple-700 ring-1 ring-purple-200" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {order.status === "pending_approval" && (
                  <div className="mb-6 rounded-3xl bg-purple-50 p-6 border border-purple-100 flex items-start gap-4">
                    <Clock className="h-6 w-6 text-purple-600 shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-purple-900">
                        {language === "es" ? "Validación de Receta en Curso" : "Prescription Validation in Progress"}
                      </h4>
                      <p className="text-sm text-purple-700 mt-1">
                        {language === "es" 
                          ? "Nuestros farmacéuticos están revisando su receta. Recibirá una notificación cuando sea aprobada."
                          : "Our pharmacists are reviewing your prescription. You will receive a notification once it is approved."}
                      </p>
                    </div>
                  </div>
                )}

                {order.status === "cancelled" && order.rejectionReason && (
                  <div className="mb-6 rounded-3xl bg-red-50 p-6 border border-red-100 flex items-start gap-4">
                    <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-red-900">
                        {language === "es" ? "Pedido Cancelado" : "Order Cancelled"}
                      </h4>
                      <p className="text-sm text-red-700 mt-1">
                        <b>{language === "es" ? "Razón:" : "Reason:"}</b> {order.rejectionReason}
                      </p>
                      <p className="text-xs text-red-600 mt-2 font-bold decoration-emerald-200">
                        {language === "es" ? "Se ha procesado el reembolso a su tarjeta." : "Refund has been processed to your card."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                      {language === "es" ? "Productos" : "Products"}
                    </h4>
                    <div className="space-y-3">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">
                            {item.quantity}x {language === "es" ? item.nameEs || item.name : item.name}
                          </span>
                          <span className="font-bold text-slate-900">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-slate-50 flex justify-between">
                        <span className="font-black text-slate-900">Total</span>
                        <span className="font-black text-emerald-600 text-lg">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                      {language === "es" ? "Detalles de Entrega" : "Delivery Details"}
                    </h4>
                    <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 mt-0.5 text-slate-400" />
                        <span>{order.shippingAddress?.street}, {order.shippingAddress?.city}</span>
                      </div>
                      {order.orderType === "scheduled" && order.scheduledDate && (
                        <div className="flex items-center gap-2 text-sm text-amber-700 font-bold">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(order.scheduledDate).toLocaleString()}</span>
                        </div>
                      )}
                      {order.prescriptionUrl && (
                        <div className="flex items-center gap-2 text-sm text-emerald-700">
                          <FileText className="h-4 w-4" />
                          <span>{language === "es" ? "Receta adjunta" : "Prescription attached"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
