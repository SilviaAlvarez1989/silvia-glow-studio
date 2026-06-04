import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

const CATEGORIES = ['Pedi & Mani', 'Nails', 'Gel & Specialty'];

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'Nails', price: '', duration_minutes: '60', color: '#ec4899' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/services').then(r => setServices(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm({ name: '', category: 'Nails', price: '', duration_minutes: '60', color: '#ec4899' });
    setShowForm(true);
  };

  const openEdit = (svc) => {
    setEditId(svc.id);
    setForm({
      name: svc.name,
      category: svc.category || 'Nails',
      price: svc.price,
      duration_minutes: svc.duration_minutes,
      color: svc.color || '#ec4899',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/services/${editId}`, form);
      } else {
        await api.post('/services', form);
      }
      setShowForm(false);
      setEditId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar este servicio?')) return;
    await api.delete(`/services/${id}`);
    load();
  };

  // Group by category
  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = services.filter(s => s.category === cat);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Servicios</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Servicio
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card border-2 border-brand-200 space-y-3">
          <h2 className="font-semibold text-gray-800">{editId ? 'Editar servicio' : 'Nuevo servicio'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Nombre *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Categoría</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Color</label>
                <input type="color" className="input h-10 p-1" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              </div>
              <div>
                <label className="label">Precio ($) *</label>
                <input className="input" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Duración (min) *</label>
                <input className="input" type="number" min="5" step="5" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} required />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Services grouped */}
      {loading ? (
        <div className="text-center text-brand-500 animate-pulse py-12">Cargando...</div>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.map(cat => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat}</h2>
              {grouped[cat]?.length === 0 ? (
                <p className="text-sm text-gray-400 pl-1">Sin servicios</p>
              ) : (
                <div className="space-y-2">
                  {grouped[cat]?.map(svc => (
                    <div key={svc.id} className="card flex items-center gap-3 p-3">
                      <div
                        className="w-3 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: svc.color || '#ec4899' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{svc.name}</p>
                        <p className="text-xs text-gray-400">{svc.duration_minutes} minutos</p>
                      </div>
                      <p className="text-sm font-semibold text-green-600 shrink-0">${svc.price}</p>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(svc)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(svc.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
