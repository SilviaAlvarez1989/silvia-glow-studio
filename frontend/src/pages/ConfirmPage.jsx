import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { confirmReservation } from '../lib/bookingApi';

export default function ConfirmPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    confirmReservation(token)
      .then(data => setResult(data))
      .catch(e => setError(e.response?.data?.error || 'No se pudo confirmar la cita.'))
      .finally(() => setLoading(false));
  }, [token]);

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
        <div className="text-pink-400 text-xl animate-pulse">🌸 Confirmando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🌸</div>
        <h1 className="text-xl font-bold text-gray-800 mb-4">Silvia Glow Studio</h1>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            {error}
          </div>
        ) : result?.success ? (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-left space-y-1">
              <p className="font-semibold text-green-800">✅ ¡Cita confirmada!</p>
              <p className="text-sm text-gray-600"><strong>Cliente:</strong> {result.appointment?.client_name}</p>
              <p className="text-sm text-gray-600"><strong>Servicio:</strong> {result.appointment?.service_name}</p>
              <p className="text-sm text-gray-600"><strong>Fecha:</strong> {formatDate(result.appointment?.start_time)}</p>
            </div>
            <p className="text-gray-500 text-sm">
              Te esperamos en{' '}
              <span className="font-medium text-gray-700">854 E 163rd St, Bronx NY</span>
            </p>
          </>
        ) : (
          <p className="text-gray-600">{result?.message}</p>
        )}

        <p className="text-gray-400 text-sm mt-6">
          ¿Preguntas? Llama al{' '}
          <a href="tel:7184273594" className="text-pink-500">(718) 427-3594</a>
        </p>
      </div>
    </div>
  );
}
