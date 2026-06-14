import React from 'react';
import { LogOut, User, MapPin, Activity, Shield } from 'lucide-react';

const Navbar = ({ user, onLogout, onToggleStatus }) => {
  return (
    <nav className="glass-panel mb-6 px-6 py-4 flex items-center justify-between" style={{ borderRadius: '0px 0px 16px 16px', borderTop: 'none' }}>
      <div className="flex items-center gap-3">
        <div className="bg-blue-600/20 p-2 rounded-lg text-blue-500">
          <MapPin size={24} className="pulse-anim" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
            HyperLocal Dispatcher
          </h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Proximity Delivery Network</p>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-200">{user.name}</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  {user.role}
                </span>
                
                {user.role === 'agent' && (
                  <span className={`status-pill ${user.status}`}>
                    {user.status}
                  </span>
                )}
              </div>
            </div>

            <div className="h-8 w-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold uppercase">
              {user.name.charAt(0)}
            </div>
          </div>

          {user.role === 'agent' && (
            <div className="flex items-center gap-2">
              <select
                value={user.status}
                disabled={user.status === 'busy'}
                onChange={(e) => onToggleStatus(e.target.value)}
                className="glass-select py-1.5 px-3 text-xs bg-slate-900 border border-white/10 text-white rounded-lg focus:outline-none"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                {user.status === 'busy' && <option value="busy">Busy (On Duty)</option>}
              </select>
            </div>
          )}

          <button
            onClick={onLogout}
            className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 rounded-xl border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-200"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
