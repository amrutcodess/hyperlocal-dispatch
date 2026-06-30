import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import AgentDashboard from './components/AgentDashboard';
import CustomerTracking from './components/CustomerTracking';
import CustomerDashboard from './components/CustomerDashboard';
import { Shield, Compass } from 'lucide-react';

const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';

const App = () => {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Check URL pathname for public customer tracking routing e.g. /track/:id
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/track/')) {
      const orderId = path.split('/track/')[1];
      if (orderId && orderId.length > 5) {
        setTrackingOrderId(orderId);
      }
    }
  }, []);

  // Retrieve user session from local storage on load
  useEffect(() => {
    const storedUser = localStorage.getItem('dispatcherUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    // Connect to sockets either if user is logged in or if tracking is active
    if (user || trackingOrderId) {
      const socketClient = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketClient.on('connect', () => {
        console.log('Connected to Dispatch Socket:', socketClient.id);
        setSocketConnected(true);
      });

      socketClient.on('disconnect', () => {
        console.log('Disconnected from Dispatch Socket');
        setSocketConnected(false);
      });

      setSocket(socketClient);

      return () => {
        socketClient.disconnect();
      };
    }
  }, [user, trackingOrderId]);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('dispatcherUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    // If agent, set offline on logout
    if (user && user.role === 'agent') {
      fetch('/api/agents/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status: 'offline' }),
      }).catch(err => console.warn('Could not mark offline on logout:', err));
    }
    
    setUser(null);
    localStorage.removeItem('dispatcherUser');
    if (socket) {
      socket.disconnect();
    }
  };

  // Agent status toggling
  const handleToggleStatus = async (newStatus) => {
    if (!user || user.role !== 'agent') return;
    try {
      const res = await fetch('/api/agents/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      
      if (res.ok) {
        const updatedUser = { ...user, status: data.status };
        setUser(updatedUser);
        localStorage.setItem('dispatcherUser', JSON.stringify(updatedUser));
      } else {
        alert(data.message || 'Failed to update availability status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sync user status changes if updated in dashboard (e.g. from accepting an order -> busy)
  const handleStatusChangeFromDashboard = (updatedUserObj) => {
    setUser(updatedUserObj);
    localStorage.setItem('dispatcherUser', JSON.stringify(updatedUserObj));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onToggleStatus={handleToggleStatus}
      />
      
      <main style={{ flex: 1 }}>
        {trackingOrderId ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                <Shield size={18} className="text-blue-500" />
                Live Courier Shipment Tracker
              </h2>
              <button
                onClick={() => {
                  window.history.pushState({}, '', '/');
                  setTrackingOrderId(null);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider focus:outline-none"
              >
                Back to Dashboard
              </button>
            </div>
            <CustomerTracking orderId={trackingOrderId} socket={socket} />
          </div>
        ) : !user ? (
          <Auth onAuthSuccess={handleAuthSuccess} />
        ) : (
          <div className="flex flex-col gap-4">
            {user.role === 'admin' && (
              <AdminDashboard token={user.token} socket={socket} />
            )}
            {user.role === 'agent' && (
              <AgentDashboard
                token={user.token}
                socket={socket}
                user={user}
                onStatusChange={handleStatusChangeFromDashboard}
              />
            )}
            {user.role === 'customer' && (
              <CustomerDashboard
                token={user.token}
                socket={socket}
                onTrackOrder={(id) => {
                  window.history.pushState({}, '', `/track/${id}`);
                  setTrackingOrderId(id);
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Socket connection indicator */}
      {(user || trackingOrderId) && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 pointer-events-none">
          <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
          <span className="text-gray-300 uppercase tracking-wide">
            {socketConnected ? 'Sockets Connected' : 'REST Fallback Mode'}
          </span>
        </div>
      )}
    </div>
  );
};

export default App;
