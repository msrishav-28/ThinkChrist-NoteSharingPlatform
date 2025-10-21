/**
 * Accessibility utilities for WCAG compliance
 */

// Screen reader only text utility
export function srOnly(text: string): string {
  return `<span class="sr-only">${text}</span>`
}

// Generate accessible IDs
export function generateId(prefix: string = 'element'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

// Announce to screen readers
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// Focus management utilities
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>
  
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]
  
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }
  }
  
  element.addEventListener('keydown', handleTabKey)
  
  // Focus first element
  firstElement?.focus()
  
  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey)
  }
}

// Skip link functionality
export function createSkipLink(targetId: string, text: string = 'Skip to main content') {
  const skipLink = document.createElement('a')
  skipLink.href = `#${targetId}`
  skipLink.textContent = text
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
  
  skipLink.addEventListener('click', (e) => {
    e.preventDefault()
    const target = document.getElementById(targetId)
    if (target) {
      // Make target focusable if it isn't already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1')
      }
      target.focus()
      target.scrollIntoView({ behavior: 'smooth' })
    }
  })
  
  return skipLink
}

// Initialize skip links for the page
export function initializeSkipLinks() {
  const skipLinksContainer = document.createElement('div')
  skipLinksContainer.className = 'skip-links'
  
  const skipLinks = [
    createSkipLink('main-content', 'Skip to main content'),
    createSkipLink('main-navigation', 'Skip to navigation'),
    createSkipLink('search', 'Skip to search')
  ]
  
  skipLinks.forEach(link => skipLinksContainer.appendChild(link))
  
  // Insert at the beginning of the body
  document.body.insertBefore(skipLinksContainer, document.body.firstChild)
}

// Color contrast utilities
export function getContrastRatio(color1: string, color2: string): number {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd want a more robust color parsing library
  const getLuminance = (color: string): number => {
    // This is a simplified version - you'd want proper color parsing
    const rgb = color.match(/\d+/g)
    if (!rgb) return 0
    
    const [r, g, b] = rgb.map(c => {
      const val = parseInt(c) / 255
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (brightest + 0.05) / (darkest + 0.05)
}

// Check if contrast meets WCAG standards
export function meetsContrastRequirement(
  color1: string, 
  color2: string, 
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(color1, color2)
  
  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7
  } else {
    return size === 'large' ? ratio >= 3 : ratio >= 4.5
  }
}

// Keyboard navigation helpers
export function isNavigationKey(key: string): boolean {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(key)
}

export function isActionKey(key: string): boolean {
  return ['Enter', ' ', 'Space'].includes(key)
}

// ARIA label generators
export function generateAriaLabel(
  action: string,
  target: string,
  context?: string
): string {
  let label = `${action} ${target}`
  if (context) {
    label += ` ${context}`
  }
  return label
}

// Form accessibility helpers
export function associateFieldWithError(fieldId: string, errorId: string) {
  const field = document.getElementById(fieldId)
  const error = document.getElementById(errorId)
  
  if (field && error) {
    field.setAttribute('aria-describedby', errorId)
    field.setAttribute('aria-invalid', 'true')
  }
}

export function clearFieldError(fieldId: string, errorId: string) {
  const field = document.getElementById(fieldId)
  
  if (field) {
    field.removeAttribute('aria-describedby')
    field.removeAttribute('aria-invalid')
  }
}

// Reduced motion detection
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// High contrast detection
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches
}

// Focus visible utilities
export function addFocusVisiblePolyfill() {
  // Simple focus-visible polyfill
  let hadKeyboardEvent = true
  
  const keyboardThrottleTimeout = 100
  let keyboardThrottleTimeoutID = 0
  
  function onPointerDown() {
    hadKeyboardEvent = false
  }
  
  function onKeyDown(e: KeyboardEvent) {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return
    }
    
    hadKeyboardEvent = true
  }
  
  function onFocus(e: FocusEvent) {
    if (hadKeyboardEvent || (e.target as HTMLElement).matches(':focus-visible')) {
      (e.target as HTMLElement).classList.add('focus-visible')
    }
  }
  
  function onBlur(e: FocusEvent) {
    (e.target as HTMLElement).classList.remove('focus-visible')
  }
  
  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('mousedown', onPointerDown, true)
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('touchstart', onPointerDown, true)
  document.addEventListener('focus', onFocus, true)
  document.addEventListener('blur', onBlur, true)
}

// Live region utilities
export function createLiveRegion(
  id: string,
  level: 'polite' | 'assertive' = 'polite'
): HTMLElement {
  const existing = document.getElementById(id)
  if (existing) return existing
  
  const liveRegion = document.createElement('div')
  liveRegion.id = id
  liveRegion.setAttribute('aria-live', level)
  liveRegion.setAttribute('aria-atomic', 'true')
  liveRegion.className = 'sr-only'
  
  document.body.appendChild(liveRegion)
  return liveRegion
}

export function updateLiveRegion(id: string, message: string) {
  const liveRegion = document.getElementById(id)
  if (liveRegion) {
    liveRegion.textContent = message
  }
}

// Enhanced keyboard navigation for complex components
export function enhanceKeyboardNavigation(container: HTMLElement) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="menuitem"], [role="option"]'
  ) as NodeListOf<HTMLElement>
  
  const handleKeyDown = (e: KeyboardEvent) => {
    const currentIndex = Array.from(focusableElements).indexOf(e.target as HTMLElement)
    
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault()
        const nextIndex = (currentIndex + 1) % focusableElements.length
        focusableElements[nextIndex]?.focus()
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault()
        const prevIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length
        focusableElements[prevIndex]?.focus()
        break
      case 'Home':
        e.preventDefault()
        focusableElements[0]?.focus()
        break
      case 'End':
        e.preventDefault()
        focusableElements[focusableElements.length - 1]?.focus()
        break
    }
  }
  
  container.addEventListener('keydown', handleKeyDown)
  
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

// ARIA live region management
export class LiveRegionManager {
  private regions: Map<string, HTMLElement> = new Map()
  
  createRegion(id: string, level: 'polite' | 'assertive' = 'polite'): HTMLElement {
    if (this.regions.has(id)) {
      return this.regions.get(id)!
    }
    
    const region = createLiveRegion(id, level)
    this.regions.set(id, region)
    return region
  }
  
  announce(message: string, regionId: string = 'default-announcements', level: 'polite' | 'assertive' = 'polite') {
    let region = this.regions.get(regionId)
    if (!region) {
      region = this.createRegion(regionId, level)
    }
    
    updateLiveRegion(regionId, message)
  }
  
  clear(regionId: string) {
    const region = this.regions.get(regionId)
    if (region) {
      region.textContent = ''
    }
  }
  
  cleanup() {
    this.regions.forEach(region => {
      if (region.parentNode) {
        region.parentNode.removeChild(region)
      }
    })
    this.regions.clear()
  }
}

// Global live region manager instance
export const liveRegionManager = new LiveRegionManager()

// Enhanced focus management for modals and overlays
export function manageFocusForModal(modalElement: HTMLElement) {
  const previouslyFocused = document.activeElement as HTMLElement
  
  // Focus the modal
  modalElement.focus()
  
  // Trap focus within modal
  const cleanup = trapFocus(modalElement)
  
  // Return focus management functions
  return {
    cleanup: () => {
      cleanup()
      // Return focus to previously focused element
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }
}

// Accessible tooltip management
export function createAccessibleTooltip(
  trigger: HTMLElement, 
  content: string, 
  options: { placement?: 'top' | 'bottom' | 'left' | 'right' } = {}
) {
  const tooltipId = generateId('tooltip')
  const tooltip = document.createElement('div')
  
  tooltip.id = tooltipId
  tooltip.textContent = content
  tooltip.className = 'absolute z-50 px-2 py-1 text-sm bg-popover text-popover-foreground border rounded-md shadow-md'
  tooltip.role = 'tooltip'
  tooltip.style.display = 'none'
  
  // Associate tooltip with trigger
  trigger.setAttribute('aria-describedby', tooltipId)
  
  const showTooltip = () => {
    tooltip.style.display = 'block'
    document.body.appendChild(tooltip)
    
    // Position tooltip
    const triggerRect = trigger.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    
    switch (options.placement || 'top') {
      case 'top':
        tooltip.style.left = `${triggerRect.left + (triggerRect.width - tooltipRect.width) / 2}px`
        tooltip.style.top = `${triggerRect.top - tooltipRect.height - 8}px`
        break
      case 'bottom':
        tooltip.style.left = `${triggerRect.left + (triggerRect.width - tooltipRect.width) / 2}px`
        tooltip.style.top = `${triggerRect.bottom + 8}px`
        break
      case 'left':
        tooltip.style.left = `${triggerRect.left - tooltipRect.width - 8}px`
        tooltip.style.top = `${triggerRect.top + (triggerRect.height - tooltipRect.height) / 2}px`
        break
      case 'right':
        tooltip.style.left = `${triggerRect.right + 8}px`
        tooltip.style.top = `${triggerRect.top + (triggerRect.height - tooltipRect.height) / 2}px`
        break
    }
  }
  
  const hideTooltip = () => {
    tooltip.style.display = 'none'
    if (tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip)
    }
  }
  
  // Event listeners
  trigger.addEventListener('mouseenter', showTooltip)
  trigger.addEventListener('mouseleave', hideTooltip)
  trigger.addEventListener('focus', showTooltip)
  trigger.addEventListener('blur', hideTooltip)
  
  // Cleanup function
  return () => {
    trigger.removeEventListener('mouseenter', showTooltip)
    trigger.removeEventListener('mouseleave', hideTooltip)
    trigger.removeEventListener('focus', showTooltip)
    trigger.removeEventListener('blur', hideTooltip)
    trigger.removeAttribute('aria-describedby')
    hideTooltip()
  }
}

// Accessible notification system
export function createAccessibleNotification(
  message: string, 
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  options: { 
    duration?: number
    persistent?: boolean
    actions?: Array<{ label: string, action: () => void }>
  } = {}
) {
  const notification = document.createElement('div')
  const notificationId = generateId('notification')
  
  notification.id = notificationId
  notification.role = 'alert'
  notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite')
  notification.className = `fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm ${
    type === 'success' ? 'bg-green-100 text-green-800 border-green-200' :
    type === 'error' ? 'bg-red-100 text-red-800 border-red-200' :
    type === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
    'bg-blue-100 text-blue-800 border-blue-200'
  }`
  
  const messageElement = document.createElement('p')
  messageElement.textContent = message
  notification.appendChild(messageElement)
  
  // Add actions if provided
  if (options.actions && options.actions.length > 0) {
    const actionsContainer = document.createElement('div')
    actionsContainer.className = 'mt-2 flex gap-2'
    
    options.actions.forEach(({ label, action }) => {
      const button = document.createElement('button')
      button.textContent = label
      button.className = 'px-2 py-1 text-sm rounded border bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
      button.addEventListener('click', () => {
        action()
        removeNotification()
      })
      actionsContainer.appendChild(button)
    })
    
    notification.appendChild(actionsContainer)
  }
  
  const removeNotification = () => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification)
    }
  }
  
  // Add close button if not persistent
  if (!options.persistent) {
    const closeButton = document.createElement('button')
    closeButton.innerHTML = '×'
    closeButton.className = 'absolute top-2 right-2 text-lg leading-none hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
    closeButton.setAttribute('aria-label', 'Close notification')
    closeButton.addEventListener('click', removeNotification)
    notification.appendChild(closeButton)
  }
  
  // Add to DOM
  document.body.appendChild(notification)
  
  // Auto-remove after duration
  if (!options.persistent && options.duration !== 0) {
    setTimeout(removeNotification, options.duration || 5000)
  }
  
  return {
    remove: removeNotification,
    element: notification
  }
}

// Form validation accessibility helpers
export function enhanceFormAccessibility(form: HTMLFormElement) {
  const inputs = form.querySelectorAll('input, select, textarea') as NodeListOf<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  
  inputs.forEach(input => {
    // Add aria-required for required fields
    if (input.hasAttribute('required')) {
      input.setAttribute('aria-required', 'true')
    }
    
    // Associate labels properly
    const label = form.querySelector(`label[for="${input.id}"]`) as HTMLLabelElement
    if (!label && input.id) {
      // Look for label containing the input
      const containingLabel = input.closest('label') as HTMLLabelElement
      if (containingLabel) {
        containingLabel.setAttribute('for', input.id)
      }
    }
    
    // Add validation message containers
    if (!input.getAttribute('aria-describedby')) {
      const errorId = `${input.id}-error`
      const errorElement = document.createElement('div')
      errorElement.id = errorId
      errorElement.className = 'text-sm text-red-600 mt-1'
      errorElement.setAttribute('aria-live', 'polite')
      errorElement.style.display = 'none'
      
      input.parentNode?.insertBefore(errorElement, input.nextSibling)
      input.setAttribute('aria-describedby', errorId)
    }
  })
  
  // Enhanced form submission handling
  form.addEventListener('submit', (e) => {
    let hasErrors = false
    
    inputs.forEach(input => {
      const errorElement = document.getElementById(`${input.id}-error`)
      if (errorElement) {
        errorElement.style.display = 'none'
        errorElement.textContent = ''
        input.removeAttribute('aria-invalid')
      }
      
      // Basic validation
      if (input.hasAttribute('required') && !input.value.trim()) {
        hasErrors = true
        if (errorElement) {
          errorElement.textContent = 'This field is required'
          errorElement.style.display = 'block'
          input.setAttribute('aria-invalid', 'true')
        }
      }
    })
    
    if (hasErrors) {
      e.preventDefault()
      // Focus first error
      const firstError = form.querySelector('[aria-invalid="true"]') as HTMLElement
      if (firstError) {
        firstError.focus()
      }
    }
  })
}