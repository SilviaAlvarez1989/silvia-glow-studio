import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSalonInfo, getServices, getStaff, getAvailability, createDepositIntent, createReservation } from '../lib/bookingApi';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK || 'pk_live_placeholder');

const DEPOSIT_AMOUNT = 25;

const STEPS = ['Servicio', 'Técnica', 'Fecha & Hora', 'Tus Datos', 'Pago', 'Confirmar'];

const TERMS_TEXT = `POLÍTICA DE CANCELACIÓN — Silvia Glow Studio LLC

Al reservar una cita, usted acepta los siguientes términos:

1. CANCELACIÓN: Las cancelaciones realizadas con menos de 24 horas de anticipación están sujetas a un cargo de $15.00.

2. NO-SHOW: Si no se presenta a su cita y no notifica con anticipación, se aplicará un cargo de $25.00.

3. CARGO A TARJETA: Al proporcionar su información de tarjeta, autoriza a Silvia Glow Studio LLC a cargar las tarifas de cancelación o no-show según esta política.

4. DISPUTA DE CARGOS: La aceptación de estos términos, registrada con fecha, hora y dirección IP, constituye evidencia de autorización válida conforme a los términos del procesador de pagos.

5. MODIFICACIONES: Las citas pueden reprogramarse sin cargo con más de 24 horas de anticipación llamando al (718) 427-3594.

Dirección: 854 E 163rd St, Bronx, NY 10459
Teléfono: (718) 427-3594`;

function getClientIP() {
  // Best effort — real IP comes from server side
  return 'client-side';
}

export default function BookingPage() {
  const { slug = 'silvia-glow' } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Form state
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null); // null = any
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [cardBrand, setCardBrand] = useState('Visa');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [depositPaid, setDepositPaid] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [s, svcs, stf] = await Promise.all([
          getSalonInfo(slug),
          getServices(slug),
          getStaff(slug),
        ]);
        setSalon(s);
        setServices(svcs);
        setStaff(stf);
      } catch (e) {
        setError('No se pudo cargar el salón.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (step === 2 && selectedDate && selectedService) {
      setAvailability([]);
      getAvailability(slug, {
        date: selectedDate,
        service_id: selectedService.id,
        technician_id: selectedStaff?.id,
      }).then(data => setAvailability(data.slots || []));
    }
  }, [step, selectedDate, selectedService, selectedStaff]);

  // Min date = today
  const today = new Date().toISOString().split('T')[0];

  // Group services by category
  const servicesByCategory = services.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  function formatTime(t) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  function formatDate(d) {
    if (!d) return '';
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('es-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  async function handleSubmit() {
    if (!termsAccepted) {
      setError('Debes aceptar los términos de cancelación.');
      return;
    }
    if (!paymentIntentId || !depositPaid) {
      setError('Debes pagar el depósito de $25 para confirmar la cita.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const data = await createReservation(slug, {
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        service_id: selectedService.id,
        technician_id: selectedStaff?.id || null,
        date: selectedDate,
        time: selectedTime,
        payment_intent_id: paymentIntentId,
        terms_accepted: true,
        terms_ip: getClientIP(),
      });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al confirmar la cita. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayDeposit() {
    setProcessingPayment(true);
    setError('');
    try {
      // Create deposit intent on backend
      const { clientSecret } = await createDepositIntent(slug, {
        client_name: clientName,
        client_email: clientEmail,
      });

      // Load Stripe and confirm payment
      const stripe = await stripePromise;
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: window.__stripeCardElement,
          billing_details: {
            name: clientName,
            email: clientEmail || undefined,
            phone: clientPhone,
          },
        },
      });

      if (stripeError) {
        setError(stripeError.message);
      } else if (paymentIntent.status === 'succeeded') {
        setPaymentIntentId(paymentIntent.id);
        setDepositPaid(true);
        setStep(5); // Go to confirm step
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Error procesando el pago. Intenta de nuevo.');
    } finally {
      setProcessingPayment(false);
    }
  }

  // ── SUCCESS SCREEN ──────────────────────────────────────────────
  if (result) {
    const waMessage = encodeURIComponent(
      `Hola Silvia! 🌸 Acabo de reservar una cita:\n\n` +
      `👤 Nombre: ${result.appointment.client_name}\n` +
      `💅 Servicio: ${result.appointment.service_name}\n` +
      `📅 Fecha: ${formatDate(selectedDate)}\n` +
      `⏰ Hora: ${formatTime(selectedTime)}\n` +
      `💰 Precio: $${result.appointment.price}\n\n` +
      `¡Nos vemos pronto!`
    );
    const waLink = `https://wa.me/17184273594?text=${waMessage}`;

    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🌸</div>
          <h1 className="text-2xl font-bold text-pink-600 mb-2">¡Cita Confirmada!</h1>
          <div className="bg-pink-50 rounded-xl p-4 mb-4 text-left space-y-2">
            <p><span className="font-semibold">👤 Nombre:</span> {result.appointment.client_name}</p>
            <p><span className="font-semibold">💅 Servicio:</span> {result.appointment.service_name}</p>
            <p><span className="font-semibold">👩‍🔧 Técnica:</span> {result.appointment.technician_name}</p>
            <p><span className="font-semibold">📅 Fecha:</span> {formatDate(selectedDate)}</p>
            <p><span className="font-semibold">⏰ Hora:</span> {formatTime(selectedTime)}</p>
            <p><span className="font-semibold">💰 Precio:</span> ${result.appointment.price}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-4">
            ⚠️ {result.policy}
          </div>

          {/* WhatsApp confirmation button */}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-lg mb-3 transition-all active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Confirmar por WhatsApp
          </a>

          {/* Google Review button */}
          <a
            href="https://g.page/r/CYgTQYS8TWLnEBE/review"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-white border-2 border-gray-200 hover:border-yellow-400 text-gray-700 font-bold py-3 rounded-xl text-sm mb-3 transition-all active:scale-95"
          >
            <span className="text-xl">⭐</span>
            ¿Cómo fue tu experiencia? Déjanos una reseña
          </a>

          <p className="text-gray-500 text-sm mb-4">
            Para cancelar o cambiar tu cita llama al <a href="tel:7184273594" className="text-pink-600 font-semibold">(718) 427-3594</a>
          </p>
          <a
            href={result.cancel_url}
            className="text-sm text-gray-400 underline"
          >
            Cancelar esta cita
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center">
        <div className="text-pink-400 text-xl animate-pulse">🌸 Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="text-2xl">🌸</div>
          <div>
            <h1 className="font-bold text-gray-800 leading-tight">{salon?.name}</h1>
            <p className="text-xs text-gray-500">{salon?.address}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="flex border-t border-gray-100">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
                i === step ? 'bg-pink-500 text-white' :
                i < step ? 'bg-pink-100 text-pink-600' :
                'text-gray-400'
              }`}
            >
              {i < step ? '✓' : i + 1}. {s}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* ── STEP 0: Servicio ── */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">¿Qué servicio quieres?</h2>
            {Object.entries(servicesByCategory).map(([cat, svcs]) => (
              <div key={cat} className="mb-5">
                <h3 className="text-sm font-semibold text-pink-500 uppercase tracking-wide mb-2">{cat}</h3>
                <div className="space-y-2">
                  {svcs.map(svc => (
                    <button
                      key={svc.id}
                      onClick={() => { setSelectedService(svc); setStep(1); }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                        selectedService?.id === svc.id
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-100 bg-white hover:border-pink-200'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-800">{svc.name}</p>
                        <p className="text-xs text-gray-500">{svc.duration_minutes} min</p>
                      </div>
                      <span className="text-pink-600 font-bold">${svc.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 1: Técnica ── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">¿Con quién quieres la cita?</h2>
            <button
              onClick={() => { setSelectedStaff(null); setStep(2); }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 mb-2 transition-all ${
                selectedStaff === null ? 'border-pink-500 bg-pink-50' : 'border-gray-100 bg-white hover:border-pink-200'
              }`}
            >
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-xl">✨</div>
              <div className="text-left">
                <p className="font-medium text-gray-800">Sin preferencia</p>
                <p className="text-xs text-gray-500">Primera disponible</p>
              </div>
            </button>
            {staff.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedStaff(t); setStep(2); }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 mb-2 transition-all ${
                  selectedStaff?.id === t.id ? 'border-pink-500 bg-pink-50' : 'border-gray-100 bg-white hover:border-pink-200'
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full flex items-center justify-center text-white font-bold">
                  {t.name.charAt(0)}
                </div>
                <p className="font-medium text-gray-800">{t.name}</p>
              </button>
            ))}
            <button onClick={() => setStep(0)} className="mt-4 text-sm text-gray-400 underline">← Volver</button>
          </div>
        )}

        {/* ── STEP 2: Fecha & Hora ── */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">¿Cuándo quieres venir?</h2>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona la fecha</label>
            <input
              type="date"
              min={today}
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }}
              className="w-full border-2 border-gray-200 rounded-xl p-3 mb-5 focus:border-pink-400 focus:outline-none text-gray-800"
            />
            {selectedDate && (
              <>
                <p className="text-sm font-medium text-gray-700 mb-2">Horarios disponibles</p>
                {availability.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-3xl mb-2">😔</p>
                    <p>No hay horarios disponibles para esta fecha.</p>
                    <p className="text-sm">Prueba con otra fecha.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availability.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                          selectedTime === slot
                            ? 'bg-pink-500 border-pink-500 text-white'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-pink-300'
                        }`}
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="text-sm text-gray-400 underline">← Volver</button>
              {selectedTime && (
                <button
                  onClick={() => setStep(3)}
                  className="ml-auto bg-pink-500 text-white px-6 py-2 rounded-xl font-medium"
                >
                  Continuar →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Datos del cliente ── */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Tus datos</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-pink-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="(718) 000-0000"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-pink-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (opcional)</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-pink-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(2)} className="text-sm text-gray-400 underline">← Volver</button>
              <button
                onClick={() => {
                  if (!clientName.trim() || !clientPhone.trim()) {
                    setError('Nombre y teléfono son requeridos.');
                    return;
                  }
                  setError('');
                  setStep(4);
                }}
                className="ml-auto bg-pink-500 text-white px-6 py-2 rounded-xl font-medium"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Pago del depósito ── */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Depósito de Reserva</h2>

            <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💳</span>
                <div>
                  <p className="font-bold text-pink-700 text-lg">${DEPOSIT_AMOUNT}.00 — Depósito Obligatorio</p>
                  <p className="text-sm text-pink-600">Se aplica al total de tu servicio cuando llegas</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 mt-3 text-xs text-gray-600 space-y-1">
                <p>✅ Si llegas a tu cita → los $25 se descuentan del precio total</p>
                <p>❌ Si no te presentas (no-show) → los $25 cubren la hora perdida</p>
                <p>🔄 Cancelación con +24h de anticipación → reembolso completo</p>
              </div>
            </div>

            {/* Stripe Card Element container */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tarjeta de crédito o débito</label>
              <div
                id="card-element"
                className="border-2 border-gray-200 rounded-xl p-4 bg-white focus-within:border-pink-400"
                ref={(el) => {
                  if (el && !el.dataset.mounted) {
                    el.dataset.mounted = 'true';
                    stripePromise.then(stripe => {
                      const elements = stripe.elements();
                      const card = elements.create('card', {
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#374151',
                            '::placeholder': { color: '#9ca3af' },
                          },
                        },
                      });
                      card.mount(el);
                      window.__stripeCardElement = card;
                    });
                  }
                }}
              ></div>
            </div>

            {/* Terms */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-pink-500"
                />
                <label htmlFor="terms" className="text-sm text-gray-700">
                  Acepto la{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-pink-600 underline font-medium"
                  >
                    política de cancelación
                  </button>
                  . Entiendo que se cobra un depósito de <strong>${DEPOSIT_AMOUNT}</strong> que se aplica a mi servicio si me presento. Si no me presento, cubre la hora perdida.
                </label>
              </div>
            </div>

            <button
              onClick={handlePayDeposit}
              disabled={processingPayment || !termsAccepted}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${
                processingPayment || !termsAccepted
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 active:scale-95'
              }`}
            >
              {processingPayment ? '⏳ Procesando pago...' : `💳 Pagar Depósito $${DEPOSIT_AMOUNT}.00`}
            </button>
            <button onClick={() => setStep(3)} className="mt-3 w-full text-sm text-gray-400 underline">← Volver</button>
          </div>
        )}

        {/* ── STEP 5: Confirmar ── */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Confirma tu cita</h2>

            {/* Deposit paid badge */}
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 mb-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-green-700">Depósito de ${DEPOSIT_AMOUNT}.00 pagado</p>
                <p className="text-xs text-green-600">Se aplica al total de tu servicio</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl border-2 border-pink-100 p-4 mb-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Servicio</span>
                <span className="font-medium text-sm">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Técnica</span>
                <span className="font-medium text-sm">{selectedStaff?.name || 'Sin preferencia'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Fecha</span>
                <span className="font-medium text-sm">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Hora</span>
                <span className="font-medium text-sm">{formatTime(selectedTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Duración</span>
                <span className="font-medium text-sm">{selectedService?.duration_minutes} min</span>
              </div>
              <hr className="border-pink-100" />
              <div className="flex justify-between">
                <span className="text-gray-700 font-semibold">Total del servicio</span>
                <span className="text-pink-600 font-bold text-lg">${selectedService?.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Depósito pagado</span>
                <span className="text-green-600 font-semibold">-${DEPOSIT_AMOUNT}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-semibold">Balance a pagar en salón</span>
                <span className="text-pink-600 font-bold text-lg">${Math.max(0, (selectedService?.price || 0) - DEPOSIT_AMOUNT)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${
                submitting
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-pink-500 hover:bg-pink-600 active:scale-95'
              }`}
            >
              {submitting ? '⏳ Confirmando...' : '🌸 Confirmar Cita'}
            </button>
            <button onClick={() => setStep(4)} className="mt-3 w-full text-sm text-gray-400 underline">← Volver</button>
          </div>
        )}
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-800">Términos de Cancelación</h3>
              <button onClick={() => setShowTerms(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {TERMS_TEXT}
              </pre>
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => { setTermsAccepted(true); setShowTerms(false); }}
                className="w-full bg-pink-500 text-white py-3 rounded-xl font-medium"
              >
                Acepto los términos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
