import * as React from "react"
import { cn } from "@/lib/utils"
import { generateId, associateFieldWithError, clearFieldError } from "@/lib/utils/accessibility"

// Form Context
interface FormContextValue {
  errors: Record<string, string>
  setError: (field: string, error: string) => void
  clearError: (field: string) => void
  isSubmitting: boolean
}

const FormContext = React.createContext<FormContextValue | undefined>(undefined)

export function useFormContext() {
  const context = React.useContext(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a Form component')
  }
  return context
}

// Form Component
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>
  children: React.ReactNode
}

export function Form({ onSubmit, children, className, ...props }: FormProps) {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  const setError = React.useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [])
  
  const clearError = React.useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onSubmit(e)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const contextValue: FormContextValue = {
    errors,
    setError,
    clearError,
    isSubmitting
  }
  
  return (
    <FormContext.Provider value={contextValue}>
      <form
        onSubmit={handleSubmit}
        className={cn("space-y-4", className)}
        noValidate
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}

// Form Field Component
interface FormFieldProps {
  name: string
  label: string
  required?: boolean
  description?: string
  children: React.ReactElement
  className?: string
}

export function FormField({ 
  name, 
  label, 
  required = false, 
  description, 
  children, 
  className 
}: FormFieldProps) {
  const { errors } = useFormContext()
  const fieldId = React.useMemo(() => generateId(`field-${name}`), [name])
  const errorId = React.useMemo(() => generateId(`error-${name}`), [name])
  const descriptionId = React.useMemo(() => generateId(`desc-${name}`), [name])
  
  const error = errors[name]
  const hasError = Boolean(error)
  
  // Associate field with error when error changes
  React.useEffect(() => {
    if (hasError) {
      associateFieldWithError(fieldId, errorId)
    } else {
      clearFieldError(fieldId, errorId)
    }
  }, [hasError, fieldId, errorId])
  
  // Clone child element with accessibility props
  const childWithProps = React.cloneElement(children, {
    id: fieldId,
    name,
    'aria-required': required,
    'aria-invalid': hasError,
    'aria-describedby': [
      description ? descriptionId : null,
      hasError ? errorId : null
    ].filter(Boolean).join(' ') || undefined,
    className: cn(
      children.props.className,
      hasError && "border-destructive focus:border-destructive"
    )
  })
  
  return (
    <div className={cn("space-y-2", className)}>
      <label 
        htmlFor={fieldId}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          hasError && "text-destructive"
        )}
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      {description && (
        <p 
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}
      
      {childWithProps}
      
      {hasError && (
        <p 
          id={errorId}
          className="text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
}

// Form Submit Button
interface FormSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  loadingText?: string
}

export function FormSubmit({ 
  children, 
  loadingText = "Submitting...", 
  className, 
  ...props 
}: FormSubmitProps) {
  const { isSubmitting } = useFormContext()
  
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "h-10 px-4 py-2",
        className
      )}
      {...props}
    >
      {isSubmitting && (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
          <span className="sr-only">{loadingText}</span>
        </>
      )}
      <span>{isSubmitting ? loadingText : children}</span>
    </button>
  )
}

// Fieldset for grouping related fields
interface FieldsetProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  legend: string
  description?: string
  children: React.ReactNode
}

export function Fieldset({ legend, description, children, className, ...props }: FieldsetProps) {
  const legendId = React.useMemo(() => generateId('legend'), [])
  const descriptionId = React.useMemo(() => generateId('fieldset-desc'), [])
  
  return (
    <fieldset
      className={cn("space-y-4 border rounded-lg p-4", className)}
      aria-labelledby={legendId}
      aria-describedby={description ? descriptionId : undefined}
      {...props}
    >
      <legend id={legendId} className="text-lg font-semibold px-2">
        {legend}
      </legend>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {children}
    </fieldset>
  )
}