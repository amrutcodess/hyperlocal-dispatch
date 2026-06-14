import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ShoppingBag, MapPin, Send, Compass, Info, Navigation } from 'lucide-react';

const createDivIcon = (html, className = '') => {
  return L.divIcon({
    html: html,
    className: `custom-div-icon ${className}`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

const pickupIconHTML = `
  <div style="background-color: #3b82f6; border: 3.5px solid #ffffff; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);"></div>
`;

const deliveryIconHTML = `
  <div style="background-color: #ef4444; border: 3.5px solid #ffffff; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);"></div>
`;

// Merchant Station coordinates
const MERCHANTS = [
  { id: '1', name: 'Downtown Pizza Station', lng: 77.5946, lat: 12.9716 },
  { id: '2', name: 'West End Burger Grill', lng: 77.5750, lat: 12.9800 },
  { id: '3', name: 'East Side Smoothie Bar', lng: 77.6200, lat: 12.9600 },
];

const ITEMS = [
  { id: '1', name: 'Pepperoni Feast Pizza', price: 299 },
  { id: '2', name: 'Double Cheese Beef Burger', price: 180 },
  { id: '3', name: 'Spicy Chicken Wrap Combo', price: 150 },
  { id: '4', name: 'Organic Mango Smoothie', price: 90 },
];

// Click listener to set delivery coordinates on the map
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lng, e.latlng.lat);
    },
  });
  return null;
};

const CustomerDashboard = ({ token, socket, onTrackOrder }) => {
  const [orders, setOrders] = useState([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState('1');
  const [selectedItems, setSelectedItems] = useState({}); // { itemId: quantity }
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  const [deliveryLng, setDeliveryLng] = useState(77.6050); // Initial delivery coordinates
  const [deliveryLat, setDeliveryLat] = useState(12.9780);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Find currently selected merchant coordinates
  const selectedMerchant = MERCHANTS.find(m => m.id === selectedMerchantId) || MERCHANTS[0];

  const fetchCustomerOrders = async () => {
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(data);
      }
    } catch (err) {
      console.error('Error fetching customer orders:', err);
    }
  };

  useEffect(() => {
    fetchCustomerOrders();

    if (socket) {
      // Listen for updates on the customer's orders
      socket.on('order_updated', () => {
        fetchCustomerOrders();
      });
    }

    return () => {
      if (socket) socket.off('order_updated');
    };
  }, [socket, token]);

  const handleItemQuantityChange = (itemId, change) => {
    setSelectedItems(prev => {
      const qty = (prev[itemId] || 0) + change;
      if (qty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: qty };
    });
  };

  // Distance calculation
  const getDistance = (lon1, lat1, lon2, lat2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const distanceKm = getDistance(selectedMerchant.lng, selectedMerchant.lat, deliveryLng, deliveryLat);
  const deliveryFare = Math.max(50, Math.round(50 + distanceKm * 15)); // Rs. 50 base + Rs. 15 per km

  const getSubtotal = () => {
    return Object.entries(selectedItems).reduce((sum, [itemId, qty]) => {
      const item = ITEMS.find(i => i.id === itemId);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Prepare item strings
    const orderItems = Object.entries(selectedItems).map(([itemId, qty]) => {
      const item = ITEMS.find(i => i.id === itemId);
      return item ? `${item.name} x${qty}` : '';
    }).filter(i => i.length > 0);

    if (orderItems.length === 0) {
      setError('Please select at least one item to purchase.');
      return;
    }

    if (!deliveryAddress.trim()) {
      setError('Please enter a delivery destination address.');
      return;
    }

    setLoading(true);

    const payload = {
      customerName: 'Customer User', // Overridden by controller
      deliveryAddress,
      pickupLocation: {
        type: 'Point',
        coordinates: [selectedMerchant.lng, selectedMerchant.lat],
      },
      deliveryLocation: {
        type: 'Point',
        coordinates: [deliveryLng, deliveryLat],
      },
      items: orderItems,
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to place order');

      setSuccess(
        data.status === 'assigned'
          ? `Order placed successfully! Agent ${data.assignedAgent.name} is arriving for pickup.`
          : 'Order placed! Looking for nearby couriers.'
      );

      // Reset fields
      setSelectedItems({});
      setDeliveryAddress('');
      fetchCustomerOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Col 1: Order Placement Cockpit */}
      <div className="flex flex-col gap-6 lg:col-span-1">
        
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag size={20} className="text-blue-500" />
            <h3 className="text-lg font-bold text-white">Order Food & Grocery</h3>
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

          <form onSubmit={handlePlaceOrder} className="flex flex-col gap-4">
            
            {/* Merchant Select */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Select Merchant Hub</label>
              <select
                value={selectedMerchantId}
                onChange={(e) => setSelectedMerchantId(e.target.value)}
                className="glass-select text-sm w-full"
              >
                {MERCHANTS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Menu List */}
            <div className="bg-slate-950/45 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Station Menu</span>
              
              <div className="flex flex-col gap-2">
                {ITEMS.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-b-0">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-200">{item.name}</h4>
                      <p className="text-[10px] text-blue-400">Rs. {item.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleItemQuantityChange(item.id, -1)}
                        className="h-6 w-6 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs flex items-center justify-center border border-white/5"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-gray-300 w-4 text-center">{selectedItems[item.id] || 0}</span>
                      <button
                        type="button"
                        onClick={() => handleItemQuantityChange(item.id, 1)}
                        className="h-6 w-6 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs flex items-center justify-center border border-white/5"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery address */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Delivery Street Address</label>
              <input
                type="text"
                required
                placeholder="Apt, Block, Road Name"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="glass-input text-sm py-2 px-3"
              />
            </div>

            {/* Selected Coordinates notification */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 text-xs text-gray-400 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-gray-500 font-bold uppercase">Delivery Coordinates</span>
                <span className="text-[9px] text-blue-400 font-semibold animate-pulse">Click Map to Change</span>
              </div>
              <p className="font-mono text-[11px] text-gray-300">
                Lng: {deliveryLng.toFixed(4)} | Lat: {deliveryLat.toFixed(4)}
              </p>
              <div className="border-t border-white/5 mt-1 pt-1.5 flex justify-between text-xs text-gray-300">
                <span>Distance:</span>
                <span className="font-semibold text-white">{distanceKm.toFixed(2)} km</span>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="border-t border-white/5 pt-3 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Cart Subtotal:</span>
                <span>Rs. {getSubtotal()}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Geospatial Delivery:</span>
                <span>Rs. {deliveryFare}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white border-t border-white/5 pt-1.5">
                <span>Total Amount:</span>
                <span className="text-blue-400">Rs. {getSubtotal() + (getSubtotal() > 0 ? deliveryFare : 0)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || getSubtotal() === 0}
              className="btn-primary w-full py-2.5 rounded-xl text-sm"
            >
              <Send size={14} />
              <span>{loading ? 'Processing...' : 'Place Order'}</span>
            </button>
          </form>
        </div>

      </div>

      {/* Col 2 & 3: Map Selector & Orders feed */}
      <div className="flex flex-col gap-6 lg:col-span-2">
        
        {/* Map panel */}
        <div className="glass-panel p-4 min-h-[300px] flex flex-col relative">
          <div className="absolute top-6 left-6 z-10 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold pointer-events-none flex items-center gap-1.5">
            <MapPin size={12} className="text-red-500" />
            Set Delivery Location on Map
          </div>

          <MapContainer
            center={[12.9716, 77.5946]}
            zoom={13}
            style={{ width: '100%', height: '350px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapClickHandler onMapClick={(lng, lat) => {
              setDeliveryLng(lng);
              setDeliveryLat(lat);
            }} />

            {/* Selected Merchant Point */}
            <Marker
              position={[selectedMerchant.lat, selectedMerchant.lng]}
              icon={createDivIcon(pickupIconHTML)}
            />

            {/* Selected Delivery Destination */}
            <Marker
              position={[deliveryLat, deliveryLng]}
              icon={createDivIcon(deliveryIconHTML)}
            />

          </MapContainer>
        </div>

        {/* Order History */}
        <div className="glass-panel p-6 flex-1 overflow-y-auto max-h-[320px]">
          <div className="flex items-center gap-2 mb-4">
            <Navigation size={18} className="text-blue-500" />
            <h3 className="text-md font-bold text-white">Your Orders</h3>
          </div>

          <div className="flex flex-col gap-3">
            {orders.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">You haven't placed any orders yet.</div>
            ) : (
              orders.map((order) => (
                <div key={order._id} className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs text-gray-400 font-mono text-blue-400">ID: {order._id.substring(0, 8)}...</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                        order.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                        order.status === 'assigned' ? 'bg-violet-500/20 text-violet-400' :
                        order.status === 'picked_up' ? 'bg-pink-500/20 text-pink-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-200 font-semibold mt-1">
                      {order.items.join(', ')}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Destination: {order.deliveryAddress}
                    </p>
                    {order.assignedAgent && (
                      <div className="text-[10px] text-indigo-400 mt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        Courier: <strong>{order.assignedAgent.name}</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center md:flex-col justify-between md:items-end gap-2 border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
                    <span className="text-sm font-bold text-white">Rs. {order.fare}</span>
                    <button
                      onClick={() => onTrackOrder(order._id)}
                      className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/15 py-1 px-3.5 rounded-lg font-bold uppercase tracking-wider transition-all focus:outline-none"
                    >
                      Track Live
                    </button>
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

export default CustomerDashboard;
