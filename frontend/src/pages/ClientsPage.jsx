import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Search, Plus, Phone, Mail } from 'lucide-react';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = (q = '') => {
    setLoading(true);
    api.get(`/clients${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(r => setClients(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    clearTimeout(window._st);
    window._st = setTimeout(() => load(e.target.value), 400);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/clients', form);
      setShowForm(false);
      setForm({ name: '', phone: '', email: '', notes: '' });
      load(search);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      {/* New client form */}
      {showForm && (
        <div className="card border-brand-200 border-2 space-y-3">
          <h2 className="font-semibold text-gray-800">Nuevo Cliente</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Notas</label>
                <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center text-brand-500 animate-pulse py-12">Cargando...</div>
      ) : clients.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">👤</p>
          <p>{search ? 'No se encontraron resultados' : 'No hay clientes aún'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map(client => (
            <div
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="card flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow p-3"
            >
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                {client.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{client.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {client.phone && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Phone size={11} />{client.phone}
                    </span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Mail size={11} />{client.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">{client.visit_count} visitas</p>
                <p className="text-xs text-green-600 font-medium">${parseFloat(client.total_spent || 0).toFixed(0)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
