import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle2, Navigation, Compass, Play, Square, MapPin } from 'lucide-react';

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

const riderIconHTML = `
  <div style="background-color: #10b981; border: 3px solid #ffffff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(16, 185, 129, 0.8);">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v4H2c-.6 0-1 .4-1 1v3c0 .6.4 1 1 1h2"></path><circle cx="18.5" cy="17.5" r="2.5"></circle><circle cx="5.5" cy="17.5" r="2.5"></circle></svg>
  </div>
`;

const AgentDashboard = ({ token, socket, user, onStatusChange }) => {
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationTarget, setSimulationTarget] = useState(null); // 'pickup' or 'delivery'
  const simulationIntervalRef = useRef(null);

  // Current local coordinates of the agent
  const [riderCoords, setRiderCoords] = useState({
    lng: user.location.coordinates[0],
    lat: user.location.coordinates[1],
  });

  // Fetch active order for this agent
  const fetchActiveAssignment = async () => {
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        // Find order that is not delivered or cancelled
        const current = data.find((o) => o.status !== 'delivered' && o.status !== 'cancelled');
        setActiveOrder(current || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchActiveAssignment();

    // Listen for new assignments
    if (socket) {
      socket.on(`agent_assigned_${user._id}`, (order) => {
        setActiveOrder(order);
        setSuccess('New Delivery Assigned! Click to accept and drive.');
        onStatusChange({ ...user, status: 'busy' });
      });

      socket.on('order_updated', (order) => {
        // If order was cancelled or updated elsewhere, update local state
        if (order.assignedAgent?._id === user._id) {
          if (order.status === 'delivered' || order.status === 'cancelled') {
            setActiveOrder(null);
            onStatusChange({ ...user, status: 'online' });
          } else {
            setActiveOrder(order);
          }
        }
      });
    }

    return () => {
      if (socket) {
        socket.off(`agent_assigned_${user._id}`);
        socket.off('order_updated');
      }
      stopSimulation();
    };
  }, [socket, user._id, token]);

  const updateStatus = async (newStatus) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${activeOrder._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update order status');

      setActiveOrder(data);
      setSuccess(`Order marked as ${newStatus.replace('_', ' ')}!`);

      if (newStatus === 'delivered') {
        setActiveOrder(null);
        // Update user status globally
        onStatusChange({ ...user, status: 'online' });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update backend with simulator location
  const uploadLocation = async (lng, lat) => {
    try {
      await fetch('/api/agents/location', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ longitude: lng, latitude: lat }),
      });
    } catch (err) {
      console.error('Failed to update agent location on server:', err);
    }
  };

  // Run the driving emulator
  const startSimulation = (target) => {
    if (!activeOrder) return;
    setIsSimulating(true);
    setSimulationTarget(target);
    setError('');

    const destCoords =
      target === 'pickup'
        ? activeOrder.pickupLocation.coordinates
        : activeOrder.deliveryLocation.coordinates;

    const destLng = destCoords[0];
    const destLat = destCoords[1];

    const steps = 25; // 25 intervals to reach destination
    let currentStep = 0;
    const startLng = riderCoords.lng;
    const startLat = riderCoords.lat;

    simulationIntervalRef.current = setInterval(() => {
      currentStep++;
      const ratio = currentStep / steps;
      const nextLng = startLng + (destLng - startLng) * ratio;
      const nextLat = startLat + (destLat - startLat) * ratio;

      setRiderCoords({ lng: nextLng, lat: nextLat });
      uploadLocation(nextLng, nextLat);

      if (currentStep >= steps) {
        stopSimulation();
        setSuccess(`Reached ${target === 'pickup' ? 'pickup base' : 'delivery point'}!`);
      }
    }, 800); // Update coordinates every 800ms
  };

  const stopSimulation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    setIsSimulating(false);
    setSimulationTarget(null);
  };

  return (
    <div className="dashboard-grid">
      
      {/* Cockpit controls */}
      <div className="flex flex-col gap-6">
        
        {/* Availability Switch */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-3">
            <Compass size={20} className="text-emerald-500" />
            <h3 className="text-lg font-bold text-white">Rider Cockpit</h3>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-950/45 rounded-xl border border-white/5">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Current Status</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`status-dot ${user.status}`}></span>
                  <span className="text-sm font-semibold capitalize text-gray-200">{user.status}</span>
                </div>
              </div>

              {user.status !== 'busy' ? (
                <button
                  onClick={() => onStatusChange(user.status === 'online' ? 'offline' : 'online')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                    user.status === 'online'
                      ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {user.status === 'online' ? 'Go Offline' : 'Go Online'}
                </button>
              ) : (
                <span className="text-[10px] text-amber-400 font-bold uppercase bg-amber-500/15 border border-amber-500/20 py-1.5 px-3 rounded-lg">
                  Busy (On Trip)
                </span>
              )}
            </div>

            {user.status === 'offline' && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 text-center">
                You are currently offline. You will not receive any hyper-local delivery orders until you go online.
              </div>
            )}
          </div>
        </div>

        {/* Active Assignment Card */}
        {activeOrder && (
          <div className="glass-panel p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Active Job
              </span>
              <span className="text-xs text-gray-400 font-semibold uppercase">Rs. {activeOrder.fare}</span>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded-lg text-xs mb-3">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-2 rounded-lg text-xs mb-3">
                {success}
              </div>
            )}

            <div className="flex flex-col gap-3.5 mb-5 text-sm">
              <div>
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Customer</span>
                <p className="font-semibold text-gray-200 mt-0.5">{activeOrder.customerName}</p>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Address</span>
                <p className="text-gray-300 text-xs mt-0.5">{activeOrder.deliveryAddress}</p>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Items</span>
                <p className="text-xs text-indigo-300 mt-0.5">{activeOrder.items.join(', ')}</p>
              </div>
            </div>

            {/* State actions */}
            <div className="flex flex-col gap-2.5">
              {activeOrder.status === 'assigned' && (
                <button
                  disabled={loading || isSimulating}
                  onClick={() => updateStatus('picked_up')}
                  className="btn-primary w-full py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  Accept & Mark Picked Up
                </button>
              )}

              {activeOrder.status === 'picked_up' && (
                <button
                  disabled={loading || isSimulating}
                  onClick={() => updateStatus('delivered')}
                  className="btn-primary w-full py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600"
                >
                  <CheckCircle2 size={14} />
                  Mark Delivered (Complete Job)
                </button>
              )}
            </div>

            {/* Driving Simulator tool */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 mt-5">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-3">GPS Route Emulator</span>
              
              {isSimulating ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold uppercase animate-pulse">
                    <Navigation size={12} className="animate-spin" />
                    Driving to {simulationTarget}...
                  </div>
                  <button
                    onClick={stopSimulation}
                    className="btn-secondary py-1.5 px-3 text-[10px] rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 mt-1"
                  >
                    <Square size={10} />
                    Cancel Simulation
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={activeOrder.status !== 'assigned'}
                    onClick={() => startSimulation('pickup')}
                    className="btn-secondary py-2 px-3 text-[10px] uppercase font-bold tracking-wider rounded-lg flex items-center justify-center gap-1"
                  >
                    <Play size={10} />
                    Drive to Pickup
                  </button>
                  <button
                    disabled={activeOrder.status !== 'picked_up'}
                    onClick={() => startSimulation('delivery')}
                    className="btn-secondary py-2 px-3 text-[10px] uppercase font-bold tracking-wider rounded-lg flex items-center justify-center gap-1"
                  >
                    <Play size={10} />
                    Drive to Deliver
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!activeOrder && user.status === 'online' && (
          <div className="glass-panel p-6 text-center border-l-4 border-l-emerald-500">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 pulse-anim mb-2"></span>
            <p className="text-sm font-semibold text-gray-200">Waiting for delivery jobs...</p>
            <p className="text-xs text-gray-400 mt-1">Keep status online. New local dispatches will auto-assign here.</p>
          </div>
        )}

      </div>

      {/* Simulator map */}
      <div className="glass-panel p-4 min-h-[400px] flex flex-col relative">
        <div className="absolute top-6 left-6 z-10 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold pointer-events-none">
          Courier Navigation Console
        </div>

        <MapContainer
          center={[riderCoords.lat, riderCoords.lng]}
          zoom={14}
          style={{ width: '100%', height: '450px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Rider Marker */}
          <Marker
            position={[riderCoords.lat, riderCoords.lng]}
            icon={createDivIcon(riderIconHTML)}
          >
            <Popup>
              <div className="p-1">
                <p className="text-xs font-bold text-white">Your Position</p>
                <p className="text-[10px] text-gray-400 capitalize">Status: {user.status}</p>
              </div>
            </Popup>
          </Marker>

          {/* If there is an active order, show pickup, delivery markers and path */}
          {activeOrder && (
            <>
              {/* Pickup Point */}
              <Marker
                position={[activeOrder.pickupLocation.coordinates[1], activeOrder.pickupLocation.coordinates[0]]}
                icon={createDivIcon(pickupIconHTML)}
              >
                <Popup>
                  <p className="text-xs font-bold text-white">Pickup Location</p>
                </Popup>
              </Marker>

              {/* Delivery Point */}
              <Marker
                position={[activeOrder.deliveryLocation.coordinates[1], activeOrder.deliveryLocation.coordinates[0]]}
                icon={createDivIcon(deliveryIconHTML)}
              >
                <Popup>
                  <p className="text-xs font-bold text-white">Delivery Point: {activeOrder.customerName}</p>
                </Popup>
              </Marker>

              {/* Draw Route Line */}
              <Polyline
                positions={[
                  [activeOrder.pickupLocation.coordinates[1], activeOrder.pickupLocation.coordinates[0]],
                  [activeOrder.deliveryLocation.coordinates[1], activeOrder.deliveryLocation.coordinates[0]],
                ]}
                color="#8b5cf6"
                dashArray="5, 8"
                weight={3}
              />
              
              {/* Draw Rider path line */}
              <Polyline
                positions={[
                  [riderCoords.lat, riderCoords.lng],
                  [activeOrder.pickupLocation.coordinates[1], activeOrder.pickupLocation.coordinates[0]],
                ]}
                color="#10b981"
                dashArray="2, 5"
                weight={2}
              />
            </>
          )}
        </MapContainer>
      </div>

    </div>
  );
};

export default AgentDashboard;
