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
  Star,
  Shield,
  Award,
  Activity,
  Target,
  Rocket,
  Users,
  Settings,
  ChevronRight,
  Database,
  Cpu,
  Timer,
  Globe,
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
  progress?: number
  estimatedTimeRemaining?: number
  avgProcessingTime?: number
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
    color: 'from-gray-400 to-gray-600',
    icon: Sparkles,
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
    color: 'from-blue-500 to-indigo-600',
    icon: Zap,
  },
  premium: {
    name: 'Premium',
    maxBulkProducts: 200,
    monthlyGenerations: 1000,
    price: '$59/month',
    features: [
      'Bulk CSV upload (200 products)',
      'Advanced customization',
      'Batch export',
    ],
    color: 'from-yellow-500 to-orange-600',
    icon: Crown,
  },
  enterprise: {
    name: 'Enterprise',
    maxBulkProducts: 1000,
    monthlyGenerations: 999999,
    price: '$99/month',
    features: [
      'Bulk CSV upload (1000 products)',
      'Priority phone support',
      'Custom templates',
    ],
    color: 'from-purple-500 to-pink-600',
    icon: Rocket,
  },
}

export default function EnhancedBulkCSVUploadPage() {
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

      // Clear any existing polling first
      if (jobPollingInterval) {
        clearInterval(jobPollingInterval)
        setJobPollingInterval(null)
        console.log('🛑 Cleared existing polling interval')
      }

      let pollCount = 0
      const maxPolls = 1000 // Safety limit: stop after ~50 minutes (1000 * 3 seconds)

      const pollJob = async () => {
        pollCount++

        // Safety check: stop polling after max attempts
        if (pollCount > maxPolls) {
          console.log('🛑 Stopping polling - reached maximum attempts')
          if (jobPollingInterval) {
            clearInterval(jobPollingInterval)
            setJobPollingInterval(null)
          }
          return
        }

        try {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (!session?.access_token) {
            console.log('❌ No session, stopping polling')
            if (jobPollingInterval) {
              clearInterval(jobPollingInterval)
              setJobPollingInterval(null)
            }
            return
          }

          const response = await fetch(`/api/bulk-process/status/${jobId}`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })

          if (response.ok) {
            const result = await response.json()

            // Check if job exists and has a status
            if (!result.job || !result.job.status) {
              console.log('🛑 Job not found or no status, stopping polling')
              if (jobPollingInterval) {
                clearInterval(jobPollingInterval)
                setJobPollingInterval(null)
              }
              return
            }

            setCurrentJob(result.job)

            // Stop polling if job is completed or failed
            if (
              result.job.status === 'completed' ||
              result.job.status === 'failed'
            ) {
              console.log(
                '🛑 Job finished:',
                result.job.status,
                '- Stopping polling'
              )

              // Clear the interval immediately
              if (jobPollingInterval) {
                clearInterval(jobPollingInterval)
                setJobPollingInterval(null)
              }

              // Set the step to results if completed
              if (result.job.status === 'completed') {
                setCurrentStep('results')
              }

              // Exit the function to prevent any further polling
              return
            }

            console.log(
              `📊 Poll ${pollCount}: Job status = ${result.job.status}`
            )
          } else {
            console.log('❌ Polling API failed, stopping')
            if (jobPollingInterval) {
              clearInterval(jobPollingInterval)
              setJobPollingInterval(null)
            }
          }
        } catch (error) {
          console.error('❌ Polling error:', error)
          if (jobPollingInterval) {
            clearInterval(jobPollingInterval)
            setJobPollingInterval(null)
          }
        }
      }

      // Start polling immediately, then every 3 seconds
      pollJob()
      const interval = setInterval(pollJob, 3000)
      setJobPollingInterval(interval)

      console.log('🔄 Polling interval started with ID:', interval)
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
        } else {
          console.log('🔍 No active jobs found')
          // Clear any existing polling if no active jobs
          if (jobPollingInterval) {
            clearInterval(jobPollingInterval)
            setJobPollingInterval(null)
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking active jobs:', error)
    }
  }, [
    user,
    supabase,
    startJobPolling,
    useBackgroundProcessing,
    jobPollingInterval,
  ])

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

  // Force stop polling when currentJob becomes completed or failed
  useEffect(() => {
    if (
      currentJob &&
      (currentJob.status === 'completed' || currentJob.status === 'failed')
    ) {
      console.log(
        '🛑 Force stopping polling - job status changed to:',
        currentJob.status
      )
      if (jobPollingInterval) {
        clearInterval(jobPollingInterval)
        setJobPollingInterval(null)
        console.log('🛑 Polling interval cleared via useEffect')
      }
    }
  }, [currentJob?.status, jobPollingInterval])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (jobPollingInterval) {
        clearInterval(jobPollingInterval)
        console.log('🛑 Cleanup: Stopped polling on component unmount')
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
      completedProducts = (currentJob.products || []).filter(
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
    // Stop polling first
    if (jobPollingInterval) {
      clearInterval(jobPollingInterval)
      setJobPollingInterval(null)
      console.log('🛑 Stopped job polling')
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
  const PlanIcon = currentPlanLimits.icon

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
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-lg w-full p-8 shadow-2xl border border-white/20">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Resume Previous Job?
            </h2>
            <p className="text-gray-600 mb-6">
              We found a bulk processing job that was interrupted. Would you
              like to resume where you left off?
            </p>

            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Products:</span>
                  <span className="font-semibold text-gray-900">
                    {recoverySession.processingJobs?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-semibold text-green-600">
                    {completedCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed:</span>
                  <span className="font-semibold text-red-600">
                    {failedCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-semibold text-yellow-600">
                    {pendingCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setCSVData(recoverySession.csvData || [])
                  setColumnMappings(recoverySession.columnMappings || [])
                  setProcessingJobs(recoverySession.processingJobs || [])
                  setCurrentStep(recoverySession.currentStep || 'processing')
                  setCurrentJobId(recoverySession.id)
                  setShowRecoveryModal(false)
                }}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all cursor-pointer"
              >
                Resume Job {pendingCount > 0 && `(${pendingCount} remaining)`}
              </button>
              <button
                onClick={() => {
                  clearSession()
                  setShowRecoveryModal(false)
                  setRecoverySession(null)
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-xl font-semibold transition-colors cursor-pointer"
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
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 shadow-xl border border-white/50 max-w-md mx-auto">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 mb-8">
              Please log in to use the bulk upload feature and start processing
              your product catalogs.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all cursor-pointer shadow-lg"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Enhanced Plan Status Banner */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-4 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`w-8 h-8 bg-gradient-to-r ${currentPlanLimits.color} rounded-lg flex items-center justify-center`}
              >
                <PlanIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg">
                  {currentPlanLimits.name} Plan
                </div>
                <div className="text-indigo-100 text-sm">
                  {currentPlanLimits.maxBulkProducts > 0
                    ? `Up to ${currentPlanLimits.maxBulkProducts} products per upload`
                    : 'Bulk upload not available'}{' '}
                  • {monthlyLimit - monthlyUsage} generations left this month
                </div>
              </div>
            </div>
            {userPlan !== 'enterprise' && (
              <button
                onClick={handleUpgrade}
                className="group bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-2"
              >
                <Crown className="h-4 w-4" />
                <span>Upgrade Plan</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug/Mode Toggle - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">
                    Processing Mode:
                  </span>
                </div>
                <button
                  onClick={() =>
                    setUseBackgroundProcessing(!useBackgroundProcessing)
                  }
                  className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-2 ${
                    useBackgroundProcessing
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  }`}
                >
                  {useBackgroundProcessing ? (
                    <Database className="h-4 w-4" />
                  ) : (
                    <Cpu className="h-4 w-4" />
                  )}
                  <span>
                    {useBackgroundProcessing ? 'Background' : 'Frontend'}
                  </span>
                  <span className="text-xs opacity-75">(Click to toggle)</span>
                </button>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>
                  <strong>Step:</strong> {currentStep} |{' '}
                  <strong>Processing:</strong> {isProcessing ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Jobs:</strong> {processingJobs.length} |
                  {useBackgroundProcessing && (
                    <>
                      <strong>Active Job:</strong>{' '}
                      {currentJob ? currentJob.id.slice(-8) : 'None'}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full px-6 py-3 mb-8">
            <Upload className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-800">
              Bulk Content Generation • Scale your business effortlessly
            </span>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {useBackgroundProcessing ? (
              <>
                Background Bulk
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  Content Generator
                </span>
              </>
            ) : (
              <>
                Bulk Content
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  Generator
                </span>
              </>
            )}
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            {useBackgroundProcessing
              ? 'Upload your CSV and let our servers process everything in the background. Navigate freely - your job keeps running!'
              : 'Upload your product CSV and generate content for multiple products at once with our advanced AI engine.'}
          </p>

          {useBackgroundProcessing && (
            <div className="mt-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200">
                <Globe className="h-4 w-4 mr-2" />✨ Background Processing:
                Never stops when you navigate away!
              </span>
            </div>
          )}
        </div>

        {/* Enhanced Progress Steps */}
        <div className="mb-12">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50">
            <div className="flex items-center justify-between">
              {[
                {
                  key: 'upload',
                  label: 'Upload CSV',
                  icon: Upload,
                  desc: 'Upload your product data',
                },
                {
                  key: 'mapping',
                  label: 'Smart Mapping',
                  icon: Zap,
                  desc: 'AI-powered column detection',
                },
                {
                  key: 'processing',
                  label: useBackgroundProcessing
                    ? 'Background Processing'
                    : 'AI Processing',
                  icon: useBackgroundProcessing ? PlayCircle : RefreshCw,
                  desc: useBackgroundProcessing
                    ? 'Server-side processing'
                    : 'Real-time generation',
                },
                {
                  key: 'results',
                  label: 'Download Results',
                  icon: Download,
                  desc: 'Export your content',
                },
              ].map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === step.key
                const isCompleted =
                  ['upload', 'mapping', 'processing', 'results'].indexOf(
                    currentStep
                  ) > index

                return (
                  <div key={step.key} className="flex items-center">
                    <div className="text-center">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 mb-3 ${
                          isCompleted
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                            : isActive
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-110'
                              : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-7 w-7" />
                        ) : (
                          <Icon
                            className={`h-7 w-7 ${isActive ? 'animate-pulse' : ''}`}
                          />
                        )}
                      </div>
                      <div className="text-center">
                        <div
                          className={`font-semibold transition-colors ${
                            isActive
                              ? 'text-indigo-600'
                              : isCompleted
                                ? 'text-green-600'
                                : 'text-gray-500'
                          }`}
                        >
                          {step.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {step.desc}
                        </div>
                      </div>
                    </div>
                    {index < 3 && (
                      <div className="flex-1 mx-6">
                        <div
                          className={`h-1 rounded-full transition-all duration-500 ${
                            isCompleted
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                              : 'bg-gray-300'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Step 1: Enhanced Upload CSV */}
        {currentStep === 'upload' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                <Upload className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Upload Your Product CSV
              </h2>
              <p className="text-gray-600 mb-6 max-w-3xl mx-auto text-lg">
                Upload your CSV file with product data. Your{' '}
                <span className="font-semibold text-indigo-600">
                  {currentPlanLimits.name}
                </span>{' '}
                plan supports
                {currentPlanLimits.maxBulkProducts > 0
                  ? ` up to ${currentPlanLimits.maxBulkProducts} products per upload.`
                  : ' single product generation only.'}{' '}
                You have{' '}
                <span className="font-semibold text-green-600">
                  {monthlyLimit - monthlyUsage}
                </span>{' '}
                generations remaining this month.
              </p>

              {planLoaded && currentPlanLimits.maxBulkProducts === 0 ? (
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-dashed border-red-300 rounded-2xl p-12 max-w-2xl mx-auto">
                  <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Lock className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-red-900 mb-3">
                    Bulk Upload Not Available
                  </h3>
                  <p className="text-red-700 mb-6">
                    Bulk CSV upload requires a paid plan. Upgrade to unlock
                    batch processing and scale your content creation.
                  </p>
                  <button
                    onClick={handleUpgrade}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-3 rounded-xl font-semibold transition-all cursor-pointer shadow-lg"
                  >
                    Upgrade to Business Plan
                  </button>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  <div className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-2xl p-12 transition-all duration-300 hover:bg-indigo-50/50">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                      disabled={isAnalyzing}
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <FileText className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        {isAnalyzing
                          ? 'Analyzing your CSV...'
                          : 'Click to upload your CSV file'}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Enhanced CSV parsing with intelligent platform detection
                      </p>
                      {isAnalyzing && (
                        <div className="mt-6">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                          <p className="text-indigo-600 font-medium">
                            Processing your data...
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  {csvFile && !isAnalyzing && (
                    <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div>
                          <h4 className="font-bold text-green-900">
                            Upload Successful!
                          </h4>
                          <p className="text-green-700">
                            <strong>{csvFile.name}</strong> - Found{' '}
                            {csvData.length} products ready for processing.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Enhanced Column Mapping */}
        {currentStep === 'mapping' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Smart Column Mapping
                  </h2>
                  <p className="text-gray-600">
                    AI has analyzed your CSV and suggested optimal mappings
                  </p>
                </div>
              </div>
              <button
                onClick={resetWorkflow}
                className="text-gray-600 hover:text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Upload Different File
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {columnMappings.map((mapping, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div>
                      <div className="font-semibold text-gray-900 text-lg mb-2">
                        {mapping.csvColumn}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            mapping.confidence > 0.8
                              ? 'bg-green-500'
                              : mapping.confidence > 0.6
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                        />
                        <span className="text-sm font-medium text-gray-600">
                          AI Confidence: {(mapping.confidence * 100).toFixed(0)}
                          %
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Map to Field
                      </label>
                      <select
                        value={mapping.mappedTo}
                        onChange={(e) =>
                          updateColumnMapping(index, e.target.value as any)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white shadow-sm cursor-pointer"
                      >
                        <option value="ignore">🚫 Ignore</option>
                        <option value="product_name">📦 Product Name</option>
                        <option value="features">✨ Features & Benefits</option>
                        <option value="platform">🛒 Target Platform</option>
                      </select>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Sample Data
                      </div>
                      {csvData[0] && (
                        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg max-w-xs truncate ml-auto">
                          "{csvData[0][mapping.csvColumn] || 'Empty'}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center space-x-6">
              <button
                onClick={() => setCurrentStep('upload')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold transition-colors cursor-pointer flex items-center space-x-2"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                <span>Back to Upload</span>
              </button>
              <button
                onClick={startBulkProcessing}
                disabled={
                  !columnMappings.some((m) => m.mappedTo === 'product_name') ||
                  isSubmittingJob
                }
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-10 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
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

        {/* Step 3: Enhanced Processing */}
        {currentStep === 'processing' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
            {useBackgroundProcessing && currentJob ? (
              // Background processing display
              <>
                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <PlayCircle
                      className={`h-10 w-10 text-white ${
                        currentJob.status === 'processing'
                          ? 'animate-pulse'
                          : ''
                      }`}
                    />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    🚀 Background Processing Active
                  </h2>
                  <div className="max-w-2xl mx-auto">
                    <p className="text-gray-600 mb-3 text-lg">
                      Your job is running on our servers! Navigate freely -
                      processing continues in background.
                    </p>
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full text-sm font-semibold">
                      <Globe className="h-4 w-4 mr-2" />✨ This job will keep
                      running even if you close this page!
                    </div>
                  </div>
                </div>

                {/* Enhanced Background Processing Stats */}
                <div className="mb-10 grid grid-cols-2 md:grid-cols-5 gap-6">
                  {[
                    {
                      label: 'Total Products',
                      value: getJobStats(currentJob).total,
                      color: 'from-blue-500 to-blue-600',
                      icon: Database,
                    },
                    {
                      label: 'Pending',
                      value: getJobStats(currentJob).pending,
                      color: 'from-yellow-500 to-orange-500',
                      icon: Clock,
                    },
                    {
                      label: 'Processing',
                      value: getJobStats(currentJob).processing,
                      color: 'from-indigo-500 to-purple-600',
                      icon: Cpu,
                    },
                    {
                      label: 'Completed',
                      value: getJobStats(currentJob).completed,
                      color: 'from-green-500 to-emerald-600',
                      icon: CheckCircle,
                    },
                    {
                      label: 'Failed',
                      value: getJobStats(currentJob).failed,
                      color: 'from-red-500 to-red-600',
                      icon: XCircle,
                    },
                  ].map((stat, index) => {
                    const Icon = stat.icon
                    return (
                      <div
                        key={index}
                        className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className={`w-10 h-10 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}
                          >
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {stat.value}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          {stat.label}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Enhanced Background Progress Bar */}
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Overall Progress
                    </h3>
                    <span className="text-lg font-bold text-indigo-600">
                      {(currentJob.progress || 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-4 rounded-full transition-all duration-500 ease-out shadow-lg"
                      style={{ width: `${currentJob.progress || 0}%` }}
                    />
                  </div>
                  {currentJob.status === 'processing' &&
                    (currentJob.estimatedTimeRemaining || 0) > 0 && (
                      <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Timer className="h-4 w-4" />
                          <span>
                            ETA:{' '}
                            {formatTime(currentJob.estimatedTimeRemaining || 0)}
                          </span>
                        </div>
                        {(currentJob.avgProcessingTime || 0) > 0 && (
                          <div className="flex items-center space-x-2">
                            <Activity className="h-4 w-4" />
                            <span>
                              Avg:{' '}
                              {formatTime(currentJob.avgProcessingTime || 0)}
                              /product
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                </div>

                {/* Background Product Status */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {(currentJob.products || []).map((product, index) => (
                    <div
                      key={product.id || index}
                      className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                        product.status === 'completed'
                          ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50'
                          : product.status === 'failed'
                            ? 'border-red-200 bg-gradient-to-r from-red-50 to-red-100'
                            : product.status === 'processing'
                              ? 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50'
                              : 'border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              {product.status === 'pending' && (
                                <Clock className="h-6 w-6 text-gray-400" />
                              )}
                              {product.status === 'processing' && (
                                <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                              )}
                              {product.status === 'completed' && (
                                <CheckCircle className="h-6 w-6 text-green-600" />
                              )}
                              {product.status === 'failed' && (
                                <XCircle className="h-6 w-6 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {product.product_name || 'Unknown Product'}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Platform: {product.platform || 'amazon'}
                                {product.features && (
                                  <span className="ml-2">
                                    • Features:{' '}
                                    {product.features.substring(0, 60)}
                                    {product.features.length > 60 && '...'}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {product.status === 'completed' &&
                            product.quality_score && (
                              <div className="text-center">
                                <div className="text-lg font-bold text-green-600">
                                  {product.quality_score.toFixed(0)}%
                                </div>
                                <div className="text-xs text-green-500">
                                  Quality
                                </div>
                              </div>
                            )}

                          <div className="text-right">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                product.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : product.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : product.status === 'processing'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {product.status === 'pending' && '⏳ Waiting'}
                              {product.status === 'processing' &&
                                '⚡ Processing'}
                              {product.status === 'completed' && '✅ Complete'}
                              {product.status === 'failed' && '❌ Failed'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {product.error_message && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg text-sm text-red-700">
                          <strong>Error:</strong> {product.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {currentJob.status === 'completed' && (
                  <div className="mt-10 flex justify-center space-x-6">
                    <button
                      onClick={() => {
                        // Stop polling first
                        if (jobPollingInterval) {
                          clearInterval(jobPollingInterval)
                          setJobPollingInterval(null)
                          console.log(
                            '🛑 Manually stopped polling from completed job'
                          )
                        }
                        resetWorkflow()
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold transition-colors cursor-pointer"
                    >
                      Start New Job
                    </button>
                    <button
                      onClick={() => {
                        // Stop polling before going to results
                        if (jobPollingInterval) {
                          clearInterval(jobPollingInterval)
                          setJobPollingInterval(null)
                          console.log(
                            '🛑 Stopped polling before viewing results'
                          )
                        }
                        setCurrentStep('results')
                      }}
                      className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-10 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
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
              // Frontend processing display - Enhanced
              <>
                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <RefreshCw
                      className={`h-10 w-10 text-white ${isProcessing ? 'animate-spin' : ''}`}
                    />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    AI Processing in Progress
                  </h2>
                  <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                    {isProcessing
                      ? 'Our advanced AI is generating high-quality content for your products...'
                      : 'Processing complete! Review your results below.'}
                  </p>
                </div>

                {/* Enhanced Frontend Processing Stats */}
                <div className="mb-10 grid grid-cols-2 md:grid-cols-5 gap-6">
                  {[
                    {
                      label: 'Total Products',
                      value: currentProcessingStats.total,
                      color: 'from-blue-500 to-blue-600',
                      icon: Database,
                    },
                    {
                      label: 'Pending',
                      value: currentProcessingStats.pending,
                      color: 'from-yellow-500 to-orange-500',
                      icon: Clock,
                    },
                    {
                      label: 'Processing',
                      value: currentProcessingStats.processing,
                      color: 'from-indigo-500 to-purple-600',
                      icon: Cpu,
                    },
                    {
                      label: 'Completed',
                      value: currentProcessingStats.completed,
                      color: 'from-green-500 to-emerald-600',
                      icon: CheckCircle,
                    },
                    {
                      label: 'Failed',
                      value: currentProcessingStats.failed,
                      color: 'from-red-500 to-red-600',
                      icon: XCircle,
                    },
                  ].map((stat, index) => {
                    const Icon = stat.icon
                    return (
                      <div
                        key={index}
                        className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className={`w-10 h-10 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}
                          >
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {stat.value}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          {stat.label}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Enhanced Frontend Progress Bar */}
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Overall Progress
                    </h3>
                    <span className="text-lg font-bold text-indigo-600">
                      {Math.round(processingProgress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500 ease-out shadow-lg"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                  {isProcessing &&
                    currentProcessingStats.estimatedTimeRemaining > 0 && (
                      <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Timer className="h-4 w-4" />
                          <span>
                            ETA:{' '}
                            {formatTime(
                              Math.round(
                                currentProcessingStats.estimatedTimeRemaining
                              )
                            )}
                          </span>
                        </div>
                        {currentProcessingStats.avgProcessingTime > 0 && (
                          <div className="flex items-center space-x-2">
                            <Activity className="h-4 w-4" />
                            <span>
                              Avg:{' '}
                              {formatTime(
                                Math.round(
                                  currentProcessingStats.avgProcessingTime
                                )
                              )}
                              /product
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                </div>

                {/* Enhanced Frontend Product Status */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {processingJobs.map((job, index) => (
                    <div
                      key={job.id}
                      className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                        job.status === 'completed'
                          ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50'
                          : job.status === 'failed'
                            ? 'border-red-200 bg-gradient-to-r from-red-50 to-red-100'
                            : job.status === 'processing'
                              ? 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50'
                              : 'border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              {job.status === 'pending' && (
                                <Clock className="h-6 w-6 text-gray-400" />
                              )}
                              {job.status === 'processing' && (
                                <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                              )}
                              {job.status === 'completed' && (
                                <CheckCircle className="h-6 w-6 text-green-600" />
                              )}
                              {job.status === 'failed' && (
                                <XCircle className="h-6 w-6 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {job.productName}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Platform: {job.platform}
                                {job.features && (
                                  <span className="ml-2">
                                    • Features: {job.features.substring(0, 60)}
                                    {job.features.length > 60 && '...'}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {job.status === 'completed' && job.qualityScore && (
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">
                                {job.qualityScore.toFixed(0)}%
                              </div>
                              <div className="text-xs text-green-500">
                                Quality
                              </div>
                            </div>
                          )}

                          {job.processingTime && (
                            <div className="text-center">
                              <div className="text-sm font-semibold text-gray-600">
                                {formatTime(job.processingTime)}
                              </div>
                              <div className="text-xs text-gray-500">Time</div>
                            </div>
                          )}

                          <div className="text-right">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                job.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : job.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : job.status === 'processing'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {job.status === 'pending' && '⏳ Waiting'}
                              {job.status === 'processing' && '⚡ Processing'}
                              {job.status === 'completed' && '✅ Complete'}
                              {job.status === 'failed' && '❌ Failed'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {job.error && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg text-sm text-red-700">
                          <strong>Error:</strong> {job.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {!isProcessing && (
                  <div className="mt-10 flex justify-center space-x-6">
                    <button
                      onClick={resetWorkflow}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold transition-colors cursor-pointer"
                    >
                      Start Over
                    </button>
                    {currentProcessingStats.completed > 0 && (
                      <button
                        onClick={() => setCurrentStep('results')}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-10 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
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

        {/* Step 4: Enhanced Results */}
        {currentStep === 'results' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {useBackgroundProcessing
                  ? '🎉 Background Processing Complete!'
                  : '🎉 Processing Complete!'}
              </h2>
              <p className="text-gray-600 mb-6 text-lg">
                Successfully processed{' '}
                <span className="font-bold text-green-600">
                  {useBackgroundProcessing && currentJob
                    ? `${getJobStats(currentJob).completed} out of ${getJobStats(currentJob).total}`
                    : `${currentProcessingStats.completed} out of ${currentProcessingStats.total}`}
                </span>{' '}
                products with AI-powered content generation
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-10">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {useBackgroundProcessing && currentJob
                      ? getJobStats(currentJob).completed
                      : currentProcessingStats.completed}
                  </div>
                  <div className="text-sm font-medium text-green-700">
                    Successfully Completed
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {useBackgroundProcessing && currentJob
                      ? getJobStats(currentJob).failed
                      : currentProcessingStats.failed}
                  </div>
                  <div className="text-sm font-medium text-red-700">
                    Failed to Process
                  </div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                  <div className="text-3xl font-bold text-indigo-600 mb-2">
                    {useBackgroundProcessing && currentJob
                      ? (currentJob.avgProcessingTime || 0) > 0
                        ? formatTime(currentJob.avgProcessingTime || 0)
                        : 'N/A'
                      : currentProcessingStats.avgProcessingTime > 0
                        ? formatTime(
                            Math.round(currentProcessingStats.avgProcessingTime)
                          )
                        : 'N/A'}
                  </div>
                  <div className="text-sm font-medium text-indigo-700">
                    Average Processing Time
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-6">
                <button
                  onClick={downloadResults}
                  disabled={
                    useBackgroundProcessing && currentJob
                      ? getJobStats(currentJob).completed === 0
                      : currentProcessingStats.completed === 0
                  }
                  className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-10 py-4 rounded-xl font-bold transition-all flex items-center space-x-3 cursor-pointer disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Results CSV</span>
                </button>
                <button
                  onClick={resetWorkflow}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-4 rounded-xl font-bold transition-colors cursor-pointer"
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

      {/* Enhanced Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-lg w-full p-8 shadow-2xl border border-white/20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Upgrade Required
              </h2>
              <p className="text-gray-600 mb-8">
                Your current plan doesn't support this many products. Upgrade to
                process larger batches and unlock the full power of bulk content
                generation.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={handleUpgrade}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all cursor-pointer"
                >
                  View Plans
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
