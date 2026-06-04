import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Calendar, Users, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

const STATUS_LABELS = {
  pending: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmada', cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En progreso', cls: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completada', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-700' },
  no_show: { label: 'No asistió', cls: 'bg-gray-100 text-gray-500' },
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-brand-500 animate-pulse text-lg">Cargando...</div>
    </div>
  );

  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 capitalize">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Calendar} label="Citas hoy" value={data?.todayCount ?? 0} color="bg-brand-500" />
        <StatCard icon={Users} label="Clientes" value={data?.totalClients ?? 0} color="bg-blue-500" />
        <StatCard icon={DollarSign} label="Este mes" value={`$${data?.monthRevenue?.toFixed(0) ?? 0}`} color="bg-green-500" />
        <StatCard icon={Clock} label="Cobros pend." value={data?.pendingPayments ?? 0} color="bg-orange-500" />
      </div>

      {/* Upcoming appointments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Próximas citas</h2>
          <button onClick={() => navigate('/appointments')} className="text-sm text-brand-600 hover:underline">
            Ver todas
          </button>
        </div>
        {data?.upcomingAppointments?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No hay citas próximas</p>
        ) : (
          <div className="space-y-3">
            {data?.upcomingAppointments?.map(appt => {
              const status = STATUS_LABELS[appt.status] || STATUS_LABELS.pending;
              return (
                <div
                  key={appt.id}
                  onClick={() => navigate(`/appointments/${appt.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">
                    {appt.client_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{appt.client_name}</p>
                    <p className="text-xs text-gray-400 truncate">{appt.service_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-700">
                      {format(new Date(appt.start_time), 'h:mm a')}
                    </p>
                    <span className={`badge ${status.cls} text-xs`}>{status.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/appointments/new')}
          className="card flex flex-col items-center gap-2 py-6 hover:bg-brand-50 hover:border-brand-200 transition-colors cursor-pointer border border-transparent"
        >
          <span className="text-3xl">📅</span>
          <span className="text-sm font-medium text-gray-700">Nueva Cita</span>
        </button>
        <button
          onClick={() => navigate('/clients')}
          className="card flex flex-col items-center gap-2 py-6 hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer border border-transparent"
        >
          <span className="text-3xl">👤</span>
          <span className="text-sm font-medium text-gray-700">Ver Clientes</span>
        </button>
      </div>
    </div>
  );
}
