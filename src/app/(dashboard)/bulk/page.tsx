'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  BarChart3,
  Zap,
  RefreshCw,
  Crown,
  Lock,
  Clock,
  XCircle,
  Loader2,
  TrendingUp,
  PlayCircle,
  PauseCircle,
} from 'lucide-react'

interface CSVRow {
  [key: string]: string
}

interface ColumnMapping {
  csvColumn: string
  mappedTo: 'product_name' | 'features' | 'platform' | 'ignore'
  confidence: number
  suggestions: string[]
}

interface ProcessingJob {
  id: string
  productName: string
  features: string
  platform: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  content?: string
  error?: string
  qualityScore?: number
  processingTime?: number
  startTime?: number
  usageCounted?: boolean
}

interface BulkProduct {
  id: string
  product_name: string
  features: string
  platform: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  generated_content?: string
  error_message?: string
  quality_score?: number
  processing_time?: number
  created_at: string
  updated_at?: string
}

interface BulkJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
  products: BulkProduct[]
  total_products: number
  completed_products: number
  failed_products: number
  processing_products?: number
  stats?: {
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
  }
  progress: number
  estimatedTimeRemaining: number
  avgProcessingTime: number
}

interface BulkJobSession {
  id: string
  userId: string
  jobStartTime: number
  status: 'initializing' | 'processing' | 'completed' | 'failed' | 'cancelled'
  csvData: CSVRow[]
  columnMappings: ColumnMapping[]
  processingJobs: ProcessingJob[]
  currentStep: 'upload' | 'mapping' | 'processing' | 'results'
  processingProgress: number
  processingStats: {
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
    estimatedTimeRemaining: number
    avgProcessingTime: number
  }
  createdAt: number
  lastUpdated: number
  lockAcquired: boolean
  uiState: {
    monthlyUsage: number
    monthlyLimit: number
    userPlan: string
    showingProgress: boolean
  }
}

// 🚀 HELPER FUNCTION: Get job stats from any data structure
const getJobStats = (job: any) => {
  if (!job)
    return { total: 0, completed: 0, failed: 0, processing: 0, pending: 0 }

  // Handle different data structures
  if (job.stats) {
    return job.stats
  }

  // Calculate from job properties
  const total = job.total_products || 0
  const completed = job.completed_products || 0
  const failed = job.failed_products || 0
  const processing = job.processing_products || 0
  const pending = total - completed - failed - processing

  return { total, completed, failed, processing, pending }
}

// Plan limits configuration
const PLAN_LIMITS = {
  starter: {
    name: 'Starter',
    maxBulkProducts: 0,
    monthlyGenerations: 10,
    price: 'Free',
    features: ['Single product generation', 'Basic features'],
  },
  business: {
    name: 'Business',
    maxBulkProducts: 50,
    monthlyGenerations: 250,
    price: '$29/month',
    features: [
      'Bulk CSV upload (50 products)',
      'Voice-to-content',
      'Priority support',
    ],
  },
  premium: {
    name: 'Premium',
    maxBulkProducts: 200,
    monthlyGenerations: 1000,
    price: '$79/month',
    features: [
      'Bulk CSV upload (200 products)',
      'Advanced customization',
      'Batch export',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    maxBulkProducts: 1000,
    monthlyGenerations: 999999,
    price: '$199/month',
    features: [
      'Bulk CSV upload (1000 products)',
      'Priority phone support',
      'Custom templates',
    ],
  },
}

export default function BulkCSVUploadPage() {
  // Add Supabase state for SSR fix
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  const [user, setUser] = useState<any>(null)
  const [userPlan, setUserPlan] = useState<keyof typeof PLAN_LIMITS>('starter')
  const [loading, setLoading] = useState(true)
  const [planLoaded, setPlanLoaded] = useState(false)
  const [csvFile, setCSVFile] = useState<File | null>(null)
  const [csvData, setCSVData] = useState<CSVRow[]>([])
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([])
  const [currentStep, setCurrentStep] = useState<
    'upload' | 'mapping' | 'processing' | 'results'
  >('upload')
  const [processingProgress, setProcessingProgress] = useState(0)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [monthlyUsage, setMonthlyUsage] = useState(0)
  const [monthlyLimit, setMonthlyLimit] = useState(10)

  // Enhanced progress tracking states
  const [currentProcessingStats, setCurrentProcessingStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    estimatedTimeRemaining: 0,
    avgProcessingTime: 0,
  })
  const [processingStartTime, setProcessingStartTime] = useState<number>(0)
  const [currentJobId, setCurrentJobId] = useState<string>('')

  // Background job states
  const [currentJob, setCurrentJob] = useState<BulkJob | null>(null)
  const [isSubmittingJob, setIsSubmittingJob] = useState(false)
  const [jobPollingInterval, setJobPollingInterval] =
    useState<NodeJS.Timeout | null>(null)
  const [useBackgroundProcessing, setUseBackgroundProcessing] = useState(true) // Toggle between modes
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [recoverySession, setRecoverySession] = useState<BulkJobSession | null>(
    null
  )

  const router = useRouter()

  // Session management for frontend mode
  const SESSION_KEY = 'listora_bulk_session'
  const PROCESSING_KEY = 'listora_processing_lock'

  // Initialize Supabase client after component mounts
  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  // 🚀 BACKGROUND JOB: Start processing on server
  const startBackgroundJob = async (products: any[]) => {
    if (!user || !supabase) {
      alert('Please log in to process bulk content')
      return
    }

    setIsSubmittingJob(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No valid session')
      }

      const response = await fetch('/api/bulk-process/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          products,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to start job: ${error}`)
      }

      const result = await response.json()
      console.log('🚀 Background job started:', result.jobId)

      // Start polling for job status
      startJobPolling(result.jobId)
      setCurrentStep('processing')
    } catch (error) {
      console.error('❌ Failed to start background job:', error)
      alert('Failed to start processing. Please try again.')
    } finally {
      setIsSubmittingJob(false)
    }
  }

  // 🔄 POLLING: Check job status every 3 seconds
  const startJobPolling = useCallback(
    (jobId: string) => {
      if (!supabase) return

      console.log('🔄 Starting job polling for:', jobId)

      const pollJob = async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (!session?.access_token) return

          const response = await fetch(`/api/bulk-process/status/${jobId}`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })

          if (response.ok) {
            const result = await response.json()
            setCurrentJob(result.job)

            // Stop polling if job is completed or failed
            if (
              result.job.status === 'completed' ||
              result.job.status === 'failed'
            ) {
              if (jobPollingInterval) {
                clearInterval(jobPollingInterval)
                setJobPollingInterval(null)
              }

              if (result.job.status === 'completed') {
                setCurrentStep('results')
              }

              console.log('✅ Job finished:', result.job.status)
            }
          }
        } catch (error) {
          console.error('❌ Polling error:', error)
        }
      }

      // Poll immediately, then every 3 seconds
      pollJob()
      const interval = setInterval(pollJob, 3000)
      setJobPollingInterval(interval)
    },
    [supabase, jobPollingInterval]
  )

  // 🔍 CHECK: Look for active jobs when user loads
  const checkForActiveJobs = useCallback(async () => {
    if (!user || !useBackgroundProcessing || !supabase) return

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/bulk-process/user-jobs', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()

        if (result.activeJobs && result.activeJobs.length > 0) {
          const activeJob = result.activeJobs[0]
          console.log('🔍 Found active job:', activeJob.id)

          // Start polling the active job
          startJobPolling(activeJob.id)
          setCurrentStep('processing')
        }
      }
    } catch (error) {
      console.error('❌ Error checking active jobs:', error)
    }
  }, [user, supabase, startJobPolling, useBackgroundProcessing])

  // Frontend processing functions (existing logic)
  const updateUsageTracking = async (
    userId: string,
    incrementBy: number = 1
  ) => {
    if (!supabase) return { error: 'Supabase not initialized' }

    try {
      const { data, error } = await supabase.rpc('increment_user_usage', {
        p_user_id: userId,
        p_increment_by: incrementBy,
      })

      if (error) {
        console.error('Error updating usage via RPC:', error)
        return { error }
      }

      if (data && data.usage_count) {
        setMonthlyUsage(data.usage_count)
        console.log(`✅ Usage updated: ${data.usage_count}`)
      }

      return { data, error: null }
    } catch (error) {
      console.error('Error calling increment_user_usage RPC:', error)
      return { error }
    }
  }

  // Frontend session management (simplified)
  const saveSessionImmediate = useCallback(() => {
    if (!user || useBackgroundProcessing) return

    const sessionData = {
      id: currentJobId || `bulk_${user.id}_${Date.now()}`,
      userId: user.id,
      csvData,
      columnMappings,
      processingJobs,
      currentStep,
      processingProgress,
      currentProcessingStats,
      processingStartTime,
      isProcessing,
      monthlyUsage,
      monthlyLimit,
      userPlan,
      lastUpdated: Date.now(),
    }

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
      if (isProcessing) {
        localStorage.setItem(PROCESSING_KEY, 'true')
      }
      console.log('📱 Frontend session saved')
    } catch (error) {
      console.error('❌ Failed to save session:', error)
    }
  }, [
    user,
    currentJobId,
    csvData,
    columnMappings,
    processingJobs,
    currentStep,
    processingProgress,
    currentProcessingStats,
    processingStartTime,
    isProcessing,
    monthlyUsage,
    monthlyLimit,
    userPlan,
    useBackgroundProcessing,
  ])

  const loadAndRestoreSession = useCallback(() => {
    if (!user || useBackgroundProcessing) return false

    try {
      const savedData = localStorage.getItem(SESSION_KEY)
      if (!savedData) return false

      const session = JSON.parse(savedData)

      if (session.userId !== user.id) {
        localStorage.removeItem(SESSION_KEY)
        return false
      }

      const timeDiff = Date.now() - session.lastUpdated
      if (timeDiff > 2 * 60 * 60 * 1000) {
        localStorage.removeItem(SESSION_KEY)
        return false
      }

      // Restore state
      setCSVData(session.csvData || [])
      setColumnMappings(session.columnMappings || [])
      setProcessingJobs(session.processingJobs || [])
      setCurrentStep(session.currentStep || 'upload')
      setProcessingProgress(session.processingProgress || 0)
      setCurrentProcessingStats(
        session.currentProcessingStats || {
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          estimatedTimeRemaining: 0,
          avgProcessingTime: 0,
        }
      )
      setProcessingStartTime(session.processingStartTime || 0)
      setCurrentJobId(session.id)
      setMonthlyUsage(session.monthlyUsage || 0)
      setMonthlyLimit(session.monthlyLimit || 10)
      setUserPlan(session.userPlan || 'starter')

      const hasActiveWork = (session.processingJobs || []).some(
        (job: ProcessingJob) =>
          job.status === 'processing' ||
          job.status === 'completed' ||
          job.status === 'pending'
      )

      if (hasActiveWork && session.currentStep !== 'upload') {
        setShowRecoveryModal(true)
        setRecoverySession(session)
        return true
      }

      return true
    } catch (error) {
      console.error('❌ Failed to load session:', error)
      localStorage.removeItem(SESSION_KEY)
      return false
    }
  }, [user, useBackgroundProcessing])

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(PROCESSING_KEY)
    console.log('🗑️ Frontend session cleared')
  }

  // Auth and plan loading
  useEffect(() => {
    if (!mounted || !supabase) return

    let mountedLocal = true

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (mountedLocal) {
          setUser(session?.user ?? null)
          setLoading(false)

          if (!session?.user) {
            router.push('/login')
          } else {
            await fetchUserPlan(session.user.id)
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
        if (mountedLocal) {
          setLoading(false)
          setPlanLoaded(true)
        }
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (mountedLocal) {
        setUser(session?.user ?? null)
        if (!session?.user && event !== 'INITIAL_SESSION') {
          router.push('/login')
        } else if (session?.user) {
          fetchUserPlan(session.user.id)
        }
      }
    })

    return () => {
      mountedLocal = false
      subscription.unsubscribe()
    }
  }, [router, supabase, mounted])

  // Check for active jobs or sessions when user loads
  useEffect(() => {
    if (user && planLoaded) {
      if (useBackgroundProcessing) {
        checkForActiveJobs()
      } else {
        loadAndRestoreSession()
      }
    }
  }, [
    user,
    planLoaded,
    useBackgroundProcessing,
    checkForActiveJobs,
    loadAndRestoreSession,
  ])

  // Auto-save session for frontend mode
  useEffect(() => {
    if (
      user &&
      !useBackgroundProcessing &&
      (csvData.length > 0 || processingJobs.length > 0 || isProcessing)
    ) {
      saveSessionImmediate()
    }
  }, [
    saveSessionImmediate,
    user,
    csvData,
    processingJobs,
    isProcessing,
    currentStep,
    useBackgroundProcessing,
  ])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (jobPollingInterval) {
        clearInterval(jobPollingInterval)
      }
    }
  }, [jobPollingInterval])

  // Update processing stats whenever jobs change (frontend mode)
  useEffect(() => {
    if (useBackgroundProcessing) return

    const total = processingJobs.length
    const pending = processingJobs.filter(
      (job) => job.status === 'pending'
    ).length
    const processing = processingJobs.filter(
      (job) => job.status === 'processing'
    ).length
    const completed = processingJobs.filter(
      (job) => job.status === 'completed'
    ).length
    const failed = processingJobs.filter(
      (job) => job.status === 'failed'
    ).length

    const completedJobs = processingJobs.filter(
      (job) => job.status === 'completed' && job.processingTime
    )
    const avgTime =
      completedJobs.length > 0
        ? completedJobs.reduce(
            (sum, job) => sum + (job.processingTime || 0),
            0
          ) / completedJobs.length
        : 0

    const remainingJobs = pending + processing
    const estimatedTime = remainingJobs * (avgTime || 15)

    setCurrentProcessingStats({
      total,
      pending,
      processing,
      completed,
      failed,
      estimatedTimeRemaining: estimatedTime,
      avgProcessingTime: avgTime,
    })

    if (total > 0) {
      setProcessingProgress(((completed + failed) / total) * 100)
    }
  }, [processingJobs, useBackgroundProcessing])

  const fetchUserPlan = async (userId: string) => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('user_plans')
        .select('plan_type')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (data && !error) {
        setUserPlan(data.plan_type as keyof typeof PLAN_LIMITS)
        setMonthlyLimit(
          PLAN_LIMITS[data.plan_type as keyof typeof PLAN_LIMITS]
            .monthlyGenerations
        )
      } else {
        setUserPlan('starter')
        setMonthlyLimit(PLAN_LIMITS.starter.monthlyGenerations)
      }

      setPlanLoaded(true)
      await fetchMonthlyUsage(userId)
    } catch (error) {
      console.error('Error fetching user plan:', error)
      setUserPlan('starter')
      setMonthlyLimit(PLAN_LIMITS.starter.monthlyGenerations)
      setPlanLoaded(true)
    }
  }

  const fetchMonthlyUsage = async (userId: string) => {
    if (!supabase) return

    try {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const { data: usageData, error: usageError } = await supabase
        .from('user_usage_tracking')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('month_year', currentMonth)
        .single()

      if (usageData && !usageError) {
        setMonthlyUsage(usageData.usage_count || 0)
      } else {
        const { error: initError } = await supabase.rpc(
          'increment_user_usage',
          {
            p_user_id: userId,
            p_increment_by: 0,
            p_month_year: currentMonth,
          }
        )
        if (!initError) setMonthlyUsage(0)
      }
    } catch (error) {
      console.error('Error fetching monthly usage:', error)
      setMonthlyUsage(0)
    }
  }

  const detectColumns = (headers: string[]): ColumnMapping[] => {
    const mappings: ColumnMapping[] = []
    const productNamePatterns = [
      'product',
      'name',
      'title',
      'item',
      'product_name',
      'product name',
      'item_name',
    ]
    const featuresPatterns = [
      'feature',
      'description',
      'detail',
      'benefit',
      'spec',
      'features',
      'desc',
    ]
    const platformPatterns = [
      'platform',
      'channel',
      'marketplace',
      'store',
      'site',
    ]

    headers.forEach((header) => {
      const lowerHeader = header.toLowerCase().trim()
      let mappedTo: 'product_name' | 'features' | 'platform' | 'ignore' =
        'ignore'
      let confidence = 0
      let suggestions: string[] = []

      productNamePatterns.forEach((pattern) => {
        if (lowerHeader.includes(pattern)) {
          mappedTo = 'product_name'
          confidence = Math.max(confidence, 0.9)
          suggestions.push('Product Name')
        }
      })

      featuresPatterns.forEach((pattern) => {
        if (lowerHeader.includes(pattern)) {
          if (mappedTo === 'ignore' || confidence < 0.8) {
            mappedTo = 'features'
            confidence = Math.max(confidence, 0.8)
            suggestions.push('Features & Benefits')
          }
        }
      })

      platformPatterns.forEach((pattern) => {
        if (lowerHeader.includes(pattern)) {
          if (mappedTo === 'ignore' || confidence < 0.7) {
            mappedTo = 'platform'
            confidence = Math.max(confidence, 0.7)
            suggestions.push('Target Platform')
          }
        }
      })

      if (mappedTo === 'ignore') {
        suggestions = [
          'Product Name',
          'Features & Benefits',
          'Target Platform',
          'Ignore',
        ]
      } else {
        suggestions = suggestions.filter(
          (s) =>
            s !==
            (mappedTo === 'product_name'
              ? 'Product Name'
              : mappedTo === 'features'
                ? 'Features & Benefits'
                : 'Target Platform')
        )
        suggestions.unshift(
          mappedTo === 'product_name'
            ? 'Product Name'
            : mappedTo === 'features'
              ? 'Features & Benefits'
              : 'Target Platform'
        )
      }

      mappings.push({ csvColumn: header, mappedTo, confidence, suggestions })
    })

    return mappings
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
      i++
    }
    result.push(current.trim())
    return result
  }

  const checkPlanLimits = (
    productCount: number
  ): { allowed: boolean; message?: string } => {
    if (!planLoaded) return { allowed: true }

    const planLimit = PLAN_LIMITS[userPlan]
    if (planLimit.maxBulkProducts === 0) {
      return {
        allowed: false,
        message: `Bulk upload is not available on the ${planLimit.name} plan. Please upgrade to access bulk processing.`,
      }
    }

    if (productCount > planLimit.maxBulkProducts) {
      return {
        allowed: false,
        message: `Your ${planLimit.name} plan supports up to ${planLimit.maxBulkProducts} products per upload. You're trying to upload ${productCount} products.`,
      }
    }

    const remainingGenerations = monthlyLimit - monthlyUsage
    if (productCount > remainingGenerations) {
      return {
        allowed: false,
        message: `You have ${remainingGenerations} generations remaining this month. You're trying to generate ${productCount} products. ${
          remainingGenerations > 0
            ? `Try uploading ${remainingGenerations} products or fewer.`
            : 'Please upgrade your plan for more monthly generations.'
        }`,
      }
    }

    return { allowed: true }
  }

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }

    setCSVFile(file)
    setIsAnalyzing(true)
    setCurrentStep('upload')

    try {
      const text = await file.text()
      const lines = text.split('\n').filter((line) => line.trim())

      if (lines.length < 2) {
        throw new Error(
          'CSV file must have at least a header row and one data row'
        )
      }

      const headers = parseCSVLine(lines[0])
      const rows: CSVRow[] = []
      const maxRows = Math.min(lines.length - 1, 1000)

      for (let i = 1; i <= maxRows; i++) {
        const values = parseCSVLine(lines[i])
        const row: CSVRow = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        if (Object.values(row).some((val) => val.trim())) {
          rows.push(row)
        }
      }

      if (planLoaded) {
        const limitCheck = checkPlanLimits(rows.length)
        if (!limitCheck.allowed) {
          alert(limitCheck.message)
          setShowUpgradeModal(true)
          setCSVFile(null)
          setIsAnalyzing(false)
          return
        }
      }

      setCSVData(rows)
      const mappings = detectColumns(headers)
      setColumnMappings(mappings)
      setCurrentStep('mapping')
    } catch (error) {
      console.error('Error parsing CSV:', error)
      alert(
        `Error parsing CSV file: ${error instanceof Error ? error.message : 'Please check the format.'}`
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const updateColumnMapping = (
    index: number,
    newMapping: 'product_name' | 'features' | 'platform' | 'ignore'
  ) => {
    setColumnMappings((prev) =>
      prev.map((mapping, i) =>
        i === index ? { ...mapping, mappedTo: newMapping } : mapping
      )
    )
  }

  // Frontend processing function (existing logic)
  const startFrontendProcessing = async (products: any[]) => {
    if (isProcessing || !supabase) {
      alert('⚠️ Processing is already in progress.')
      return
    }

    const jobId = `bulk_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setCurrentJobId(jobId)
    setIsProcessing(true)
    setCurrentStep('processing')
    setProcessingStartTime(Date.now())

    const jobs: ProcessingJob[] = products.map((product, index) => ({
      id: `${jobId}_product_${index}`,
      productName: product.productName,
      features: product.features,
      platform: product.platform,
      status: 'pending' as const,
      usageCounted: false,
    }))

    setProcessingJobs(jobs)

    try {
      const batchSize = 3
      for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize)

        await Promise.all(
          batch.map(async (job, batchIndex) => {
            const jobIndex = i + batchIndex
            const startTime = Date.now()

            setProcessingJobs((prev) =>
              prev.map((j, idx) =>
                idx === jobIndex ? { ...j, status: 'processing', startTime } : j
              )
            )

            try {
              const {
                data: { session },
              } = await supabase.auth.getSession()
              if (!session?.access_token) throw new Error('No valid session')

              const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  productName: job.productName,
                  features: job.features,
                  platform: job.platform,
                }),
              })

              if (response.ok) {
                const data = await response.json()
                const endTime = Date.now()
                const processingTime = Math.round((endTime - startTime) / 1000)
                const qualityScore = calculateQualityScore(
                  job.productName,
                  job.features,
                  data.result
                )

                setProcessingJobs((prev) =>
                  prev.map((j, idx) =>
                    idx === jobIndex
                      ? {
                          ...j,
                          status: 'completed',
                          content: data.result,
                          qualityScore,
                          processingTime,
                          usageCounted: true,
                        }
                      : j
                  )
                )

                await updateUsageTracking(user.id, 1)
              } else {
                const errorText = await response.text()
                throw new Error(`HTTP ${response.status}: ${errorText}`)
              }
            } catch (error) {
              console.error(`❌ Failed: ${job.productName}`, error)
              const endTime = Date.now()
              const processingTime = Math.round((endTime - startTime) / 1000)

              setProcessingJobs((prev) =>
                prev.map((j, idx) =>
                  idx === jobIndex
                    ? {
                        ...j,
                        status: 'failed',
                        error:
                          error instanceof Error
                            ? error.message
                            : 'Unknown error',
                        processingTime,
                      }
                    : j
                )
              )
            }
          })
        )

        if (i + batchSize < jobs.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    } catch (error) {
      console.error('Frontend processing error:', error)
    } finally {
      setIsProcessing(false)
      setCurrentStep('results')
      localStorage.removeItem(PROCESSING_KEY)
    }
  }

  const startBulkProcessing = async () => {
    if (!user) {
      alert('Please log in to process bulk content')
      return
    }

    const limitCheck = checkPlanLimits(csvData.length)
    if (!limitCheck.allowed) {
      alert(limitCheck.message)
      setShowUpgradeModal(true)
      return
    }

    const productNameCol = columnMappings.find(
      (m) => m.mappedTo === 'product_name'
    )
    const featuresCol = columnMappings.find((m) => m.mappedTo === 'features')
    const platformCol = columnMappings.find((m) => m.mappedTo === 'platform')

    if (!productNameCol) {
      alert('Please map at least one column to Product Name')
      return
    }

    // Prepare products
    const products = csvData
      .filter((row) => row[productNameCol.csvColumn]?.trim())
      .map((row, index) => {
        let detectedPlatform = 'amazon'
        if (platformCol && row[platformCol.csvColumn]) {
          const csvPlatformValue = row[platformCol.csvColumn]
            .toLowerCase()
            .trim()
          if (
            ['amazon', 'shopify', 'etsy', 'instagram'].includes(
              csvPlatformValue
            )
          ) {
            detectedPlatform = csvPlatformValue
          }
        }

        return {
          productName:
            row[productNameCol.csvColumn]?.trim() || `Product ${index + 1}`,
          features: featuresCol ? row[featuresCol.csvColumn]?.trim() || '' : '',
          platform: detectedPlatform,
        }
      })

    if (products.length === 0) {
      alert('No valid products found to process.')
      return
    }

    // Choose processing mode
    if (useBackgroundProcessing) {
      console.log(`🚀 Starting background job with ${products.length} products`)
      await startBackgroundJob(products)
    } else {
      console.log(`🚀 Starting frontend job with ${products.length} products`)
      await startFrontendProcessing(products)
    }
  }

  const calculateQualityScore = (
    productName: string,
    features: string,
    content: string
  ): number => {
    let score = 70
    if (content.length > 500) score += 10
    if (content.length > 1000) score += 5
    if (features && features.length > 50) score += 10
    if (productName && productName.length > 10) score += 5
    score += Math.random() * 10
    return Math.min(100, Math.max(60, score))
  }

  const downloadResults = () => {
    let completedProducts: any[] = []

    if (useBackgroundProcessing && currentJob) {
      completedProducts = currentJob.products.filter(
        (product) => product.status === 'completed'
      )
    } else {
      completedProducts = processingJobs.filter(
        (job) => job.status === 'completed'
      )
    }

    if (completedProducts.length === 0) {
      alert('No completed products to download')
      return
    }

    const csvContent = [
      'Product Name,Original Features,Platform,Generated Content,Quality Score,Processing Time (s),Status',
      ...completedProducts.map((item) => {
        const row = [
          useBackgroundProcessing ? item.product_name : item.productName || '',
          item.features || '',
          item.platform || 'amazon',
          useBackgroundProcessing
            ? item.generated_content?.replace(/\n/g, ' ').replace(/"/g, '""') ||
              ''
            : item.content?.replace(/\n/g, ' ').replace(/"/g, '""') || '',
          useBackgroundProcessing
            ? item.quality_score?.toFixed(1) || ''
            : item.qualityScore?.toFixed(1) || '',
          useBackgroundProcessing
            ? item.processing_time || ''
            : item.processingTime || '',
          'Completed',
        ]
        return row.map((cell) => `"${cell}"`).join(',')
      }),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `listora-bulk-results-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const resetWorkflow = () => {
    if (jobPollingInterval) {
      clearInterval(jobPollingInterval)
      setJobPollingInterval(null)
    }
    clearSession()
    setCurrentJob(null)
    setCSVFile(null)
    setCSVData([])
    setColumnMappings([])
    setProcessingJobs([])
    setCurrentStep('upload')
    setProcessingProgress(0)
    setCurrentProcessingStats({
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      estimatedTimeRemaining: 0,
      avgProcessingTime: 0,
    })
    setIsSubmittingJob(false)
    setIsProcessing(false)
    setShowRecoveryModal(false)
    setRecoverySession(null)
    setCurrentJobId('')
  }

  const handleUpgrade = () => {
    router.push('/pricing')
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const currentPlanLimits = PLAN_LIMITS[userPlan]

  // Recovery Modal Component (for frontend mode)
  const RecoveryModal = () => {
    if (!showRecoveryModal || !recoverySession || useBackgroundProcessing)
      return null

    const pendingCount =
      recoverySession.processingJobs?.filter((j) => j.status === 'pending')
        .length || 0
    const completedCount =
      recoverySession.processingJobs?.filter((j) => j.status === 'completed')
        .length || 0
    const failedCount =
      recoverySession.processingJobs?.filter((j) => j.status === 'failed')
        .length || 0

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Resume Previous Job?
            </h2>
            <p className="text-gray-600 mb-6">
              We found a bulk processing job that was interrupted. Would you
              like to resume where you left off?
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>Total Products:</span>
                  <span className="font-semibold">
                    {recoverySession.processingJobs?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span className="font-semibold text-green-600">
                    {completedCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Failed:</span>
                  <span className="font-semibold text-red-600">
                    {failedCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining:</span>
                  <span className="font-semibold text-yellow-600">
                    {pendingCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setCSVData(recoverySession.csvData || [])
                  setColumnMappings(recoverySession.columnMappings || [])
                  setProcessingJobs(recoverySession.processingJobs || [])
                  setCurrentStep(recoverySession.currentStep || 'processing')
                  setCurrentJobId(recoverySession.id)
                  setShowRecoveryModal(false)
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Resume Job {pendingCount > 0 && `(${pendingCount} remaining)`}
              </button>
              <button
                onClick={() => {
                  clearSession()
                  setShowRecoveryModal(false)
                  setRecoverySession(null)
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Wait for both mounted and supabase to be ready
  if (loading || !planLoaded || !mounted || !supabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bulk upload...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please log in to use the bulk upload feature.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors duration-200 cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Plan Status Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="h-5 w-5 text-yellow-300" />
              <span className="font-medium">
                {currentPlanLimits.name} Plan:{' '}
                {currentPlanLimits.maxBulkProducts > 0
                  ? `Up to ${currentPlanLimits.maxBulkProducts} products per upload`
                  : 'Bulk upload not available'}{' '}
                • {monthlyLimit - monthlyUsage} generations left this month
              </span>
            </div>
            {userPlan !== 'enterprise' && (
              <button
                onClick={handleUpgrade}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 whitespace-nowrap cursor-pointer"
              >
                Upgrade Plan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug Info */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <strong>🚀 Processing Mode:</strong>
          <button
            onClick={() => setUseBackgroundProcessing(!useBackgroundProcessing)}
            className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs cursor-pointer"
          >
            {useBackgroundProcessing ? 'Background' : 'Frontend'} (Click to
            toggle)
          </button>
          <br />
          <strong>Status:</strong> Step: {currentStep} | Processing:{' '}
          {isProcessing ? 'Yes' : 'No'} | Jobs: {processingJobs.length} |
          {useBackgroundProcessing && (
            <>
              Active Job: {currentJob ? currentJob.id : 'None'} | Job Status:{' '}
              {currentJob ? currentJob.status : 'N/A'}
            </>
          )}
        </div>

        {/* Page Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {useBackgroundProcessing
              ? '🚀 Background Bulk Content Generator'
              : 'Bulk Content Generator'}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {useBackgroundProcessing
              ? 'Upload your CSV and let our servers process everything in the background. Navigate freely - your job keeps running!'
              : 'Upload your product CSV and generate content for multiple products at once'}
          </p>
          {useBackgroundProcessing && (
            <div className="mt-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                ✨ Background Processing: Never stops when you navigate away!
              </span>
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[
              { key: 'upload', label: 'Upload CSV', icon: Upload },
              { key: 'mapping', label: 'Smart Mapping', icon: Zap },
              {
                key: 'processing',
                label: useBackgroundProcessing
                  ? 'Background Processing'
                  : 'AI Processing',
                icon: useBackgroundProcessing ? PlayCircle : RefreshCw,
              },
              { key: 'results', label: 'Download Results', icon: Download },
            ].map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.key
              const isCompleted =
                ['upload', 'mapping', 'processing', 'results'].indexOf(
                  currentStep
                ) > index

              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      isActive
                        ? 'text-indigo-600'
                        : isCompleted
                          ? 'text-green-600'
                          : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < 3 && (
                    <ArrowRight className="h-4 w-4 text-gray-400 ml-4" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step 1: Upload CSV */}
        {currentStep === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="text-center">
              <Upload className="h-16 w-16 text-indigo-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Upload Your Product CSV
              </h2>
              <p className="text-gray-600 mb-4 max-w-2xl mx-auto">
                Upload your CSV file with product data. Your{' '}
                {currentPlanLimits.name} plan supports
                {currentPlanLimits.maxBulkProducts > 0
                  ? ` up to ${currentPlanLimits.maxBulkProducts} products per upload.`
                  : ' single product generation only.'}{' '}
                You have {monthlyLimit - monthlyUsage} generations remaining
                this month.
              </p>

              {planLoaded && currentPlanLimits.maxBulkProducts === 0 ? (
                <div className="border-2 border-dashed border-red-300 rounded-lg p-12 bg-red-50">
                  <Lock className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-red-900 mb-2">
                    Bulk Upload Not Available
                  </p>
                  <p className="text-red-600 mb-4">
                    Bulk CSV upload requires a paid plan. Upgrade to unlock
                    batch processing.
                  </p>
                  <button
                    onClick={handleUpgrade}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Upgrade to Business Plan
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-indigo-400 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                    disabled={isAnalyzing}
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {isAnalyzing
                        ? 'Analyzing your CSV...'
                        : 'Click to upload your CSV file'}
                    </p>
                    <p className="text-gray-500">
                      Enhanced CSV parsing with platform detection
                    </p>
                    {isAnalyzing && (
                      <div className="mt-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      </div>
                    )}
                  </label>
                </div>
              )}

              {csvFile && !isAnalyzing && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800">
                    ✅ <strong>{csvFile.name}</strong> uploaded successfully!
                    Found {csvData.length} products.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {currentStep === 'mapping' && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Zap className="h-6 w-6 mr-2 text-indigo-600" />
                Smart Column Mapping
              </h2>
              <button
                onClick={resetWorkflow}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium cursor-pointer"
              >
                Upload Different File
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {columnMappings.map((mapping, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {mapping.csvColumn}
                    </div>
                    <div className="text-sm text-gray-500">
                      AI Confidence: {(mapping.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="flex-1 mx-4">
                    <select
                      value={mapping.mappedTo}
                      onChange={(e) =>
                        updateColumnMapping(index, e.target.value as any)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="ignore">Ignore</option>
                      <option value="product_name">Product Name</option>
                      <option value="features">Features & Benefits</option>
                      <option value="platform">Target Platform</option>
                    </select>
                  </div>
                  <div className="flex-1 text-right">
                    {csvData[0] && (
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        Sample: "{csvData[0][mapping.csvColumn]}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setCurrentStep('upload')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Back to Upload
              </button>
              <button
                onClick={startBulkProcessing}
                disabled={
                  !columnMappings.some((m) => m.mappedTo === 'product_name') ||
                  isSubmittingJob
                }
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmittingJob ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : useBackgroundProcessing ? (
                  <PlayCircle className="h-5 w-5" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                <span>
                  {isSubmittingJob
                    ? 'Starting Job...'
                    : `Start ${useBackgroundProcessing ? 'Background' : 'Bulk'} Processing (${csvData.length} products)`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {currentStep === 'processing' && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            {useBackgroundProcessing && currentJob ? (
              // Background processing display
              <>
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center mb-4">
                    <PlayCircle
                      className={`h-8 w-8 text-green-600 ${
                        currentJob.status === 'processing'
                          ? 'animate-pulse'
                          : ''
                      }`}
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    🚀 Background Processing Active
                  </h2>
                  <p className="text-gray-600 mb-2">
                    Your job is running on our servers! Navigate freely -
                    processing continues in background.
                  </p>
                  <p className="text-sm text-green-600 font-medium">
                    ✨ This job will keep running even if you close this page!
                  </p>
                </div>

                {/* Background Processing Stats - FIXED */}
                <div className="mb-8 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {getJobStats(currentJob).total}
                    </div>
                    <div className="text-sm text-blue-600">Total Products</div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {getJobStats(currentJob).pending}
                    </div>
                    <div className="text-sm text-yellow-600">Pending</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {getJobStats(currentJob).processing}
                    </div>
                    <div className="text-sm text-indigo-600">Processing</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {getJobStats(currentJob).completed}
                    </div>
                    <div className="text-sm text-green-600">Completed</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {getJobStats(currentJob).failed}
                    </div>
                    <div className="text-sm text-red-600">Failed</div>
                  </div>
                </div>

                {/* Background Progress Bar */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Overall Progress
                    </span>
                    <span className="text-sm text-gray-500">
                      {currentJob.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${currentJob.progress}%` }}
                    ></div>
                  </div>
                  {currentJob.status === 'processing' &&
                    currentJob.estimatedTimeRemaining > 0 && (
                      <div className="mt-2 text-sm text-gray-600 text-center">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Estimated time remaining:{' '}
                        {formatTime(currentJob.estimatedTimeRemaining)}
                        {currentJob.avgProcessingTime > 0 && (
                          <span className="ml-4">
                            Avg: {formatTime(currentJob.avgProcessingTime)}
                            /product
                          </span>
                        )}
                      </div>
                    )}
                </div>

                {/* Background Product Status */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {currentJob.products.map((product, index) => (
                    <div
                      key={product.id}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                        product.status === 'completed'
                          ? 'border-green-200 bg-green-50'
                          : product.status === 'failed'
                            ? 'border-red-200 bg-red-50'
                            : product.status === 'processing'
                              ? 'border-indigo-200 bg-indigo-50'
                              : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            {product.status === 'pending' && (
                              <Clock className="h-5 w-5 text-gray-400" />
                            )}
                            {product.status === 'processing' && (
                              <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                            )}
                            {product.status === 'completed' && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                            {product.status === 'failed' && (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {product.product_name}
                              </div>
                              <div className="text-sm text-gray-600">
                                Platform: {product.platform}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              product.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : product.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : product.status === 'processing'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {product.status === 'pending' && 'Waiting'}
                            {product.status === 'processing' && 'Processing'}
                            {product.status === 'completed' && 'Complete'}
                            {product.status === 'failed' && 'Failed'}
                          </span>
                        </div>
                      </div>
                      {product.error_message && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                          Error: {product.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {currentJob.status === 'completed' && (
                  <div className="mt-8 flex justify-center space-x-4">
                    <button
                      onClick={resetWorkflow}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
                    >
                      Start New Job
                    </button>
                    <button
                      onClick={() => setCurrentStep('results')}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 cursor-pointer"
                    >
                      <Download className="h-5 w-5" />
                      <span>
                        View Results ({getJobStats(currentJob).completed}{' '}
                        completed)
                      </span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              // Frontend processing display
              <>
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center mb-4">
                    <RefreshCw
                      className={`h-8 w-8 text-indigo-600 ${isProcessing ? 'animate-spin' : ''}`}
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    AI Processing in Progress
                  </h2>
                  <p className="text-gray-600">
                    {isProcessing
                      ? 'Generating content for your products...'
                      : 'Processing complete! Review results below.'}
                  </p>
                </div>

                {/* Frontend Processing Stats */}
                <div className="mb-8 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {currentProcessingStats.total}
                    </div>
                    <div className="text-sm text-blue-600">Total Products</div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {currentProcessingStats.pending}
                    </div>
                    <div className="text-sm text-yellow-600">Pending</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {currentProcessingStats.processing}
                    </div>
                    <div className="text-sm text-indigo-600">Processing</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {currentProcessingStats.completed}
                    </div>
                    <div className="text-sm text-green-600">Completed</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {currentProcessingStats.failed}
                    </div>
                    <div className="text-sm text-red-600">Failed</div>
                  </div>
                </div>

                {/* Frontend Progress Bar */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Overall Progress
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round(processingProgress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                  {isProcessing &&
                    currentProcessingStats.estimatedTimeRemaining > 0 && (
                      <div className="mt-2 text-sm text-gray-600 text-center">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Estimated time remaining:{' '}
                        {formatTime(
                          Math.round(
                            currentProcessingStats.estimatedTimeRemaining
                          )
                        )}
                        {currentProcessingStats.avgProcessingTime > 0 && (
                          <span className="ml-4">
                            Avg:{' '}
                            {formatTime(
                              Math.round(
                                currentProcessingStats.avgProcessingTime
                              )
                            )}
                            /product
                          </span>
                        )}
                      </div>
                    )}
                </div>

                {/* Frontend Product Status */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {processingJobs.map((job, index) => (
                    <div
                      key={job.id}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                        job.status === 'completed'
                          ? 'border-green-200 bg-green-50'
                          : job.status === 'failed'
                            ? 'border-red-200 bg-red-50'
                            : job.status === 'processing'
                              ? 'border-indigo-200 bg-indigo-50'
                              : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            {job.status === 'pending' && (
                              <Clock className="h-5 w-5 text-gray-400" />
                            )}
                            {job.status === 'processing' && (
                              <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                            )}
                            {job.status === 'completed' && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                            {job.status === 'failed' && (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {job.productName}
                              </div>
                              <div className="text-sm text-gray-600">
                                Platform: {job.platform} •
                                {job.features && (
                                  <span className="ml-1">
                                    Features: {job.features.substring(0, 50)}
                                    {job.features.length > 50 && '...'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {job.status === 'completed' && job.qualityScore && (
                            <div className="text-center">
                              <div className="text-sm font-medium text-green-600">
                                {job.qualityScore.toFixed(0)}%
                              </div>
                              <div className="text-xs text-green-500">
                                Quality
                              </div>
                            </div>
                          )}

                          {job.processingTime && (
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-600">
                                {formatTime(job.processingTime)}
                              </div>
                              <div className="text-xs text-gray-500">Time</div>
                            </div>
                          )}

                          <div className="text-right min-w-[80px]">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                job.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : job.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : job.status === 'processing'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {job.status === 'pending' && 'Waiting'}
                              {job.status === 'processing' && 'Processing'}
                              {job.status === 'completed' && 'Complete'}
                              {job.status === 'failed' && 'Failed'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {job.error && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                          Error: {job.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {!isProcessing && (
                  <div className="mt-8 flex justify-center space-x-4">
                    <button
                      onClick={resetWorkflow}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
                    >
                      Start Over
                    </button>
                    {currentProcessingStats.completed > 0 && (
                      <button
                        onClick={() => setCurrentStep('results')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 cursor-pointer"
                      >
                        <Download className="h-5 w-5" />
                        <span>
                          View Results ({currentProcessingStats.completed}{' '}
                          completed)
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 4: Results */}
        {currentStep === 'results' && (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="text-center mb-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {useBackgroundProcessing
                  ? '🎉 Background Processing Complete!'
                  : 'Processing Complete!'}
              </h2>
              <p className="text-gray-600 mb-4">
                Successfully processed{' '}
                {useBackgroundProcessing && currentJob
                  ? `${getJobStats(currentJob).completed} out of ${getJobStats(currentJob).total}`
                  : `${currentProcessingStats.completed} out of ${currentProcessingStats.total}`}{' '}
                products
              </p>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {useBackgroundProcessing && currentJob
                      ? getJobStats(currentJob).completed
                      : currentProcessingStats.completed}
                  </div>
                  <div className="text-sm text-gray-500">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {useBackgroundProcessing && currentJob
                      ? getJobStats(currentJob).failed
                      : currentProcessingStats.failed}
                  </div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {useBackgroundProcessing && currentJob
                      ? currentJob.avgProcessingTime > 0
                        ? formatTime(currentJob.avgProcessingTime)
                        : 'N/A'
                      : currentProcessingStats.avgProcessingTime > 0
                        ? formatTime(
                            Math.round(currentProcessingStats.avgProcessingTime)
                          )
                        : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">Avg Time</div>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={downloadResults}
                  disabled={
                    useBackgroundProcessing && currentJob
                      ? getJobStats(currentJob).completed === 0
                      : currentProcessingStats.completed === 0
                  }
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Results CSV</span>
                </button>
                <button
                  onClick={resetWorkflow}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Process New File
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recovery Modal */}
      <RecoveryModal />

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center">
              <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Upgrade Required
              </h2>
              <p className="text-gray-600 mb-6">
                Your current plan doesn't support this many products. Upgrade to
                process larger batches.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleUpgrade}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  View Plans
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
