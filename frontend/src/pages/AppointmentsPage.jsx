import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Plus, Search, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_LABELS = {
  pending: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmada', cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En progreso', cls: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completada', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-600' },
  no_show: { label: 'No asistió', cls: 'bg-gray-100 text-gray-500' },
};

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/appointments?date=${date}${statusFilter ? `&status=${statusFilter}` : ''}`)
      .then(r => setAppointments(r.data))
      .finally(() => setLoading(false));
  }, [date, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Citas</h1>
        <button onClick={() => navigate('/appointments/new')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva Cita
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="date"
          className="input w-auto text-sm"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <select
          className="input w-auto text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-brand-500 animate-pulse py-12">Cargando...</div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📅</p>
          <p>No hay citas para esta fecha</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map(appt => {
            const status = STATUS_LABELS[appt.status] || STATUS_LABELS.pending;
            return (
              <div
                key={appt.id}
                onClick={() => navigate(`/appointments/${appt.id}`)}
                className="card flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow p-3"
              >
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                  {appt.client_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{appt.client_name}</p>
                    <span className={`badge ${status.cls}`}>{status.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{appt.service_name} — {appt.technician_name || 'Sin asignar'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-gray-700">
                    {format(parseISO(appt.start_time), 'h:mm a')}
                  </p>
                  <p className="text-xs text-green-600 font-medium">${appt.service_price}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
