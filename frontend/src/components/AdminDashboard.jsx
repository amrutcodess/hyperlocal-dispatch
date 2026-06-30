import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Plus, MapPin, User as UserIcon, Send, RefreshCw, Zap, Package, CheckCircle, Clock, Bike, Copy } from 'lucide-react';

const createDivIcon = (html) => L.divIcon({ html, className: 'custom-div-icon', iconSize: [36, 36], iconAnchor: [18, 18] });

const pickupIconHTML = `<div style="background:#4f8ef7;border:3px solid #fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(79,142,247,0.6)">📍</div>`;
const deliveryIconHTML = `<div style="background:#ef4444;border:3px solid #fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(239,68,68,0.6)">🏠</div>`;
const agentOnlineIcon = (name) => `<div style="background:#10b981;border:3px solid #fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(16,185,129,0.7);position:relative;font-size:14px">🛵<div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:#0b0f19;font-size:8px;border:1px solid #10b981;padding:1px 4px;border-radius:4px;color:#10b981;font-weight:700;white-space:nowrap">${name.split(' ')[0]}</div></div>`;
const agentBusyIcon = (name) => `<div style="background:#f59e0b;border:3px solid #fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(245,158,11,0.7);position:relative;font-size:14px">🛵<div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:#0b0f19;font-size:8px;border:1px solid #f59e0b;padding:1px 4px;border-radius:4px;color:#f59e0b;font-weight:700;white-space:nowrap">${name.split(' ')[0]}</div></div>`;

const MapClickHandler = ({ onMapClick, active }) => {
  useMapEvents({ click(e) { if (active) onMapClick(e.latlng.lng, e.latlng.lat); } });
  return null;
};

const statusIcon = (s) => {
  if (s === 'pending') return <Clock size={11} />;
  if (s === 'assigned') return <Bike size={11} />;
  if (s === 'picked_up') return <Package size={11} />;
  if (s === 'delivered') return <CheckCircle size={11} />;
  return null;
};

const AdminDashboard = ({ token, socket }) => {
  const [orders, setOrders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all' | 'create'

  // Create form state
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupLng, setPickupLng] = useState('77.5946');
  const [pickupLat, setPickupLat] = useState('12.9716');
  const [deliveryLng, setDeliveryLng] = useState('77.6096');
  const [deliveryLat, setDeliveryLat] = useState('12.9816');
  const [items, setItems] = useState('');
  const [fare, setFare] = useState('120');
  const [activeSelect, setActiveSelect] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [dispatchingId, setDispatchingId] = useState(null);

  const fetchData = async () => {
    try {
      const [ordRes, agRes] = await Promise.all([
        fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/agents/nearby?lng=77.5946&lat=12.9716&radius=50000', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (ordRes.ok) setOrders(await ordRes.json());
      if (agRes.ok) setAgents(await agRes.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchData();
    if (socket) {
      socket.on('order_created', (o) => setOrders(prev => [o, ...prev]));
      socket.on('order_updated', (o) => { setOrders(prev => prev.map(x => x._id === o._id ? o : x)); fetchData(); });
      socket.on('agent_location_updated', (d) => setAgents(prev => prev.map(a => a._id === d.agentId ? { ...a, location: d.location, status: d.status } : a)));
      socket.on('agent_status_updated', (d) => setAgents(prev => prev.map(a => a._id === d.agentId ? { ...a, status: d.status, location: d.location } : a)));
    }
    return () => { if (socket) { socket.off('order_created'); socket.off('order_updated'); socket.off('agent_location_updated'); socket.off('agent_status_updated'); } };
  }, [socket, token]);

  const handleDispatch = async (orderId) => {
    setDispatchingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOrders(prev => prev.map(o => o._id === orderId ? data : o));
    } catch (err) {
      alert(err.message || 'Dispatch failed');
    } finally {
      setDispatchingId(null);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName, deliveryAddress,
          pickupLocation: { type: 'Point', coordinates: [parseFloat(pickupLng), parseFloat(pickupLat)] },
          deliveryLocation: { type: 'Point', coordinates: [parseFloat(deliveryLng), parseFloat(deliveryLat)] },
          items: items.split(',').map(i => i.trim()).filter(Boolean),
          fare: parseFloat(fare),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(data.status === 'assigned' ? `✅ Dispatched to ${data.assignedAgent?.name}!` : '✅ Order created — no nearby agent. Will stay pending.');
      setCustomerName(''); setDeliveryAddress(''); setItems('');
      fetchData();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/track/${id}`);
    alert('Tracking link copied!');
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));

  const tabStyle = (t) => ({
    padding: '0.45rem 1rem',
    borderRadius: 8,
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'inherit',
    background: activeTab === t ? 'rgba(79,142,247,0.15)' : 'transparent',
    color: activeTab === t ? 'var(--primary)' : 'var(--text-muted)',
    transition: 'all 0.15s',
  });

  return (
    <div className="page-container fade-in">
      <div className="two-col">

        {/* ── LEFT COLUMN ────────────────────────────────────── */}
        <div className="stack">

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
            <button style={tabStyle('pending')} onClick={() => setActiveTab('pending')}>
              ⏳ Pending {pendingOrders.length > 0 && <span style={{ background: 'var(--accent-red)', color: '#fff', borderRadius: 20, padding: '0 5px', fontSize: '0.65rem', marginLeft: 4 }}>{pendingOrders.length}</span>}
            </button>
            <button style={tabStyle('all')} onClick={() => setActiveTab('all')}>📋 All Orders</button>
            <button style={tabStyle('create')} onClick={() => setActiveTab('create')}>➕ Create</button>
          </div>

          {/* Pending orders — need dispatch action */}
          {activeTab === 'pending' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title"><Clock size={15} style={{ color: 'var(--accent-amber)' }} /> Awaiting Dispatch</span>
                <button onClick={fetchData} className="btn btn-ghost btn-sm"><RefreshCw size={13} /></button>
              </div>
              <div className="card-body stack" style={{ maxHeight: 460, overflowY: 'auto' }}>
                {pendingOrders.length === 0 ? (
                  <div className="empty-state">
                    <CheckCircle size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
                    No pending orders — all caught up!
                  </div>
                ) : pendingOrders.map(order => (
                  <div key={order._id} className="order-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 3 }}>{order.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 3 }}>{order.deliveryAddress}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{order.items.join(' · ')}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem', flexShrink: 0, marginLeft: 12 }}>Rs. {order.fare}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => handleDispatch(order._id)}
                        disabled={dispatchingId === order._id}
                        className="btn btn-success"
                        style={{ flex: 1, fontSize: '0.78rem' }}
                      >
                        <Zap size={13} />
                        {dispatchingId === order._id ? 'Dispatching...' : 'Dispatch Nearest Agent'}
                      </button>
                      <button onClick={() => copyLink(order._id)} className="btn btn-ghost btn-sm" title="Copy tracking link">
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All orders */}
          {activeTab === 'all' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title"><Package size={15} style={{ color: 'var(--primary)' }} /> All Orders</span>
                <button onClick={fetchData} className="btn btn-ghost btn-sm"><RefreshCw size={13} /></button>
              </div>
              <div className="card-body stack" style={{ maxHeight: 480, overflowY: 'auto' }}>
                {orders.length === 0 ? (
                  <div className="empty-state">No orders yet</div>
                ) : orders.map(order => (
                  <div key={order._id} className="order-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{order.customerName}</span>
                        <span className={`order-status ${order.status}`}>{statusIcon(order.status)} {order.status.replace('_', ' ')}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>{order.deliveryAddress}</div>
                      {order.assignedAgent && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Bike size={11} /> {order.assignedAgent.name}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem', marginBottom: 6 }}>Rs. {order.fare}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {order.status === 'pending' && (
                          <button onClick={() => handleDispatch(order._id)} disabled={dispatchingId === order._id} className="btn btn-success btn-sm">
                            <Zap size={11} /> Dispatch
                          </button>
                        )}
                        <button onClick={() => copyLink(order._id)} className="btn btn-ghost btn-sm"><Copy size={11} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create order form */}
          {activeTab === 'create' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title"><Plus size={15} style={{ color: 'var(--primary)' }} /> Create New Order</span>
              </div>
              <div className="card-body">
                {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
                {success && <div className="alert alert-success" style={{ marginBottom: 12 }}>{success}</div>}
                <form onSubmit={handleCreateOrder} className="stack">
                  <div>
                    <label className="form-label">Customer Name</label>
                    <input type="text" required placeholder="Full name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="glass-input" />
                  </div>
                  <div>
                    <label className="form-label">Delivery Address</label>
                    <input type="text" required placeholder="Road, area..." value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="glass-input" />
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span className="section-heading" style={{ margin: 0 }}>Pickup</span>
                      <button type="button" onClick={() => setActiveSelect(activeSelect === 'pickup' ? null : 'pickup')} className={`btn btn-sm ${activeSelect === 'pickup' ? 'btn-primary' : 'btn-ghost'}`}>
                        {activeSelect === 'pickup' ? '🗺 Clicking...' : 'Click Map'}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input type="number" step="0.0001" placeholder="Lng" value={pickupLng} onChange={e => setPickupLng(e.target.value)} className="glass-input" style={{ textAlign: 'center' }} />
                      <input type="number" step="0.0001" placeholder="Lat" value={pickupLat} onChange={e => setPickupLat(e.target.value)} className="glass-input" style={{ textAlign: 'center' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 8px' }}>
                      <span className="section-heading" style={{ margin: 0 }}>Delivery</span>
                      <button type="button" onClick={() => setActiveSelect(activeSelect === 'delivery' ? null : 'delivery')} className={`btn btn-sm ${activeSelect === 'delivery' ? 'btn-danger' : 'btn-ghost'}`}>
                        {activeSelect === 'delivery' ? '🗺 Clicking...' : 'Click Map'}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input type="number" step="0.0001" placeholder="Lng" value={deliveryLng} onChange={e => setDeliveryLng(e.target.value)} className="glass-input" style={{ textAlign: 'center' }} />
                      <input type="number" step="0.0001" placeholder="Lat" value={deliveryLat} onChange={e => setDeliveryLat(e.target.value)} className="glass-input" style={{ textAlign: 'center' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label className="form-label">Items (comma-sep.)</label>
                      <input type="text" required placeholder="Pizza, Coke" value={items} onChange={e => setItems(e.target.value)} className="glass-input" />
                    </div>
                    <div>
                      <label className="form-label">Fare (Rs.)</label>
                      <input type="number" required placeholder="120" value={fare} onChange={e => setFare(e.target.value)} className="glass-input" style={{ textAlign: 'center' }} />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg">
                    <Send size={15} /> {loading ? 'Creating...' : 'Create & Auto-Dispatch'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Agents panel */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><UserIcon size={15} style={{ color: 'var(--accent-green)' }} /> Agents ({agents.filter(a => a.status !== 'offline').length} active)</span>
              <button onClick={fetchData} className="btn btn-ghost btn-sm"><RefreshCw size={13} /></button>
            </div>
            <div className="card-body stack" style={{ maxHeight: 240, overflowY: 'auto' }}>
              {agents.length === 0 ? (
                <div className="empty-state">No agents found nearby</div>
              ) : agents.map(a => (
                <div key={a._id} className="agent-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {a.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        [{a.location?.coordinates?.map(c => c.toFixed(3)).join(', ')}]
                      </div>
                    </div>
                  </div>
                  <span className={`status-pill ${a.status}`}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: MAP ─────────────────────────────── */}
        <div className="stack">
          <div className="card">
            <div className="card-header">
              <span className="card-title"><MapPin size={15} style={{ color: 'var(--primary)' }} /> Live Dispatch Map</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{activeOrders.length} active deliveries</span>
            </div>
            <div style={{ borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
              <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: 520, width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapClickHandler onMapClick={(lng, lat) => {
                  if (activeSelect === 'pickup') { setPickupLng(lng.toFixed(6)); setPickupLat(lat.toFixed(6)); }
                  else if (activeSelect === 'delivery') { setDeliveryLng(lng.toFixed(6)); setDeliveryLat(lat.toFixed(6)); }
                  setActiveSelect(null);
                }} active={!!activeSelect} />
                {agents.filter(a => a.status !== 'offline').map(a => (
                  <Marker key={a._id} position={[a.location.coordinates[1], a.location.coordinates[0]]}
                    icon={createDivIcon(a.status === 'online' ? agentOnlineIcon(a.name) : agentBusyIcon(a.name))}>
                    <Popup><div style={{ padding: 4 }}><p style={{ margin: 0, fontWeight: 700 }}>{a.name}</p><p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.7, textTransform: 'capitalize' }}>{a.status}</p></div></Popup>
                  </Marker>
                ))}
                {activeOrders.map(o => (
                  <React.Fragment key={o._id}>
                    <Marker position={[o.pickupLocation.coordinates[1], o.pickupLocation.coordinates[0]]} icon={createDivIcon(pickupIconHTML)}>
                      <Popup><div style={{ padding: 4 }}><p style={{ margin: 0, fontWeight: 700 }}>Pickup: {o.customerName}</p><p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.7 }}>{o.items.join(', ')}</p></div></Popup>
                    </Marker>
                    <Marker position={[o.deliveryLocation.coordinates[1], o.deliveryLocation.coordinates[0]]} icon={createDivIcon(deliveryIconHTML)}>
                      <Popup><div style={{ padding: 4 }}><p style={{ margin: 0, fontWeight: 700 }}>Delivery</p><p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.7 }}>{o.deliveryAddress}</p></div></Popup>
                    </Marker>
                  </React.Fragment>
                ))}
              </MapContainer>
            </div>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
              <span>🟢 Online agent</span>
              <span>🟡 Busy agent</span>
              <span>📍 Pickup point</span>
              <span>🏠 Delivery point</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
