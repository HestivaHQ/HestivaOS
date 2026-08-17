'use client';
import { useEffect } from 'react';
export function TechnicianServiceWorker() { useEffect(() => { if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/technician-sw.js', { scope: '/technician' }); }, []); return null; }
