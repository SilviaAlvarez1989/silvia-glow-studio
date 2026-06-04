import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  confirmed: 'bg-blue-100 border-blue-300 text-blue-800',
  in_progress: 'bg-purple-100 border-purple-300 text-purple-800',
  completed: 'bg-green-100 border-green-300 text-green-800',
  cancelled: 'bg-red-100 border-red-300 text-red-500 line-through opacity-60',
  no_show: 'bg-gray-100 border-gray-300 text-gray-500 opacity-60',
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm

export default function CalendarPage() {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedTech, setSelectedTech] = useState('all');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('week'); // week | day

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  useEffect(() => {
    api.get('/staff').then(r => setStaff(r.data.filter(u => u.role === 'technician' && u.active)));
  }, []);

  useEffect(() => {
    setLoading(true);
    const start = format(weekStart, 'yyyy-MM-dd');
    const end = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    api.get(`/appointments?dateFrom=${start}&dateTo=${end}`)
      .then(r => setAppointments(r.data))
      .finally(() => setLoading(false));
  }, [weekStart]);

  const getApptsForDay = (day) => {
    return appointments.filter(a => {
      const match = isSameDay(parseISO(a.start_time), day);
      if (!match) return false;
      if (selectedTech !== 'all' && a.technician_id !== selectedTech) return false;
      return true;
    });
  };

  const getApptStyle = (appt) => {
    const start = parseISO(appt.start_time);
    const end = parseISO(appt.end_time);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = (startHour - 8) * 60; // px (1px = 1min)
    const height = Math.max((endHour - startHour) * 60, 20);
    return { top: `${top}px`, height: `${height}px` };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Calendario</h1>
        <button onClick={() => navigate('/appointments/new')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva Cita
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          <button onClick={() => setView('week')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${view === 'week' ? 'bg-brand-500 text-white' : 'text-gray-600'}`}>Semana</button>
          <button onClick={() => setView('day')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${view === 'day' ? 'bg-brand-500 text-white' : 'text-gray-600'}`}>Día</button>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setWeekStart(w => addDays(w, -7))} className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-700 px-2">
            {format(weekStart, "d MMM", { locale: es })} — {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
          </span>
          <button onClick={() => setWeekStart(w => addDays(w, 7))} className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-3 py-1.5 text-sm border border-gray-200 bg-white rounded-lg hover:bg-gray-50 ml-1">
            Hoy
          </button>
        </div>

        <select
          className="input w-auto text-sm"
          value={selectedTech}
          onChange={e => setSelectedTech(e.target.value)}
        >
          <option value="all">Todas las técnicas</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Week view */}
      <div className="card p-0 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-8 border-b border-gray-100">
          <div className="py-3 px-2" />
          {weekDays.map(day => (
            <div
              key={day.toISOString()}
              className={`py-3 text-center border-l border-gray-100 ${isSameDay(day, today) ? 'bg-brand-50' : ''}`}
            >
              <p className="text-xs text-gray-400 uppercase">{format(day, 'EEE', { locale: es })}</p>
              <p className={`text-sm font-semibold mt-0.5 ${isSameDay(day, today) ? 'text-brand-600' : 'text-gray-700'}`}>
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="overflow-auto max-h-[600px]">
          <div className="grid grid-cols-8 relative" style={{ minHeight: `${13 * 60}px` }}>
            {/* Hour labels */}
            <div className="relative">
              {HOURS.map(h => (
                <div key={h} style={{ position: 'absolute', top: `${(h - 8) * 60}px` }} className="w-full pr-2 text-right">
                  <span className="text-xs text-gray-400">{h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(day => {
              const dayAppts = getApptsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`relative border-l border-gray-100 ${isSameDay(day, today) ? 'bg-brand-50/30' : ''}`}
                  style={{ minHeight: `${13 * 60}px` }}
                >
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      style={{ position: 'absolute', top: `${(h - 8) * 60}px`, left: 0, right: 0 }}
                      className="border-t border-gray-100"
                    />
                  ))}

                  {/* Appointments */}
                  {dayAppts.map(appt => {
                    const style = getApptStyle(appt);
                    const colorClass = STATUS_COLORS[appt.status] || STATUS_COLORS.confirmed;
                    return (
                      <div
                        key={appt.id}
                        style={{ position: 'absolute', left: '2px', right: '2px', ...style }}
                        className={`rounded-md border px-1.5 py-0.5 text-xs cursor-pointer overflow-hidden hover:opacity-80 transition-opacity ${colorClass}`}
                        onClick={() => navigate(`/appointments/${appt.id}`)}
                      >
                        <p className="font-semibold truncate">{appt.client_name}</p>
                        <p className="truncate opacity-80">{appt.service_name}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
