import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Phone, Mail, Clock, DollarSign, User, Scissors } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'no_show', label: 'No asistió' },
];

const PAYMENT_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  no_show: 'bg-gray-100 text-gray-500',
};

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.get(`/appointments/${id}`)
      .then(r => {
        setAppt(r.data);
        setStatus(r.data.status);
        setPaymentMethod(r.data.payment_method || 'pending');
        setPaymentStatus(r.data.payment_status || 'pending');
        setNotes(r.data.notes || '');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/appointments/${id}`, {
        status, paymentMethod, paymentStatus, notes,
      });
      setAppt(res.data);
      alert('Guardado correctamente');
    } catch {
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Cancelar esta cita?')) return;
    await api.delete(`/appointments/${id}`);
    navigate('/appointments');
  };

  if (loading) return <div className="text-center text-brand-500 animate-pulse py-12">Cargando...</div>;
  if (!appt) return <div className="text-center text-gray-400 py-12">Cita no encontrada</div>;

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="card space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{appt.client_name}</h1>
            <p className="text-sm text-gray-500">{appt.service_name}</p>
          </div>
          <span className={`badge ${STATUS_COLORS[appt.status]}`}>
            {STATUS_OPTIONS.find(s => s.value === appt.status)?.label}
          </span>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={15} />
            <span>{format(parseISO(appt.start_time), "d MMM 'a las' h:mm a", { locale: es })}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <DollarSign size={15} />
            <span className="font-semibold text-green-600">${appt.service_price}</span>
          </div>
          {appt.client_phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone size={15} />
              <a href={`tel:${appt.client_phone}`} className="hover:underline">{appt.client_phone}</a>
            </div>
          )}
          {appt.client_email && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail size={15} />
              <span className="truncate">{appt.client_email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600">
            <User size={15} />
            <span>{appt.technician_name || 'Sin asignar'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Scissors size={15} />
            <span>{appt.duration_minutes} min</span>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Actualizar cita</h2>

        <div>
          <label className="label">Estado</label>
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Método de pago</label>
          <select className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Estado del pago</label>
          <select className="input" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="refunded">Reembolsado</option>
          </select>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notas adicionales..."
          />
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {appt.status !== 'cancelled' && (
            <button onClick={handleCancel} className="btn-danger">
              Cancelar cita
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
