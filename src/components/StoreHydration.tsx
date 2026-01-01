'use client'

import { useEffect } from 'react'
import { useBoardStore } from '@/lib/store'

export function StoreHydration() {
  useEffect(() => {
    useBoardStore.persist.rehydrate()
  }, [])

  return null
}
