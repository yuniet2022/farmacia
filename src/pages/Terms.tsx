import React from "react";
import { useLanguage } from "../lib/LanguageContext";

export default function Terms() {
  const { language } = useLanguage();

  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">
        {language === "es" ? "Términos y Condiciones" : "Terms and Conditions"}
      </h1>
      
      <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
        <section>
          <h2 className="text-xl font-bold text-slate-800">1. {language === "es" ? "Aceptación de Términos" : "Acceptance of Terms"}</h2>
          <p>
            {language === "es" 
              ? "Al acceder y utilizar este sitio web, usted acepta cumplir con estos términos y condiciones."
              : "By accessing and using this website, you agree to comply with these terms and conditions."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">2. {language === "es" ? "Requisitos de Receta" : "Prescription Requirements"}</h2>
          <p>
            {language === "es"
              ? "Ciertos medicamentos requieren una receta válida emitida por un profesional médico autorizado. Los pedidos no se procesarán hasta que la receta sea validada por nuestros farmacéuticos."
              : "Certain medications require a valid prescription issued by an authorized medical professional. Orders will not be processed until the prescription is validated by our pharmacists."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">3. {language === "es" ? "Pagos y Reembolsos" : "Payments and Refunds"}</h2>
          <p>
            {language === "es"
              ? "Todos los pagos deben realizarse a través de nuestros métodos seguros. Los reembolsos se procesarán de acuerdo con nuestra política de devoluciones."
              : "All payments must be made through our secure methods. Refunds will be processed according to our return policy."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">4. {language === "es" ? "Limitación de Responsabilidad" : "Limitation of Liability"}</h2>
          <p>
            {language === "es"
              ? "PHC Pharmacy no se hace responsable de las reacciones adversas causadas por el uso inadecuado de los medicamentos o por información falsa proporcionada por el usuario."
              : "PHC Pharmacy is not responsible for adverse reactions caused by improper use of medications or by false information provided by the user."}
          </p>
        </section>
      </div>
    </div>
  );
}
