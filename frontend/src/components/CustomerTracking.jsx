import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin, Compass, AlertCircle } from 'lucide-react';

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

const courierIconHTML = `
  <div style="background-color: #10b981; border: 3px solid #ffffff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(16, 185, 129, 0.8);">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v4H2c-.6 0-1 .4-1 1v3c0 .6.4 1 1 1h2"></path><circle cx="18.5" cy="17.5" r="2.5"></circle><circle cx="5.5" cy="17.5" r="2.5"></circle></svg>
  </div>
`;

const CustomerTracking = ({ orderId, socket }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch current order state
  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not load order details');
      setOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Setup Socket connection & join room for specific tracking
    if (socket && orderId) {
      socket.emit('join_order_tracking', orderId);

      socket.on(`order_updated_${orderId}`, (updatedOrder) => {
        setOrder(updatedOrder);
      });
    }

    // Fallback polling for stateless Vercel Serverless environment
    const pollInterval = setInterval(() => {
      // Fetch order details every 5 seconds to get updated agent location
      fetchOrder();
    }, 5000);

    return () => {
      if (socket) {
        socket.off(`order_updated_${orderId}`);
      }
      clearInterval(pollInterval);
    };
  }, [orderId, socket]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Compass className="animate-spin text-blue-500" size={32} />
          <span className="text-sm font-semibold text-gray-300">Loading live tracking details...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 glass-panel text-center">
        <AlertCircle size={36} className="text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Tracking Unavailable</h3>
        <p className="text-xs text-gray-400 mb-4">{error || 'Order could not be located.'}</p>
        <button
          onClick={fetchOrder}
          className="btn-secondary py-1.5 px-4 text-xs font-semibold rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  const getStatusStep = () => {
    switch (order.status) {
      case 'pending': return 1;
      case 'assigned': return 2;
      case 'picked_up': return 3;
      case 'delivered': return 4;
      default: return 0;
    }
  };

  const currentStep = getStatusStep();

  return (
    <div className="dashboard-grid">
      
      {/* Shipment details */}
      <div className="flex flex-col gap-6">
        
        {/* Status tracker card */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div>
              <span className="text-[9px] text-gray-500 uppercase block font-semibold">Tracking Number</span>
              <span className="text-xs font-bold text-blue-400 select-all font-mono">{order._id}</span>
            </div>
            <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
              order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
              order.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
              order.status === 'assigned' ? 'bg-violet-500/20 text-violet-400' : 'bg-pink-500/20 text-pink-400'
            }`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>

          {/* Progress tracker timeline */}
          <div className="flex flex-col gap-5 my-6 relative pl-6 border-l border-white/10 ml-2">
            
            {/* Step 1 */}
            <div className="relative">
              <span className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${
                currentStep >= 1 ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-900 border-white/10'
              }`}>
                {currentStep >= 1 && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
              </span>
              <h4 className={`text-xs font-semibold ${currentStep >= 1 ? 'text-gray-200' : 'text-gray-500'}`}>Order Registered</h4>
              <p className="text-[10px] text-gray-500">Merchant generated task coordinates.</p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <span className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${
                currentStep >= 2 ? 'bg-violet-500 border-violet-500 text-white' : 'bg-slate-900 border-white/10'
              }`}>
                {currentStep >= 2 && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
              </span>
              <h4 className={`text-xs font-semibold ${currentStep >= 2 ? 'text-gray-200' : 'text-gray-500'}`}>Courier Assigned</h4>
              <p className="text-[10px] text-gray-500">
                {order.assignedAgent ? `Rider ${order.assignedAgent.name} is on the way.` : 'Locating closest available rider.'}
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <span className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${
                currentStep >= 3 ? 'bg-pink-500 border-pink-500 text-white' : 'bg-slate-900 border-white/10'
              }`}>
                {currentStep >= 3 && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
              </span>
              <h4 className={`text-xs font-semibold ${currentStep >= 3 ? 'text-gray-200' : 'text-gray-500'}`}>In Transit</h4>
              <p className="text-[10px] text-gray-500">Courier has collected cargo. Heading to location.</p>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <span className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${
                currentStep >= 4 ? 'bg-green-500 border-green-500 text-white' : 'bg-slate-900 border-white/10'
              }`}>
                {currentStep >= 4 && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
              </span>
              <h4 className={`text-xs font-semibold ${currentStep >= 4 ? 'text-gray-200' : 'text-gray-500'}`}>Package Delivered</h4>
              <p className="text-[10px] text-gray-500">Completed successfully. Safe and sound.</p>
            </div>

          </div>
        </div>

        {/* Order Details */}
        <div className="glass-panel p-6 text-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase block mb-3">Order Cargo</span>
          
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-[10px] text-gray-500 block uppercase">Recipient Name</span>
              <span className="text-xs font-semibold text-gray-200">{order.customerName}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase">Drop-off Destination</span>
              <span className="text-xs text-gray-300">{order.deliveryAddress}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block uppercase">Items Packaged</span>
              <span className="text-xs text-indigo-300 font-semibold">{order.items.join(', ')}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Live Map Tracking Panel */}
      <div className="glass-panel p-4 min-h-[400px] flex flex-col relative">
        <div className="absolute top-6 left-6 z-10 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold pointer-events-none flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-anim"></span>
          Live Tracking Map
        </div>

        <MapContainer
          center={[order.pickupLocation.coordinates[1], order.pickupLocation.coordinates[0]]}
          zoom={13}
          style={{ width: '100%', height: '450px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Pickup Pin */}
          <Marker
            position={[order.pickupLocation.coordinates[1], order.pickupLocation.coordinates[0]]}
            icon={createDivIcon(pickupIconHTML)}
          >
            <Popup>
              <p className="text-xs font-bold text-white">Pickup Point</p>
            </Popup>
          </Marker>

          {/* Delivery Pin */}
          <Marker
            position={[order.deliveryLocation.coordinates[1], order.deliveryLocation.coordinates[0]]}
            icon={createDivIcon(deliveryIconHTML)}
          >
            <Popup>
              <p className="text-xs font-bold text-white">Delivery Point</p>
            </Popup>
          </Marker>

          {/* Draw Polyline path */}
          <Polyline
            positions={[
              [order.pickupLocation.coordinates[1], order.pickupLocation.coordinates[0]],
              [order.deliveryLocation.coordinates[1], order.deliveryLocation.coordinates[0]],
            ]}
            color="#8b5cf6"
            dashArray="5, 8"
            weight={3}
          />

          {/* Courier Position Marker (if assigned) */}
          {order.assignedAgent && (
            <Marker
              position={[
                order.assignedAgent.location.coordinates[1],
                order.assignedAgent.location.coordinates[0],
              ]}
              icon={createDivIcon(courierIconHTML)}
            >
              <Popup>
                <div className="p-1">
                  <p className="text-xs font-bold text-white">{order.assignedAgent.name}</p>
                  <p className="text-[10px] text-gray-400 capitalize">Delivery Courier</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

    </div>
  );
};

export default CustomerTracking;
