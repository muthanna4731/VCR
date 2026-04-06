import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { AuthContext } from '../../context/auth-context'
import { runSupabaseMutation, runSupabaseRequest } from '../../lib/supabaseRequest'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function syncSession(session) {
      if (!active) return

      const nextUser = session?.user ?? null
      setLoading(true)
      setUser(nextUser)

      if (!nextUser) {
        setProfile(null)
        if (active) setLoading(false)
        return
      }

      try {
        const { data } = await runSupabaseRequest(
          () => supabase
            .from('profiles')
            .select('id, full_name, phone, role')
            .eq('id', nextUser.id)
            .maybeSingle(),
          { label: 'Load auth profile' }
        )

        if (!active) return
        setProfile(data ?? null)
      } catch (error) {
        if (!active) return
        console.error(error)
        setProfile(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    runSupabaseRequest(() => supabase.auth.getSession(), {
      label: 'Load auth session',
      retries: 0,
    })
      .then(({ data: { session } }) => {
        syncSession(session)
      })
      .catch(error => {
        console.error(error)
        if (active) setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email, password) {
    try {
      const result = await runSupabaseMutation(
        () => supabase.auth.signInWithPassword({ email, password }),
        { label: 'Sign in' }
      )
      return { error: result.error ?? null }
    } catch (error) {
      return { error }
    }
  }

  async function signOut() {
    try {
      await runSupabaseMutation(() => supabase.auth.signOut(), { label: 'Sign out' })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
