import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, Shield, MapPin, Compass } from 'lucide-react';

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('agent');
  const [coords, setCoords] = useState({ lng: 77.5946, lat: 12.9716 }); // Default Bangalore
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Attempt to fetch agent's location using browser API on load or role select
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setGeoLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lng: parseFloat(position.coords.longitude.toFixed(6)),
          lat: parseFloat(position.coords.latitude.toFixed(6))
        });
        setGeoLoading(false);
      },
      (err) => {
        console.warn(`Geolocation error (${err.code}): ${err.message}`);
        setError('Could not fetch precise location. Using default coordinates.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!isLogin && role === 'agent') {
      fetchCurrentLocation();
    }
  }, [isLogin, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const bodyData = isLogin
      ? { email, password }
      : {
          name,
          email,
          password,
          role,
          location: {
            type: 'Point',
            coordinates: [coords.lng, coords.lat]
          }
        };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      onAuthSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="glass-panel w-full max-w-md p-8 relative overflow-hidden">
        {/* Neon Glow Effects inside the card */}
        <div className="absolute -top-20 -right-20 w-40 height-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-40 height-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3">
            <Compass size={32} className="pulse-anim" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {isLogin ? 'Log in to manage hyper-local deliveries' : 'Sign up as a Merchant or Delivery Agent'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-gray-500"><UserIcon size={18} /></span>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input w-full pl-11"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-gray-500"><Mail size={18} /></span>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input w-full pl-11"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-gray-500"><Lock size={18} /></span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full pl-11"
              />
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Role</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRole('agent')}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                      role === 'agent'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-inner'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <MapPin size={10} />
                    Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                      role === 'admin'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-inner'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <Shield size={10} />
                    Merchant
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                      role === 'customer'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-inner'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <UserIcon size={10} />
                    Customer
                  </button>
                </div>
              </div>

              {role === 'agent' && (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase">Base Station Coordinates</span>
                    <button
                      type="button"
                      onClick={fetchCurrentLocation}
                      disabled={geoLoading}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1 focus:outline-none"
                    >
                      <Compass size={10} className={geoLoading ? 'animate-spin' : ''} />
                      {geoLoading ? 'Fetching...' : 'Get GPS'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block mb-1">Longitude</span>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={coords.lng}
                        onChange={(e) => setCoords({ ...coords, lng: parseFloat(e.target.value) })}
                        className="glass-input w-full py-1.5 px-2.5 text-xs text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block mb-1">Latitude</span>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={coords.lat}
                        onChange={(e) => setCoords({ ...coords, lat: parseFloat(e.target.value) })}
                        className="glass-input w-full py-1.5 px-2.5 text-xs text-center"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 mt-2 rounded-xl text-sm"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-white/5 pt-4">
          <p className="text-xs text-gray-400">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-400 hover:text-blue-300 ml-1.5 font-bold uppercase tracking-wider text-[11px] focus:outline-none"
            >
              {isLogin ? 'Create one' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
