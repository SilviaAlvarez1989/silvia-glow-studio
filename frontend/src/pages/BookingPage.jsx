import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSalonInfo, getServices, getStaff, getAvailability, createReservation } from '../lib/bookingApi';

const STEPS = ['Servicio', 'Técnica', 'Fecha & Hora', 'Tus Datos', 'Confirmar'];

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
    if (!cardLast4 || cardLast4.length !== 4) {
      setError('Ingresa los últimos 4 dígitos de tu tarjeta.');
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
        card_last4: cardLast4,
        card_brand: cardBrand,
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

  // ── SUCCESS SCREEN ──────────────────────────────────────────────
  if (result) {
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

              {/* Card info for cancellation policy */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">💳 Tarjeta para política de cancelación</p>
                <p className="text-xs text-amber-700 mb-3">
                  No se hace ningún cargo ahora. Solo se usa si cancelas tarde o no te presentas.
                </p>
                <div className="flex gap-2">
                  <select
                    value={cardBrand}
                    onChange={e => setCardBrand(e.target.value)}
                    className="border-2 border-amber-200 rounded-lg p-2 text-sm bg-white"
                  >
                    <option>Visa</option>
                    <option>Mastercard</option>
                    <option>Amex</option>
                    <option>Discover</option>
                  </select>
                  <input
                    type="text"
                    value={cardLast4}
                    onChange={e => setCardLast4(e.target.value.replace(/\D/g,'').slice(0,4))}
                    placeholder="Últimos 4 dígitos"
                    maxLength={4}
                    className="flex-1 border-2 border-amber-200 rounded-lg p-2 text-sm focus:border-amber-400 focus:outline-none"
                  />
                </div>
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

        {/* ── STEP 4: Confirmar ── */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Confirma tu cita</h2>

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
                <span className="text-gray-700 font-semibold">Total</span>
                <span className="text-pink-600 font-bold text-lg">${selectedService?.price}</span>
              </div>
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
                  . Entiendo que cancelaciones con menos de 24 horas tienen un cargo de{' '}
                  <strong>$15</strong> y los no-shows de <strong>$25</strong>, cargados a mi tarjeta {cardBrand} terminada en <strong>{cardLast4 || '****'}</strong>.
                </label>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !termsAccepted}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${
                submitting || !termsAccepted
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-pink-500 hover:bg-pink-600 active:scale-95'
              }`}
            >
              {submitting ? '⏳ Confirmando...' : '🌸 Confirmar Cita'}
            </button>
            <button onClick={() => setStep(3)} className="mt-3 w-full text-sm text-gray-400 underline">← Volver</button>
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
