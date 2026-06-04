import React from "react";
import { useLanguage } from "../lib/LanguageContext";

export default function Privacy() {
  const { language } = useLanguage();

  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">
        {language === "es" ? "Política de Privacidad" : "Privacy Policy"}
      </h1>
      
      <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
        <section>
          <h2 className="text-xl font-bold text-slate-800">1. {language === "es" ? "Información que Recopilamos" : "Information We Collect"}</h2>
          <p>
            {language === "es" 
              ? "Recopilamos información personal como su nombre, dirección de correo electrónico, dirección de envío y detalles de contacto cuando realiza un pedido o se registra en nuestro sitio."
              : "We collect personal information such as your name, email address, shipping address, and contact details when you place an order or register on our site."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">2. {language === "es" ? "Uso de la Información" : "How We Use Your Information"}</h2>
          <p>
            {language === "es"
              ? "Utilizamos su información para procesar pedidos, enviar actualizaciones sobre su compra y mejorar nuestros servicios. Nunca venderemos sus datos a terceros."
              : "We use your information to process orders, send updates about your purchase, and improve our services. We will never sell your data to third parties."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">3. {language === "es" ? "Seguridad de Datos Médicos" : "Medical Data Security"}</h2>
          <p>
            {language === "es"
              ? "Las recetas médicas subidas se almacenan de forma segura y solo son accesibles por nuestro personal farmacéutico autorizado para la validación de pedidos."
              : "Uploaded medical prescriptions are stored securely and are only accessible by our authorized pharmaceutical staff for order validation."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">4. {language === "es" ? "Sus Derechos" : "Your Rights"}</h2>
          <p>
            {language === "es"
              ? "Usted tiene derecho a solicitar el acceso, corrección o eliminación de sus datos personales en cualquier momento contactándonos a info@phcpharmacy.com."
              : "You have the right to request access, correction, or deletion of your personal data at any time by contacting us at info@phcpharmacy.com."}
          </p>
        </section>
      </div>
    </div>
  );
}
