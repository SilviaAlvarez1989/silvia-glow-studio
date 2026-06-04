import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Pencil, UserCheck, UserX } from 'lucide-react';

const ROLES = [
  { value: 'manager', label: 'Manager' },
  { value: 'technician', label: 'Técnica' },
];

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'technician', password: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/staff').then(r => setStaff(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm({ name: '', email: '', phone: '', role: 'technician', password: '' });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditId(s.id);
    setForm({ name: s.name, email: s.email, phone: s.phone || '', role: s.role, password: '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const patch = { name: form.name, phone: form.phone, role: form.role };
        if (form.password) patch.password = form.password;
        await api.patch(`/staff/${editId}`, patch);
      } else {
        await api.post('/staff', form);
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

  const toggleActive = async (s) => {
    if (!confirm(`¿${s.active ? 'Desactivar' : 'Activar'} a ${s.name}?`)) return;
    await api.patch(`/staff/${s.id}`, { active: !s.active });
    load();
  };

  const managers = staff.filter(s => s.role === 'manager');
  const technicians = staff.filter(s => s.role === 'technician');

  const ROLE_COLORS = {
    manager: 'bg-purple-100 text-purple-700',
    technician: 'bg-brand-100 text-brand-700',
    admin: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Empleadas</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Agregar
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card border-2 border-brand-200 space-y-3">
          <h2 className="font-semibold text-gray-800">{editId ? 'Editar empleada' : 'Nueva empleada'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Rol</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {!editId && (
                <div>
                  <label className="label">Email *</label>
                  <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required={!editId} />
                </div>
              )}
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className={editId ? 'col-span-2' : ''}>
                <label className="label">{editId ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</label>
                <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editId} minLength={6} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Staff list */}
      {loading ? (
        <div className="text-center text-brand-500 animate-pulse py-12">Cargando...</div>
      ) : (
        <div className="space-y-4">
          {[['Manager', managers], ['Técnicas', technicians]].map(([label, group]) => (
            <div key={label}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</h2>
              {group.length === 0 ? (
                <p className="text-sm text-gray-400 pl-1">Sin empleadas</p>
              ) : (
                <div className="space-y-2">
                  {group.map(s => (
                    <div key={s.id} className={`card flex items-center gap-3 p-3 ${!s.active ? 'opacity-50' : ''}`}>
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                        {s.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{s.name}</p>
                          <span className={`badge ${ROLE_COLORS[s.role]}`}>{s.role === 'manager' ? 'Manager' : 'Técnica'}</span>
                          {!s.active && <span className="badge bg-red-100 text-red-500">Inactiva</span>}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{s.email}</p>
                        {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => toggleActive(s)}
                          className={`p-1.5 rounded-lg transition-colors ${s.active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                        >
                          {s.active ? <UserX size={15} /> : <UserCheck size={15} />}
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
