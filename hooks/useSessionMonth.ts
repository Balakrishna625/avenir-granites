/**
 * Custom hook to persist selected month/year in sessionStorage
 * 
 * Features:
 * - Remembers selected month during browser session
 * - Resets to current month when session ends (tab close, logout, etc.)
 * - Safe for all pages - doesn't affect data or functionality
 * 
 * Usage:
 * const [month, setMonth] = useSessionMonth('pageKey', defaultMonth)
 */

import { useState, useEffect } from 'react'

interface MonthYearState {
  month: number
  year: number
}

/**
 * Hook for pages using separate month and year states (numeric format)
 * @param storageKey - Unique key for this page (e.g., 'sales-data-entry')
 * @param defaultMonth - Default month (1-12), defaults to current month
 * @param defaultYear - Default year, defaults to current year
 */
export function useSessionMonthYear(storageKey: string, defaultMonth?: number, defaultYear?: number) {
  const currentDate = new Date()
  const currentMonth = defaultMonth ?? (currentDate.getMonth() + 1)
  const currentYear = defaultYear ?? currentDate.getFullYear()

  const getInitialState = (): MonthYearState => {
    if (typeof window === 'undefined') {
      return { month: currentMonth, year: currentYear }
    }

    try {
      const stored = sessionStorage.getItem(`month-${storageKey}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          month: parsed.month ?? currentMonth,
          year: parsed.year ?? currentYear
        }
      }
    } catch (error) {
      console.error('Error reading from sessionStorage:', error)
    }

    return { month: currentMonth, year: currentYear }
  }

  const [state, setState] = useState<MonthYearState>(getInitialState)

  const setMonth = (month: number) => {
    setState(prev => {
      const newState = { ...prev, month }
      try {
        sessionStorage.setItem(`month-${storageKey}`, JSON.stringify(newState))
      } catch (error) {
        console.error('Error writing to sessionStorage:', error)
      }
      return newState
    })
  }

  const setYear = (year: number) => {
    setState(prev => {
      const newState = { ...prev, year }
      try {
        sessionStorage.setItem(`month-${storageKey}`, JSON.stringify(newState))
      } catch (error) {
        console.error('Error writing to sessionStorage:', error)
      }
      return newState
    })
  }

  return {
    selectedMonth: state.month,
    selectedYear: state.year,
    setSelectedMonth: setMonth,
    setSelectedYear: setYear
  }
}

/**
 * Hook for pages using YYYY-MM string format
 * @param storageKey - Unique key for this page (e.g., 'sales-analytics')
 * @param defaultValue - Default month in YYYY-MM format, defaults to current month
 */
export function useSessionMonthString(storageKey: string, defaultValue?: string) {
  const currentMonth = defaultValue ?? new Date().toISOString().slice(0, 7)

  const getInitialValue = (): string => {
    if (typeof window === 'undefined') {
      return currentMonth
    }

    try {
      const stored = sessionStorage.getItem(`month-${storageKey}`)
      if (stored) {
        return stored
      }
    } catch (error) {
      console.error('Error reading from sessionStorage:', error)
    }

    return currentMonth
  }

  const [selectedMonth, setSelectedMonthState] = useState<string>(getInitialValue)

  const setSelectedMonth = (month: string) => {
    setSelectedMonthState(month)
    try {
      sessionStorage.setItem(`month-${storageKey}`, month)
    } catch (error) {
      console.error('Error writing to sessionStorage:', error)
    }
  }

  return { selectedMonth, setSelectedMonth }
}
