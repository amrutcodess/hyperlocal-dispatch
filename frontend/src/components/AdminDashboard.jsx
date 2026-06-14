import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Plus, Check, MapPin, Navigation, User as UserIcon, Send, RefreshCw, Layers } from 'lucide-react';

// Custom SVG Icons helper to avoid leaflet asset import issues in Vite
const createDivIcon = (html, className = '') => {
  return L.divIcon({
    html: html,
    className: `custom-div-icon ${className}`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

const pickupIconHTML = `
  <div style="background-color: #3b82f6; border: 3px solid #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
  </div>
`;

const deliveryIconHTML = `
  <div style="background-color: #ef4444; border: 3px solid #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
  </div>
`;

const agentOnlineIconHTML = (name) => `
  <div style="background-color: #10b981; border: 3px solid #ffffff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(16, 185, 129, 0.7); position: relative;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v4H2c-.6 0-1 .4-1 1v3c0 .6.4 1 1 1h2"></path><circle cx="18.5" cy="17.5" r="2.5"></circle><circle cx="5.5" cy="17.5" r="2.5"></circle></svg>
    <div style="position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); background: #0b0f19; font-size: 8px; border: 1px solid #10b981; padding: 1px 4px; border-radius: 4px; color: #10b981; font-weight: bold; white-space: nowrap;">${name.split(' ')[0]}</div>
  </div>
`;

const agentBusyIconHTML = (name) => `
  <div style="background-color: #f59e0b; border: 3px solid #ffffff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(245, 158, 11, 0.7); position: relative;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v4H2c-.6 0-1 .4-1 1v3c0 .6.4 1 1 1h2"></path><circle cx="18.5" cy="17.5" r="2.5"></circle><circle cx="5.5" cy="17.5" r="2.5"></circle></svg>
    <div style="position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); background: #0b0f19; font-size: 8px; border: 1px solid #f59e0b; padding: 1px 4px; border-radius: 4px; color: #f59e0b; font-weight: bold; white-space: nowrap;">${name.split(' ')[0]}</div>
  </div>
`;

// Map Click Listener to capture coordinates
const MapClickHandler = ({ onMapClick, activeSelect }) => {
  useMapEvents({
    click(e) {
      if (activeSelect) {
        onMapClick(e.latlng.lng, e.latlng.lat);
      }
    },
  });
  return null;
};

const AdminDashboard = ({ token, socket }) => {
  const [orders, setOrders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupLng, setPickupLng] = useState('77.5946');
  const [pickupLat, setPickupLat] = useState('12.9716');
  const [deliveryLng, setDeliveryLng] = useState('77.6096');
  const [deliveryLat, setDeliveryLat] = useState('12.9816');
  const [items, setItems] = useState('');
  const [fare, setFare] = useState('120');

  const [activeSelect, setActiveSelect] = useState(null); // 'pickup' or 'delivery'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOrderLink, setShowOrderLink] = useState(null);

  // Fetch initial orders and agents
  const fetchData = async () => {
    try {
      const ordersRes = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ordersData = await ordersRes.json();
      if (ordersRes.ok) setOrders(ordersData);

      const agentsRes = await fetch('/api/agents/nearby?lng=77.5946&lat=12.9716&radius=50000', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const agentsData = await agentsRes.json();
      if (agentsRes.ok) setAgents(agentsData);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket listeners for real-time dispatch updates
    if (socket) {
      socket.on('order_created', (newOrder) => {
        setOrders((prev) => [newOrder, ...prev]);
      });

      socket.on('order_updated', (updatedOrder) => {
        setOrders((prev) =>
          prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
        );
        // Refresh agents to capture updated busy/online states
        fetchData();
      });

      socket.on('agent_location_updated', (data) => {
        setAgents((prev) =>
          prev.map((a) =>
            a._id === data.agentId
              ? { ...a, location: data.location, status: data.status }
              : a
          )
        );
      });

      socket.on('agent_status_updated', (data) => {
        setAgents((prev) =>
          prev.map((a) =>
            a._id === data.agentId
              ? { ...a, status: data.status, location: data.location }
              : a
          )
        );
      });
    }

    return () => {
      if (socket) {
        socket.off('order_created');
        socket.off('order_updated');
        socket.off('agent_location_updated');
        socket.off('agent_status_updated');
      }
    };
  }, [socket, token]);

  const handleMapClick = (lng, lat) => {
    if (activeSelect === 'pickup') {
      setPickupLng(lng.toFixed(6));
      setPickupLat(lat.toFixed(6));
      setSuccess('Pickup point set from map');
    } else if (activeSelect === 'delivery') {
      setDeliveryLng(lng.toFixed(6));
      setDeliveryLat(lat.toFixed(6));
      setSuccess('Delivery point set from map');
    }
    setActiveSelect(null);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setShowOrderLink(null);
    setLoading(true);

    const orderPayload = {
      customerName,
      deliveryAddress,
      pickupLocation: {
        type: 'Point',
        coordinates: [parseFloat(pickupLng), parseFloat(pickupLat)],
      },
      deliveryLocation: {
        type: 'Point',
        coordinates: [parseFloat(deliveryLng), parseFloat(deliveryLat)],
      },
      items: items.split(',').map((i) => i.trim()).filter((i) => i.length > 0),
      fare: parseFloat(fare),
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create order');
      }

      if (data.status === 'assigned') {
        setSuccess(`Order created & auto-assigned to ${data.assignedAgent.name}!`);
      } else {
        setSuccess('Order created! No online agent found within 5km. Status: Pending.');
      }

      setShowOrderLink(data._id);
      
      // Reset form
      setCustomerName('');
      setDeliveryAddress('');
      setItems('');
      
      // Refresh list
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyTrackingLink = (id) => {
    const trackingUrl = `${window.location.origin}/track/${id}`;
    navigator.clipboard.writeText(trackingUrl);
    alert('Tracking link copied to clipboard:\n' + trackingUrl);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Sidebar: Creation & lists */}
      <div className="flex flex-col gap-6 lg:col-span-1">
        
        {/* Order Dispatch Form */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={20} className="text-blue-500" />
            <h3 className="text-lg font-bold text-white">Dispatch New Delivery</h3>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-lg text-xs mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-2.5 rounded-lg text-xs mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleCreateOrder} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Customer Name</label>
              <input
                type="text"
                required
                placeholder="Customer Full Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="glass-input text-sm py-2 px-3"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Delivery Address</label>
              <input
                type="text"
                required
                placeholder="123 Road, Area Name"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="glass-input text-sm py-2 px-3"
              />
            </div>

            {/* Coordinates Selector */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Pickup Location</span>
                <button
                  type="button"
                  onClick={() => setActiveSelect(activeSelect === 'pickup' ? null : 'pickup')}
                  className={`text-[9px] font-bold uppercase py-1 px-2 rounded-md border transition-all ${
                    activeSelect === 'pickup'
                      ? 'bg-blue-600/35 border-blue-500 text-blue-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {activeSelect === 'pickup' ? 'Click Map...' : 'Select on Map'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="Lng"
                  value={pickupLng}
                  onChange={(e) => setPickupLng(e.target.value)}
                  className="glass-input text-xs py-1.5 px-2 text-center"
                />
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="Lat"
                  value={pickupLat}
                  onChange={(e) => setPickupLat(e.target.value)}
                  className="glass-input text-xs py-1.5 px-2 text-center"
                />
              </div>

              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Delivery Location</span>
                <button
                  type="button"
                  onClick={() => setActiveSelect(activeSelect === 'delivery' ? null : 'delivery')}
                  className={`text-[9px] font-bold uppercase py-1 px-2 rounded-md border transition-all ${
                    activeSelect === 'delivery'
                      ? 'bg-red-600/35 border-red-500 text-red-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {activeSelect === 'delivery' ? 'Click Map...' : 'Select on Map'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="Lng"
                  value={deliveryLng}
                  onChange={(e) => setDeliveryLng(e.target.value)}
                  className="glass-input text-xs py-1.5 px-2 text-center"
                />
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="Lat"
                  value={deliveryLat}
                  onChange={(e) => setDeliveryLat(e.target.value)}
                  className="glass-input text-xs py-1.5 px-2 text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Fare (Rs)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 150"
                  value={fare}
                  onChange={(e) => setFare(e.target.value)}
                  className="glass-input text-sm py-2 px-3 text-center"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Delivery Items</label>
                <input
                  type="text"
                  required
                  placeholder="Pizza, Drink"
                  value={items}
                  onChange={(e) => setItems(e.target.value)}
                  className="glass-input text-sm py-2 px-3"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2 rounded-xl text-sm"
            >
              <Send size={14} />
              <span>{loading ? 'Dispatching...' : 'Assign & Dispatch'}</span>
            </button>
          </form>

          {showOrderLink && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
              <span className="text-[10px] text-gray-300 block mb-1">Customer Tracking Enabled:</span>
              <button
                onClick={() => copyTrackingLink(showOrderLink)}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto focus:outline-none"
              >
                <Layers size={12} />
                Copy Tracking Link
              </button>
            </div>
          )}
        </div>

        {/* Agents List Panel */}
        <div className="glass-panel p-6 flex-1 overflow-y-auto max-h-[350px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserIcon size={18} className="text-emerald-500" />
              <h3 className="text-md font-bold text-white">Delivery Agents ({agents.filter(a => a.status !== 'offline').length})</h3>
            </div>
            <button onClick={fetchData} className="text-gray-400 hover:text-white transition-all">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {agents.map((agent) => (
              <div key={agent._id} className="glass-card flex items-center justify-between py-2 px-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-xs font-bold text-gray-300">
                      {agent.name.charAt(0)}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                      agent.status === 'online' ? 'bg-emerald-500' : agent.status === 'busy' ? 'bg-amber-500' : 'bg-red-500'
                    }`}></span>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-200">{agent.name}</h4>
                    <p className="text-[9px] text-gray-500">[{agent.location.coordinates.map(c => c.toFixed(4)).join(', ')}]</p>
                  </div>
                </div>
                <div>
                  <span className={`status-pill ${agent.status}`}>
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Main Map & Dispatches (2 Cols) */}
      <div className="flex flex-col gap-6 lg:col-span-2">
        
        {/* Dispatcher Map */}
        <div className="glass-panel p-4 flex-1 min-h-[400px] flex flex-col relative">
          <div className="absolute top-6 left-6 z-10 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold pointer-events-none">
            {activeSelect ? `Click Map to Set ${activeSelect === 'pickup' ? 'Pickup' : 'Delivery'} Coordinates` : 'Live Dispatch Center'}
          </div>

          <MapContainer
            center={[12.9716, 77.5946]}
            zoom={13}
            style={{ width: '100%', height: '450px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapClickHandler onMapClick={handleMapClick} activeSelect={activeSelect} />

            {/* Display Active Agents */}
            {agents
              .filter((a) => a.status === 'online' || a.status === 'busy')
              .map((agent) => (
                <Marker
                  key={agent._id}
                  position={[agent.location.coordinates[1], agent.location.coordinates[0]]}
                  icon={createDivIcon(
                    agent.status === 'online' ? agentOnlineIconHTML(agent.name) : agentBusyIconHTML(agent.name)
                  )}
                >
                  <Popup>
                    <div className="p-1">
                      <p className="text-xs font-bold text-white">{agent.name}</p>
                      <p className="text-[10px] text-gray-400 capitalize">Status: {agent.status}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Display Pickup/Delivery markers for selected order or active orders */}
            {orders
              .filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
              .map((order) => (
                <React.Fragment key={order._id}>
                  {/* Pickup Marker */}
                  <Marker
                    position={[order.pickupLocation.coordinates[1], order.pickupLocation.coordinates[0]]}
                    icon={createDivIcon(pickupIconHTML)}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="text-xs font-bold text-white">Pickup: {order.customerName}</p>
                        <p className="text-[10px] text-gray-400">Items: {order.items.join(', ')}</p>
                        <p className="text-[10px] text-blue-400 uppercase font-semibold mt-1">Status: {order.status}</p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Delivery Marker */}
                  <Marker
                    position={[order.deliveryLocation.coordinates[1], order.deliveryLocation.coordinates[0]]}
                    icon={createDivIcon(deliveryIconHTML)}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="text-xs font-bold text-white">Delivery Address</p>
                        <p className="text-[10px] text-gray-400">{order.deliveryAddress}</p>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
          </MapContainer>
        </div>

        {/* Active Dispatches List */}
        <div className="glass-panel p-6 max-h-[300px] overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <Navigation size={18} className="text-blue-500" />
            <h3 className="text-md font-bold text-white">Active Dispatches</h3>
          </div>

          <div className="flex flex-col gap-3">
            {orders.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">No active dispatches found.</div>
            ) : (
              orders.map((order) => (
                <div key={order._id} className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-200">{order.customerName}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                        order.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                        order.status === 'assigned' ? 'bg-violet-500/20 text-violet-400' :
                        order.status === 'picked_up' ? 'bg-pink-500/20 text-pink-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      <strong className="text-gray-500">Address:</strong> {order.deliveryAddress}
                    </p>
                    <p className="text-xs text-gray-400">
                      <strong className="text-gray-500">Items:</strong> {order.items.join(', ')}
                    </p>
                    {order.assignedAgent && (
                      <p className="text-[11px] text-indigo-400 mt-1 flex items-center gap-1">
                        <UserIcon size={10} />
                        Assigned Courier: <strong>{order.assignedAgent.name}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center md:flex-col justify-between md:items-end gap-2 border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
                    <span className="text-sm font-bold text-white">Rs. {order.fare}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyTrackingLink(order._id)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider focus:outline-none"
                      >
                        Copy Track Link
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
      
    </div>
  );
};

export default AdminDashboard;
