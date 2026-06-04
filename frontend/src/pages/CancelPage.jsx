import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { cancelReservation } from '../lib/bookingApi';

export default function CancelPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // We don't auto-cancel — show confirmation first
    setLoading(false);
  }, []);

  async function handleCancel() {
    setLoading(true);
    try {
      const data = await cancelReservation('silvia-glow', token);
      setResult(data);
      setConfirmed(true);
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo cancelar la cita.');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('es-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center">
        <div className="text-pink-400 text-xl animate-pulse">🌸 Procesando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🌸</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Silvia Glow Studio</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {!confirmed ? (
          <>
            <p className="text-gray-600 mb-6">
              ¿Estás segura que deseas cancelar tu cita?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800 text-left">
              <p className="font-semibold mb-1">⚠️ Política de cancelación</p>
              <p>Cancelaciones con menos de <strong>24 horas</strong> de anticipación tienen un cargo de <strong>$15</strong>.</p>
              <p className="mt-1">No-shows se cobran <strong>$25</strong>.</p>
            </div>
            <button
              onClick={handleCancel}
              className="w-full bg-red-500 text-white py-3 rounded-xl font-medium mb-3 hover:bg-red-600 transition-colors"
            >
              Sí, cancelar mi cita
            </button>
            <a href="/" className="text-sm text-pink-500 underline">
              No, mantener mi cita
            </a>
          </>
        ) : (
          <>
            {result?.already_cancelled ? (
              <p className="text-gray-600">Esta cita ya había sido cancelada.</p>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-left space-y-1">
                  <p className="font-semibold text-green-800">✅ Cita cancelada</p>
                  <p className="text-sm text-gray-600">
                    <strong>Cliente:</strong> {result?.appointment?.client_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Servicio:</strong> {result?.appointment?.service_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Fecha:</strong> {formatDate(result?.appointment?.start_time)}
                  </p>
                </div>

                {result?.fee_charged ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
                    <p className="font-semibold">💳 Cargo por cancelación</p>
                    <p className="mt-1">{result.message}</p>
                  </div>
                ) : (
                  <p className="text-gray-600 mb-4">{result?.message}</p>
                )}
              </>
            )}

            <p className="text-gray-500 text-sm">
              Para hacer una nueva cita visita{' '}
              <a href="/book" className="text-pink-500 underline">silviaglow.com/book</a>
              {' '}o llama al{' '}
              <a href="tel:7184273594" className="text-pink-500">(718) 427-3594</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
