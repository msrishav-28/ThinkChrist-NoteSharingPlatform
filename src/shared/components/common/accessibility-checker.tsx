'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Keyboard, 
  MousePointer,
  Volume2,
  Contrast,
  Zap
} from 'lucide-react'
import { 
  meetsContrastRequirement, 
  prefersReducedMotion, 
  prefersHighContrast 
} from '@/lib/utils/accessibility'

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info'
  category: 'keyboard' | 'screen-reader' | 'color-contrast' | 'focus' | 'structure'
  message: string
  element?: string
  suggestion?: string
}

interface AccessibilityCheckerProps {
  targetSelector?: string
  showDetails?: boolean
}

export function AccessibilityChecker({ 
  targetSelector = 'body', 
  showDetails = false 
}: AccessibilityCheckerProps) {
  const [issues, setIssues] = useState<AccessibilityIssue[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [score, setScore] = useState(0)

  const runAccessibilityCheck = () => {
    setIsChecking(true)
    const foundIssues: AccessibilityIssue[] = []
    const targetElement = document.querySelector(targetSelector)

    if (!targetElement) {
      foundIssues.push({
        type: 'error',
        category: 'structure',
        message: 'Target element not found',
        suggestion: 'Ensure the target selector is valid'
      })
      setIssues(foundIssues)
      setIsChecking(false)
      return
    }

    // Check for missing alt text on images
    const images = targetElement.querySelectorAll('img')
    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-hidden')) {
        foundIssues.push({
          type: 'error',
          category: 'screen-reader',
          message: `Image missing alt text`,
          element: `img:nth-child(${index + 1})`,
          suggestion: 'Add descriptive alt text or aria-hidden="true" for decorative images'
        })
      }
    })

    // Check for buttons without accessible names
    const buttons = targetElement.querySelectorAll('button, [role="button"]')
    buttons.forEach((button, index) => {
      const hasAccessibleName = button.textContent?.trim() || 
                               button.getAttribute('aria-label') || 
                               button.getAttribute('aria-labelledby') ||
                               button.querySelector('img')?.alt

      if (!hasAccessibleName) {
        foundIssues.push({
          type: 'error',
          category: 'screen-reader',
          message: `Button without accessible name`,
          element: `button:nth-child(${index + 1})`,
          suggestion: 'Add aria-label, visible text, or aria-labelledby'
        })
      }
    })

    // Check for form inputs without labels
    const inputs = targetElement.querySelectorAll('input, select, textarea')
    inputs.forEach((input, index) => {
      const hasLabel = input.getAttribute('aria-label') ||
                      input.getAttribute('aria-labelledby') ||
                      document.querySelector(`label[for="${input.id}"]`) ||
                      input.closest('label')

      if (!hasLabel && (input as HTMLInputElement).type !== 'hidden') {
        foundIssues.push({
          type: 'error',
          category: 'screen-reader',
          message: `Form input without label`,
          element: `${input.tagName.toLowerCase()}:nth-child(${index + 1})`,
          suggestion: 'Add a label element or aria-label attribute'
        })
      }
    })

    // Check for missing focus indicators
    const focusableElements = targetElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    let focusableWithoutIndicator = 0
    focusableElements.forEach((element) => {
      const styles = window.getComputedStyle(element, ':focus-visible')
      if (!styles.outline && !styles.boxShadow && !styles.border) {
        focusableWithoutIndicator++
      }
    })

    if (focusableWithoutIndicator > 0) {
      foundIssues.push({
        type: 'warning',
        category: 'focus',
        message: `${focusableWithoutIndicator} focusable elements may lack focus indicators`,
        suggestion: 'Ensure all interactive elements have visible focus indicators'
      })
    }

    // Check for missing heading structure
    const headings = targetElement.querySelectorAll('h1, h2, h3, h4, h5, h6')
    if (headings.length === 0) {
      foundIssues.push({
        type: 'warning',
        category: 'structure',
        message: 'No headings found',
        suggestion: 'Add heading elements to create a logical document structure'
      })
    } else {
      // Check heading hierarchy
      let previousLevel = 0
      headings.forEach((heading) => {
        const level = parseInt(heading.tagName.charAt(1))
        if (level > previousLevel + 1) {
          foundIssues.push({
            type: 'warning',
            category: 'structure',
            message: `Heading level skipped (h${previousLevel} to h${level})`,
            suggestion: 'Use heading levels in sequential order'
          })
        }
        previousLevel = level
      })
    }

    // Check for missing landmarks
    const landmarks = targetElement.querySelectorAll('main, nav, aside, section, header, footer, [role="main"], [role="navigation"], [role="complementary"], [role="banner"], [role="contentinfo"]')
    if (landmarks.length === 0) {
      foundIssues.push({
        type: 'info',
        category: 'structure',
        message: 'No landmark elements found',
        suggestion: 'Add semantic HTML5 elements or ARIA landmarks for better navigation'
      })
    }

    // Check for color contrast (simplified check)
    const textElements = targetElement.querySelectorAll('p, span, div, a, button, h1, h2, h3, h4, h5, h6')
    let contrastIssues = 0
    
    textElements.forEach((element) => {
      const styles = window.getComputedStyle(element)
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      
      // Simple contrast check (would need more sophisticated implementation for production)
      if (color && backgroundColor && color !== backgroundColor) {
        try {
          if (!meetsContrastRequirement(color, backgroundColor)) {
            contrastIssues++
          }
        } catch (error) {
          // Ignore contrast check errors for now
        }
      }
    })

    if (contrastIssues > 0) {
      foundIssues.push({
        type: 'warning',
        category: 'color-contrast',
        message: `${contrastIssues} elements may have insufficient color contrast`,
        suggestion: 'Ensure text has sufficient contrast ratio (4.5:1 for normal text, 3:1 for large text)'
      })
    }

    // Check for keyboard traps
    const tabIndexElements = targetElement.querySelectorAll('[tabindex]')
    tabIndexElements.forEach((element) => {
      const tabIndex = parseInt(element.getAttribute('tabindex') || '0')
      if (tabIndex > 0) {
        foundIssues.push({
          type: 'warning',
          category: 'keyboard',
          message: 'Positive tabindex found',
          element: element.tagName.toLowerCase(),
          suggestion: 'Avoid positive tabindex values; use 0 or -1 instead'
        })
      }
    })

    // Calculate accessibility score
    const totalChecks = 10 // Total number of checks performed
    const errorWeight = 3
    const warningWeight = 1
    const errors = foundIssues.filter(issue => issue.type === 'error').length
    const warnings = foundIssues.filter(issue => issue.type === 'warning').length
    
    const deductions = (errors * errorWeight) + (warnings * warningWeight)
    const calculatedScore = Math.max(0, Math.min(100, 100 - (deductions * 5)))

    setScore(calculatedScore)
    setIssues(foundIssues)
    setIsChecking(false)
  }

  useEffect(() => {
    // Run initial check
    const timer = setTimeout(runAccessibilityCheck, 1000)
    return () => clearTimeout(timer)
  }, [targetSelector])

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default'
    if (score >= 70) return 'secondary'
    return 'destructive'
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'keyboard': return <Keyboard className="h-4 w-4" />
      case 'screen-reader': return <Volume2 className="h-4 w-4" />
      case 'color-contrast': return <Contrast className="h-4 w-4" />
      case 'focus': return <Eye className="h-4 w-4" />
      case 'structure': return <Zap className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-500" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  if (!showDetails && issues.length === 0) {
    return null
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Accessibility Check</span>
          <div className="flex items-center gap-2">
            <Badge variant={getScoreBadgeVariant(score)} className={getScoreColor(score)}>
              Score: {score}/100
            </Badge>
            <Button 
              onClick={runAccessibilityCheck} 
              disabled={isChecking}
              size="sm"
              variant="outline"
            >
              {isChecking ? 'Checking...' : 'Recheck'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* User Preferences */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <MousePointer className="h-4 w-4" />
            <span className="text-sm">
              Reduced Motion: {prefersReducedMotion() ? 'On' : 'Off'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Contrast className="h-4 w-4" />
            <span className="text-sm">
              High Contrast: {prefersHighContrast() ? 'On' : 'Off'}
            </span>
          </div>
        </div>

        {/* Issues List */}
        {issues.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-semibold">Issues Found ({issues.length})</h4>
            {issues.map((issue, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getIssueIcon(issue.type)}
                  {getCategoryIcon(issue.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{issue.message}</p>
                  {issue.element && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Element: {issue.element}
                    </p>
                  )}
                  {issue.suggestion && (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 {issue.suggestion}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h4 className="font-semibold text-green-600">No accessibility issues found!</h4>
            <p className="text-sm text-muted-foreground mt-2">
              The checked elements appear to follow accessibility best practices.
            </p>
          </div>
        )}

        {/* Quick Tips */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Quick Accessibility Tips
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Use semantic HTML elements (header, nav, main, footer)</li>
            <li>• Provide alt text for images</li>
            <li>• Ensure sufficient color contrast (4.5:1 ratio)</li>
            <li>• Make all interactive elements keyboard accessible</li>
            <li>• Use proper heading hierarchy (h1, h2, h3...)</li>
            <li>• Test with screen readers and keyboard navigation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// Development-only component
export function AccessibilityDevTools() {
  const [isVisible, setIsVisible] = useState(false)

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      <Button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50"
        size="sm"
        variant="outline"
      >
        A11y Check
      </Button>
      
      {isVisible && (
        <div className="fixed inset-4 z-50 bg-background border rounded-lg shadow-lg overflow-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Accessibility Checker</h2>
              <Button onClick={() => setIsVisible(false)} variant="ghost" size="sm">
                ×
              </Button>
            </div>
            <AccessibilityChecker showDetails={true} />
          </div>
        </div>
      )}
    </>
  )
}