import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { auth } from '../firebase';

export const TrafficTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const data = {
      path: location.pathname,
      userId: auth.currentUser?.uid || 'anonymous',
      userEmail: auth.currentUser?.email || 'anonymous',
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString()
    };

    // Use sendBeacon if available for more reliable logging that doesn't block navigation
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon('/api/log-traffic', blob);
    } else {
      // Fallback to fetch with keepalive
      fetch('/api/log-traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(e => {
        if (import.meta.env.PROD) {
          console.error('Traffic logging failed:', e);
        }
      });
    }
  }, [location.pathname]);

  return null;
};
