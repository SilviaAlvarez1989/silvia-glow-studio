import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { format, addDays } from 'date-fns';
import { ArrowLeft } from 'lucide-react';

export default function NewAppointment() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    serviceId: '',
    technicianId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '',
    paymentMethod: 'pending',
    notes: '',
  });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/services'), api.get('/staff')]).then(([svcRes, staffRes]) => {
      setServices(svcRes.data);
      setStaff(staffRes.data.filter(u => u.role === 'technician' && u.active));
    });
  }, []);

  useEffect(() => {
    if (!form.serviceId || !form.date) return;
    setLoadingSlots(true);
    setForm(f => ({ ...f, startTime: '' }));
    api.get(`/appointments/availability?date=${form.date}&serviceId=${form.serviceId}${form.technicianId ? `&technicianId=${form.technicianId}` : ''}`)
      .then(r => setSlots(r.data))
      .finally(() => setLoadingSlots(false));
  }, [form.serviceId, form.date, form.technicianId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startTime) return setError('Selecciona un horario disponible');
    setSaving(true);
    setError('');
    try {
      const startTime = `${form.date}T${format(new Date(form.startTime), 'HH:mm:ss')}`;
      await api.post('/appointments', {
        ...form,
        startTime: form.startTime,
      });
      navigate('/appointments');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la cita');
    } finally {
      setSaving(false);
    }
  };

  const availableSlots = slots.filter(s => s.available);

  // Group services by category
  const categories = [...new Set(services.map(s => s.category))];

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Volver
      </button>
      <h1 className="text-xl font-bold text-gray-900">Nueva Cita</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
        )}

        {/* Client info */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800">Datos del cliente</h2>
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} required placeholder="Nombre completo" />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} placeholder="+1 (xxx) xxx-xxxx" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="email@ejemplo.com" />
          </div>
        </div>

        {/* Service */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800">Servicio</h2>
          <div>
            <label className="label">Servicio *</label>
            <select className="input" value={form.serviceId} onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))} required>
              <option value="">Seleccionar servicio...</option>
              {categories.map(cat => (
                <optgroup key={cat} label={cat}>
                  {services.filter(s => s.category === cat).map(s => (
                    <option key={s.id} value={s.id}>{s.name} — ${s.price} ({s.duration_minutes} min)</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Técnica</label>
            <select className="input" value={form.technicianId} onChange={e => setForm(f => ({ ...f, technicianId: e.target.value }))}>
              <option value="">Cualquier técnica disponible</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Date & Time */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800">Fecha y hora</h2>
          <div>
            <label className="label">Fecha *</label>
            <input
              type="date"
              className="input"
              value={form.date}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
            />
          </div>

          {form.serviceId && form.date && (
            <div>
              <label className="label">Horario disponible *</label>
              {loadingSlots ? (
                <p className="text-sm text-brand-500 animate-pulse">Buscando horarios...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-red-500">No hay horarios disponibles para esta fecha</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {availableSlots.map(slot => {
                    const time = new Date(slot.time);
                    const label = format(time, 'h:mm a');
                    const selected = form.startTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, startTime: slot.time }))}
                        className={`py-2 text-xs rounded-lg border font-medium transition-colors ${
                          selected
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment & Notes */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800">Pago y notas</h2>
          <div>
            <label className="label">Método de pago</label>
            <select className="input" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
              <option value="pending">Por definir</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
            </select>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas adicionales..."
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? 'Guardando...' : 'Crear Cita'}
        </button>
      </form>
    </div>
  );
}
