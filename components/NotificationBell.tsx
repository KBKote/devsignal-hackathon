'use client'

import { useState, useEffect } from 'react'

export function NotificationBell() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  async function subscribe() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    setLoading(true)

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') return

      const registration = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidKey) {
        console.warn('VAPID public key not configured')
        return
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })

      // Save subscription to DB via API
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
    } catch (err) {
      console.error('Failed to subscribe to notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    if (!('serviceWorker' in navigator)) return
    setLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
      setPermission('default')
    } catch (err) {
      console.error('Failed to unsubscribe:', err)
    } finally {
      setLoading(false)
    }
  }

  const isGranted = permission === 'granted'

  return (
    <button
      onClick={isGranted ? unsubscribe : subscribe}
      disabled={loading || permission === 'denied'}
      title={
        permission === 'denied'
          ? 'Notifications blocked — check browser settings'
          : isGranted
          ? 'Disable push notifications'
          : 'Enable push notifications for score 9+ opportunities'
      }
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
        isGranted
          ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
          : permission === 'denied'
          ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
      }`}
    >
      <span>{isGranted ? '🔔' : '🔕'}</span>
      <span className="hidden sm:inline">
        {loading ? 'Loading…' : isGranted ? 'Alerts on' : 'Alerts off'}
      </span>
    </button>
  )
}
