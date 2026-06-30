import React from 'react';
import { LogOut, MapPin, Zap } from 'lucide-react';

const Navbar = ({ user, onLogout, onToggleStatus }) => {
  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand">
        <div className="navbar-logo">
          <Zap size={18} color="#fff" />
        </div>
        <div>
          <div className="navbar-title">HyperLocal Dispatcher</div>
          <div className="navbar-subtitle">Proximity Delivery Network</div>
        </div>
      </div>

      {/* Right side */}
      {user && (
        <div className="navbar-right">
          {/* Agent status toggle */}
          {user.role === 'agent' && (
            <select
              value={user.status}
              disabled={user.status === 'busy'}
              onChange={(e) => onToggleStatus(e.target.value)}
              className="glass-select"
              style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
            >
              <option value="online">🟢 Online</option>
              <option value="offline">⚫ Offline</option>
              {user.status === 'busy' && <option value="busy">🟡 On Delivery</option>}
            </select>
          )}

          {/* User chip */}
          <div className="user-chip">
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {user.name}
              </div>
              <span className={`role-badge ${user.role}`}>{user.role}</span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="btn btn-ghost btn-sm"
            title="Logout"
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
