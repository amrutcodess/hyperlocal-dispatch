import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ShoppingBag, MapPin, Send, Package, Clock, CheckCircle, Bike } from 'lucide-react';

const createDivIcon = (html) => L.divIcon({
  html, className: 'custom-div-icon', iconSize: [28, 28], iconAnchor: [14, 14],
});

const pickupIconHTML = `<div style="background:#4f8ef7;border:3px solid #fff;width:22px;height:22px;border-radius:50%;box-shadow:0 0 10px rgba(79,142,247,0.6)"></div>`;
const deliveryIconHTML = `<div style="background:#ef4444;border:3px solid #fff;width:22px;height:22px;border-radius:50%;box-shadow:0 0 10px rgba(239,68,68,0.6)"></div>`;

const HARDCODED_MENU = [
  { id: '1', name: 'Margherita Pizza', price: 249, emoji: '🍕' },
  { id: '2', name: 'Double Cheese Burger', price: 189, emoji: '🍔' },
  { id: '3', name: 'Chicken Wrap Combo', price: 159, emoji: '🌯' },
  { id: '4', name: 'Mango Smoothie', price: 99, emoji: '🥭' },
  { id: '5', name: 'Loaded Fries', price: 89, emoji: '🍟' },
  { id: '6', name: 'Cold Coffee', price: 79, emoji: '☕' },
];

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({ click(e) { onMapClick(e.latlng.lng, e.latlng.lat); } });
  return null;
};

const statusIcon = (s) => {
  if (s === 'pending') return <Clock size={12} />;
  if (s === 'assigned') return <Bike size={12} />;
  if (s === 'picked_up') return <Package size={12} />;
  if (s === 'delivered') return <CheckCircle size={12} />;
  return null;
};

const CustomerDashboard = ({ token, socket, onTrackOrder }) => {
  const [orders, setOrders] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLng, setDeliveryLng] = useState(77.6050);
  const [deliveryLat, setDeliveryLat] = useState(12.9780);
  const [loading, setLoading] = useState(false);
  const [loadingMerchants, setLoadingMerchants] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMerchants = async () => {
    try {
      setLoadingMerchants(true);
      const res = await fetch('/api/auth/merchants');
      const data = await res.json();
      if (res.ok && data.length > 0) {
        setMerchants(data);
        setSelectedMerchant(data[0]);
      }
    } catch (err) {
      console.error('Could not fetch merchants:', err);
    } finally {
      setLoadingMerchants(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setOrders(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchMerchants();
    fetchOrders();
    if (socket) {
      socket.on('order_updated', fetchOrders);
      socket.on('order_created', fetchOrders);
    }
    return () => { if (socket) { socket.off('order_updated'); socket.off('order_created'); } };
  }, [socket, token]);

  const changeQty = (id, delta) => {
    setSelectedItems(prev => {
      const q = (prev[id] || 0) + delta;
      if (q <= 0) { const c = { ...prev }; delete c[id]; return c; }
      return { ...prev, [id]: q };
    });
  };

  const getDistance = (lo1, la1, lo2, la2) => {
    const R = 6371, dL = (la2 - la1) * Math.PI / 180, dO = (lo2 - lo1) * Math.PI / 180;
    const a = Math.sin(dL / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dO / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const pickupLng = selectedMerchant?.location?.coordinates?.[0] ?? 77.5946;
  const pickupLat = selectedMerchant?.location?.coordinates?.[1] ?? 12.9716;
  const distKm = getDistance(pickupLng, pickupLat, deliveryLng, deliveryLat);
  const deliveryFare = Math.max(50, Math.round(50 + distKm * 15));
  const subtotal = Object.entries(selectedItems).reduce((s, [id, q]) => s + (HARDCODED_MENU.find(i => i.id === id)?.price ?? 0) * q, 0);
  const total = subtotal > 0 ? subtotal + deliveryFare : 0;

  const handleOrder = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const items = Object.entries(selectedItems).map(([id, q]) => {
      const it = HARDCODED_MENU.find(i => i.id === id);
      return it ? `${it.emoji} ${it.name} x${q}` : '';
    }).filter(Boolean);
    if (!items.length) { setError('Please add at least one item.'); return; }
    if (!deliveryAddress.trim()) { setError('Please enter your delivery address.'); return; }
    if (!selectedMerchant) { setError('Please select a store.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          deliveryAddress,
          pickupLocation: { type: 'Point', coordinates: [pickupLng, pickupLat] },
          deliveryLocation: { type: 'Point', coordinates: [deliveryLng, deliveryLat] },
          items,
          merchantId: selectedMerchant._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to place order');
      setSuccess('Order placed! Your merchant will assign a delivery agent shortly.');
      setSelectedItems({});
      setDeliveryAddress('');
      fetchOrders();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="page-container fade-in">
      <div className="two-col">

        {/* ── LEFT: Order Panel ─────────────────────────────── */}
        <div className="stack">

          {/* Store Selector */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><ShoppingBag size={16} style={{ color: 'var(--primary)' }} /> Order from a Store</span>
            </div>
            <div className="card-body stack">

              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              {/* Merchants */}
              <div>
                <p className="section-heading">🏪 Available Stores</p>
                {loadingMerchants ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem 0' }}>Loading stores...</div>
                ) : merchants.length === 0 ? (
                  <div className="alert alert-info">No merchants registered yet. Ask a merchant to sign up!</div>
                ) : (
                  <div className="stack" style={{ gap: '8px' }}>
                    {merchants.map(m => (
                      <div
                        key={m._id}
                        className={`store-card ${selectedMerchant?._id === m._id ? 'selected' : ''}`}
                        onClick={() => setSelectedMerchant(m)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>🏪 {m.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{m.email}</div>
                          </div>
                          <span className={`status-pill ${m.status === 'online' ? 'online' : 'offline'}`}>
                            {m.status === 'online' ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Menu */}
              {selectedMerchant && (
                <div>
                  <p className="section-heading">🍽️ Menu — {selectedMerchant.name}</p>
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)', padding: '0 0.75rem' }}>
                    {HARDCODED_MENU.map(item => (
                      <div key={item.id} className="menu-item">
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{item.emoji} {item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 2 }}>Rs. {item.price}</div>
                        </div>
                        <div className="qty-control">
                          <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                          <span className="qty-count">{selectedItems[item.id] || 0}</span>
                          <button className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery address */}
              <div>
                <label className="form-label">📍 Delivery Address</label>
                <input
                  type="text"
                  placeholder="Your flat, block, road name..."
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  className="glass-input"
                />
                <div style={{ marginTop: 6, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Also click the map on the right to pin your exact location
                </div>
              </div>

              {/* Fare summary */}
              {subtotal > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.875rem 1rem' }}>
                  <div className="fare-row"><span>Cart Subtotal</span><span>Rs. {subtotal}</span></div>
                  <div className="fare-row"><span>Delivery ({distKm.toFixed(1)} km)</span><span>Rs. {deliveryFare}</span></div>
                  <div className="fare-row total"><span>Total</span><span>Rs. {total}</span></div>
                </div>
              )}

              <button
                onClick={handleOrder}
                disabled={loading || subtotal === 0 || !selectedMerchant}
                className="btn btn-primary btn-full btn-lg"
              >
                <Send size={15} />
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>

            </div>
          </div>
        </div>

        {/* ── RIGHT: Map + Orders ───────────────────────────── */}
        <div className="stack">

          {/* Map */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><MapPin size={16} style={{ color: 'var(--accent-red)' }} /> Set Delivery Location</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click map to drop delivery pin</span>
            </div>
            <div style={{ borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
              <MapContainer center={[pickupLat, pickupLng]} zoom={13} style={{ height: 320, width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapClickHandler onMapClick={(lng, lat) => { setDeliveryLng(lng); setDeliveryLat(lat); }} />
                <Marker position={[pickupLat, pickupLng]} icon={createDivIcon(pickupIconHTML)} />
                <Marker position={[deliveryLat, deliveryLng]} icon={createDivIcon(deliveryIconHTML)} />
              </MapContainer>
            </div>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '1.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
              <span><span style={{ color: '#4f8ef7' }}>●</span> Pickup (store)</span>
              <span><span style={{ color: '#ef4444' }}>●</span> Your delivery pin</span>
              <span style={{ marginLeft: 'auto' }}>Distance: <strong style={{ color: 'var(--text-primary)' }}>{distKm.toFixed(2)} km</strong></span>
            </div>
          </div>

          {/* Orders */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📦 Your Orders</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{orders.length} total</span>
            </div>
            <div className="card-body stack" style={{ maxHeight: 340, overflowY: 'auto' }}>
              {orders.length === 0 ? (
                <div className="empty-state">No orders yet. Place your first order above!</div>
              ) : orders.map(order => (
                <div key={order._id} className="order-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className={`order-status ${order.status}`}>
                        {statusIcon(order.status)} {order.status.replace('_', ' ')}
                      </span>
                      {order.merchant && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>from {order.merchant.name}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {order.items.join(', ')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{order.deliveryAddress}</div>
                    {order.assignedAgent && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Bike size={11} /> Rider: <strong>{order.assignedAgent.name}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Rs. {order.fare}</span>
                    <button onClick={() => onTrackOrder(order._id)} className="btn btn-ghost btn-sm">
                      Track Live →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
