import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push/subscribe'

export interface NotifPrefs {
  push_enabled: boolean
  email_enabled: boolean
  notify_match: boolean
  notify_message: boolean
  notify_like: boolean
  notify_promo: boolean
}

const DEFAULTS: NotifPrefs = {
  push_enabled: true,
  email_enabled: true,
  notify_match: true,
  notify_message: true,
  notify_like: true,
  notify_promo: true,
}

export function usePushNotifications() {
  const [supported] = useState(isPushSupported())
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [subscribed, setSubscribed] = useState(false)
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      if (supported && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration('/')
        const sub = reg ? await reg.pushManager.getSubscription() : null
        setSubscribed(!!sub)
        setPermission(Notification.permission)
      }
      const { data: u } = await supabase.auth.getUser()
      if (u.user) {
        const { data } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', u.user.id)
          .maybeSingle()
        if (data) {
          setPrefs({
            push_enabled: data.push_enabled,
            email_enabled: data.email_enabled,
            notify_match: data.notify_match,
            notify_message: data.notify_message,
            notify_like: data.notify_like,
            notify_promo: data.notify_promo,
          })
        }
      }
    } finally {
      setLoading(false)
    }
  }, [supported])

  useEffect(() => {
    refresh()
  }, [refresh])

  const enable = useCallback(async () => {
    setBusy(true)
    try {
      const res = await subscribeToPush()
      if (res.ok) {
        setSubscribed(true)
        setPermission('granted')
        // ensure push_enabled true
        const { data: u } = await supabase.auth.getUser()
        if (u.user) {
          await supabase
            .from('notification_preferences')
            .upsert({ user_id: u.user.id, push_enabled: true }, { onConflict: 'user_id' })
          setPrefs((p) => ({ ...p, push_enabled: true }))
        }
      }
      return res
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
    } finally {
      setBusy(false)
    }
  }, [])

  const updatePref = useCallback(async (key: keyof NotifPrefs, value: boolean) => {
    setPrefs((p) => ({ ...p, [key]: value }))
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) return
    const row: any = { user_id: u.user.id, [key]: value }
    await supabase.from('notification_preferences').upsert(row, { onConflict: 'user_id' })
  }, [])

  return { supported, permission, subscribed, prefs, loading, busy, enable, disable, updatePref, refresh }
}
