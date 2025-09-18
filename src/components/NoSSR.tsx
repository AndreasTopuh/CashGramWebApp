'use client'

import { useState, useEffect, ReactNode } from 'react'

interface NoSSRProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * NoSSR component prevents server-side rendering of its children.
 * This is useful for components that may cause hydration mismatches
 * due to browser extensions or other client-side modifications.
 */
export default function NoSSR({ children, fallback = null }: NoSSRProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // On the server and during initial client render, show fallback
  if (!isClient) {
    return <>{fallback}</>
  }

  // Only render children after client-side hydration is complete
  return <>{children}</>
}