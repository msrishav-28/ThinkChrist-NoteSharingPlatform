import * as React from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { generateAriaLabel } from "@/lib/utils/accessibility"

interface AccessibleButtonProps extends ButtonProps {
  // Accessibility props
  ariaLabel?: string
  ariaDescribedBy?: string
  ariaExpanded?: boolean
  ariaPressed?: boolean
  ariaHaspopup?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  
  // Loading state
  loading?: boolean
  loadingText?: string
  
  // Icon props for better accessibility
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  
  // Tooltip for additional context
  tooltip?: string
  
  // Action description for screen readers
  action?: string
  target?: string
  context?: string
}

const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    className, 
    children, 
    disabled,
    loading = false,
    loadingText = "Loading...",
    ariaLabel,
    ariaDescribedBy,
    ariaExpanded,
    ariaPressed,
    ariaHaspopup,
    icon,
    iconPosition = 'left',
    tooltip,
    action,
    target,
    context,
    onClick,
    ...props 
  }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false)
    
    // Generate aria-label if not provided but action and target are
    const computedAriaLabel = React.useMemo(() => {
      if (ariaLabel) return ariaLabel
      if (action && target) return generateAriaLabel(action, target, context)
      return undefined
    }, [ariaLabel, action, target, context])
    
    // Handle keyboard interactions
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        setIsPressed(true)
      }
    }
    
    const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        setIsPressed(false)
      }
    }
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return
      onClick?.(e)
    }
    
    const isDisabled = disabled || loading
    
    return (
      <Button
        ref={ref}
        className={cn(
          // Focus styles for better accessibility
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // High contrast mode support
          "contrast-more:border-2 contrast-more:border-current",
          // Reduced motion support
          "motion-reduce:transition-none",
          className
        )}
        disabled={isDisabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        aria-label={computedAriaLabel}
        aria-describedby={ariaDescribedBy}
        aria-expanded={ariaExpanded}
        aria-pressed={ariaPressed !== undefined ? ariaPressed || isPressed : undefined}
        aria-haspopup={ariaHaspopup}
        title={tooltip}
        {...props}
      >
        {loading && (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
            <span className="sr-only">{loadingText}</span>
          </>
        )}
        
        {!loading && icon && iconPosition === 'left' && (
          <span className="mr-2" aria-hidden="true">
            {icon}
          </span>
        )}
        
        <span>{children}</span>
        
        {!loading && icon && iconPosition === 'right' && (
          <span className="ml-2" aria-hidden="true">
            {icon}
          </span>
        )}
      </Button>
    )
  }
)

AccessibleButton.displayName = "AccessibleButton"

export { AccessibleButton, type AccessibleButtonProps }