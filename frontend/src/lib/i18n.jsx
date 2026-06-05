import { createContext, useContext, useState } from 'react';

const translations = {
  es: {
    // Steps
    step_service: 'Servicio',
    step_technician: 'Técnica',
    step_datetime: 'Fecha & Hora',
    step_details: 'Tus Datos',
    step_payment: 'Pago',
    step_confirm: 'Confirmar',

    // Step 0 - Service
    what_service: '¿Qué servicio quieres?',
    minutes: 'min',

    // Step 1 - Technician
    who_with: '¿Con quién quieres la cita?',
    no_preference: 'Sin preferencia',
    first_available: 'Primera disponible',
    back: '← Volver',

    // Step 2 - Date & Time
    when_come: '¿Cuándo quieres venir?',
    select_date: 'Selecciona la fecha',
    available_times: 'Horarios disponibles',
    no_slots: 'No hay horarios disponibles para esta fecha.',
    try_another: 'Prueba con otra fecha.',
    continue: 'Continuar →',

    // Step 3 - Client details
    your_details: 'Tus datos',
    full_name: 'Nombre completo *',
    your_name: 'Tu nombre',
    phone: 'Teléfono *',
    email_optional: 'Email (opcional)',
    name_phone_required: 'Nombre y teléfono son requeridos.',

    // Step 4 - Payment
    deposit_title: 'Depósito de Reserva',
    deposit_amount: 'Depósito por Zelle',
    deposit_obligatory: 'Depósito Obligatorio',
    deposit_applies: 'Se aplica al total de tu servicio cuando llegas',
    scan_qr: 'Escanea el QR con tu app de banco',
    or_send_manually: 'O envía manualmente a:',
    name_label: 'Nombre:',
    email_label: 'Email:',
    amount_label: 'Monto:',
    deposit_if_show: 'Si llegas a tu cita → los $25 se descuentan del precio total',
    deposit_if_noshow: 'Si no te presentas (no-show) → los $25 cubren la hora perdida',
    deposit_if_cancel: 'Cancelación con +24h de anticipación → reembolso completo',
    after_sending: 'Después de enviar el Zelle:',
    zelle_sender_name: 'Nombre con el que enviaste el Zelle',
    your_zelle_name: 'Tu nombre en Zelle',
    already_sent: 'Ya envié',
    by_zelle_to: 'por Zelle a',
    accept_policy: 'Acepto la',
    cancellation_policy: 'política de cancelación',
    deposit_terms: 'que se aplica a mi servicio si me presento. Si no me presento, cubre la hora perdida.',
    deposit_understand: 'Entiendo que se cobra un depósito de',
    confirm_zelle_sent: 'Confirma que enviaste el Zelle para continuar.',
    accept_terms_required: 'Debes aceptar los términos.',
    btn_zelle_continue: '✅ Ya envié el Zelle — Continuar',

    // Step 5 - Confirm
    confirm_appointment: 'Confirma tu cita',
    deposit_sent_badge: 'enviado por Zelle',
    pending_verification: 'Pendiente de confirmación por el salón',
    service_label: 'Servicio',
    technician_label: 'Técnica',
    date_label: 'Fecha',
    time_label: 'Hora',
    duration_label: 'Duración',
    service_total: 'Total del servicio',
    zelle_deposit: 'Depósito Zelle',
    balance_salon: 'Balance a pagar en salón',
    btn_confirm: '🌸 Confirmar Cita',
    confirming: '⏳ Confirmando...',

    // Success
    appointment_confirmed: '¡Cita Confirmada!',
    confirm_whatsapp: 'Confirmar por WhatsApp',
    review_prompt: '¿Cómo fue tu experiencia? Déjanos una reseña',
    cancel_change: 'Para cancelar o cambiar tu cita llama al',
    cancel_this: 'Cancelar esta cita',

    // Terms
    terms_title: 'Términos de Cancelación',
    btn_accept_terms: 'Acepto los términos',

    // General
    loading: '🌸 Cargando...',
    error_load: 'No se pudo cargar el salón.',
    error_generic: 'Error al confirmar la cita. Intenta de nuevo.',
    error_terms: 'Debes aceptar los términos de cancelación.',
    error_zelle: 'Debes confirmar que enviaste el depósito de $25 por Zelle.',
  },

  en: {
    // Steps
    step_service: 'Service',
    step_technician: 'Technician',
    step_datetime: 'Date & Time',
    step_details: 'Your Info',
    step_payment: 'Payment',
    step_confirm: 'Confirm',

    // Step 0 - Service
    what_service: 'What service would you like?',
    minutes: 'min',

    // Step 1 - Technician
    who_with: 'Who would you like your appointment with?',
    no_preference: 'No preference',
    first_available: 'First available',
    back: '← Back',

    // Step 2 - Date & Time
    when_come: 'When would you like to come?',
    select_date: 'Select a date',
    available_times: 'Available times',
    no_slots: 'No available times for this date.',
    try_another: 'Try another date.',
    continue: 'Continue →',

    // Step 3 - Client details
    your_details: 'Your information',
    full_name: 'Full name *',
    your_name: 'Your name',
    phone: 'Phone *',
    email_optional: 'Email (optional)',
    name_phone_required: 'Name and phone are required.',

    // Step 4 - Payment
    deposit_title: 'Booking Deposit',
    deposit_amount: 'Zelle Deposit',
    deposit_obligatory: 'Required Deposit',
    deposit_applies: 'Applied to your service total when you arrive',
    scan_qr: 'Scan the QR with your banking app',
    or_send_manually: 'Or send manually to:',
    name_label: 'Name:',
    email_label: 'Email:',
    amount_label: 'Amount:',
    deposit_if_show: 'If you show up → $25 is deducted from your total',
    deposit_if_noshow: 'If you don\'t show (no-show) → $25 covers the lost hour',
    deposit_if_cancel: 'Cancel 24h+ in advance → full refund',
    after_sending: 'After sending the Zelle:',
    zelle_sender_name: 'Name you sent Zelle from',
    your_zelle_name: 'Your Zelle name',
    already_sent: 'I already sent',
    by_zelle_to: 'via Zelle to',
    accept_policy: 'I accept the',
    cancellation_policy: 'cancellation policy',
    deposit_terms: 'that applies to my service if I show up. If I don\'t show, it covers the lost hour.',
    deposit_understand: 'I understand a deposit of',
    confirm_zelle_sent: 'Please confirm you sent the Zelle to continue.',
    accept_terms_required: 'You must accept the terms.',
    btn_zelle_continue: '✅ I sent the Zelle — Continue',

    // Step 5 - Confirm
    confirm_appointment: 'Confirm your appointment',
    deposit_sent_badge: 'sent via Zelle',
    pending_verification: 'Pending salon verification',
    service_label: 'Service',
    technician_label: 'Technician',
    date_label: 'Date',
    time_label: 'Time',
    duration_label: 'Duration',
    service_total: 'Service total',
    zelle_deposit: 'Zelle Deposit',
    balance_salon: 'Balance due at salon',
    btn_confirm: '🌸 Confirm Appointment',
    confirming: '⏳ Confirming...',

    // Success
    appointment_confirmed: 'Appointment Confirmed!',
    confirm_whatsapp: 'Confirm via WhatsApp',
    review_prompt: 'How was your experience? Leave us a review',
    cancel_change: 'To cancel or change your appointment call',
    cancel_this: 'Cancel this appointment',

    // Terms
    terms_title: 'Cancellation Terms',
    btn_accept_terms: 'I accept the terms',

    // General
    loading: '🌸 Loading...',
    error_load: 'Could not load salon.',
    error_generic: 'Error confirming appointment. Please try again.',
    error_terms: 'You must accept the cancellation terms.',
    error_zelle: 'You must confirm you sent the $25 Zelle deposit.',
  }
};

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    // Check saved preference
    const saved = localStorage.getItem('silvia-glow-lang');
    if (saved && (saved === 'en' || saved === 'es')) return saved;
    // Detect browser language
    const browserLang = navigator.language?.slice(0, 2);
    return browserLang === 'es' ? 'es' : 'en';
  });

  const toggleLang = () => {
    const newLang = lang === 'es' ? 'en' : 'es';
    setLang(newLang);
    localStorage.setItem('silvia-glow-lang', newLang);
  };

  const t = (key) => translations[lang]?.[key] || translations['es'][key] || key;

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export function LangToggle() {
  const { lang, toggleLang } = useLang();
  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 border border-gray-200 text-sm font-medium shadow-sm hover:shadow transition-all active:scale-95"
      aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
    >
      <span className="text-base">{lang === 'es' ? '🇺🇸' : '🇪🇸'}</span>
      <span className="text-gray-700">{lang === 'es' ? 'EN' : 'ES'}</span>
    </button>
  );
}
