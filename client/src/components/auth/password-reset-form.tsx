import * as React from "react"
import { Eye, EyeOff, Check, X, ArrowLeft, Mail, KeyRound, CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/field-label"



// Form validation schema
interface ResetRequestFormData {
  email: string
}

interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  form?: string
}

interface PasswordStrength {
  score: number // 0-4
  label: string
  color: string
}

export interface PasswordResetFormProps {
  /** Reset token from URL (switches to reset mode if provided) */
  token?: string
  /** Callback when reset request is submitted (request mode) */
  onRequestReset?: (data: ResetRequestFormData) => Promise<void> | void
  /** Callback when new password is submitted (reset mode) */
  onResetPassword?: (data: ResetPasswordFormData & { token: string }) => Promise<void> | void
  /** Callback when back to signin is clicked */
  onBackToSignin?: () => void
  /** Callback when sign in link is clicked (after success) */
  onSignin?: () => void
  /** Show as card or inline form */
  variant?: "card" | "inline"
  /** Additional className */
  className?: string
  /** Default email value */
  defaultEmail?: string
}

type FormMode = "request" | "confirmation" | "reset" | "success"

export function PasswordResetForm({
  token,
  onRequestReset,
  onResetPassword,
  onBackToSignin,
  onSignin,
  variant = "card",
  className,
  defaultEmail = "",
}: PasswordResetFormProps) {
  // Determine initial mode based on whether token is provided
  const initialMode: FormMode = token ? "reset" : "request"

  // Form state
  const [mode, setMode] = React.useState<FormMode>(initialMode)
  const [email, setEmail] = React.useState(defaultEmail)
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  // UI state
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Calculate password strength
  const calculatePasswordStrength = (pwd: string): PasswordStrength => {
    if (!pwd) {
      return { score: 0, label: "", color: "" }
    }

    let score = 0

    // Length check
    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++

    // Complexity checks
    if (/[0-9]/.test(pwd)) score++
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    // Cap at 4
    score = Math.min(score, 4)

    const labels = ["", "Weak", "Fair", "Good", "Strong"]
    const colors = [
      "",
      "bg-destructive",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-green-500",
    ]

    return {
      score,
      label: labels[score],
      color: colors[score],
    }
  }

  const passwordStrength = calculatePasswordStrength(password)

  // Password requirements check
  const passwordRequirements = [
    {
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      label: "Contains a number",
      met: /[0-9]/.test(password),
    },
  ]

  // Validation functions
  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return "Please enter your email address"
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address"
    }
    return undefined
  }

  const validatePassword = (value: string): string | undefined => {
    if (!value) {
      return "Please enter a new password"
    }
    if (value.length < 8) {
      return "Password must be at least 8 characters"
    }
    if (!/[0-9]/.test(value)) {
      return "Password must include at least one number"
    }
    return undefined
  }

  const validateConfirmPassword = (value: string): string | undefined => {
    if (!value) {
      return "Please confirm your password"
    }
    if (value !== password) {
      return "Passwords don't match"
    }
    return undefined
  }

  const validateRequestForm = (): boolean => {
    const newErrors: FormErrors = {}
    const emailError = validateEmail(email)
    if (emailError) newErrors.email = emailError
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateResetForm = (): boolean => {
    const newErrors: FormErrors = {}
    const passwordError = validatePassword(password)
    if (passwordError) newErrors.password = passwordError
    const confirmPasswordError = validateConfirmPassword(confirmPassword)
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Field change handlers - clear errors on change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }))
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }))
    }
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value)
    if (errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
    }
  }

  // Form submissions
  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateRequestForm()) {
      return
    }

    setErrors((prev) => ({ ...prev, form: undefined }))
    setIsSubmitting(true)

    try {
      await onRequestReset?.({ email })
      // Always show confirmation for security (ambiguous response)
      setMode("confirmation")
    } catch (error: any) {
      // Even on error, show confirmation for security (prevents email enumeration)
      // Only show error for unexpected failures
      const errorMessage = error.message || ""
      if (errorMessage.includes("network") || errorMessage.includes("server")) {
        setErrors({ form: "Something went wrong. Please try again." })
      } else {
        // Default to showing confirmation (security best practice)
        setMode("confirmation")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateResetForm()) {
      return
    }

    if (!token) {
      setErrors({ form: "Invalid reset link. Please request a new one." })
      return
    }

    setErrors((prev) => ({ ...prev, form: undefined }))
    setIsSubmitting(true)

    try {
      await onResetPassword?.({ password, confirmPassword, token })
      setMode("success")
    } catch (error: any) {
      const errorMessage = error.message || "Something went wrong. Please try again."

      // Map common error messages
      if (errorMessage.includes("expired")) {
        setErrors({
          form: "This reset link has expired. Request a new one.",
        })
      } else if (errorMessage.includes("invalid") || errorMessage.includes("token")) {
        setErrors({
          form: "This reset link is invalid. Request a new one.",
        })
      } else if (errorMessage.includes("used") || errorMessage.includes("already")) {
        setErrors({
          form: "This reset link has already been used. Request a new one.",
        })
      } else if (errorMessage.includes("weak") || errorMessage.includes("password")) {
        setErrors({
          password: "Please choose a stronger password",
        })
      } else {
        setErrors({ form: errorMessage })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render different modes
  const renderRequestForm = () => (
    <form onSubmit={handleRequestSubmit} className="space-y-4" noValidate>
      {/* Form-level error */}
      {errors.form && (
        <div
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20"
          role="alert"
          aria-live="assertive"
        >
          {errors.form}
        </div>
      )}

      {/* Icon */}
      <div className="flex justify-center">
        <div className="rounded-full bg-muted p-3">
          <Mail className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground text-center">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          name="email"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          value={email}
          onChange={handleEmailChange}
          error={Boolean(errors.email)}
          errorMessage={errors.email}
          disabled={isSubmitting}
          required
          aria-required="true"
          shake={Boolean(errors.email)}
        />
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full"
        isLoading={isSubmitting}
        loadingText="Sending reset link..."
      >
        Send reset link
      </Button>

      {/* Back to sign in */}
      {onBackToSignin && (
        <div className="text-center">
          <button
            type="button"
            onClick={onBackToSignin}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded disabled:opacity-50"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden="true" />
            Back to sign in
          </button>
        </div>
      )}
    </form>
  )

  const renderConfirmation = (showHeading: boolean = true) => (
    <div className="space-y-4 text-center">
      {/* Success icon */}
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
          <Mail className="h-6 w-6 text-green-600 dark:text-green-400" aria-hidden="true" />
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        {showHeading && <h3 className="text-lg font-semibold">Check your email</h3>}
        <p className="text-sm text-muted-foreground">
          If an account exists for <strong className="text-foreground">{email}</strong>,
          you'll receive an email with a link to reset your password.
        </p>
      </div>

      {/* Tip */}
      <p className="text-xs text-muted-foreground">
        Didn't receive it? Check your spam folder or try again.
      </p>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setMode("request")
            setEmail("")
          }}
        >
          Try a different email
        </Button>

        {onBackToSignin && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBackToSignin}
          >
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to sign in
          </Button>
        )}
      </div>
    </div>
  )

  const renderResetForm = () => (
    <form onSubmit={handleResetSubmit} className="space-y-4" noValidate>
      {/* Form-level error */}
      {errors.form && (
        <div
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20"
          role="alert"
          aria-live="assertive"
        >
          {errors.form}
        </div>
      )}

      {/* Icon */}
      <div className="flex justify-center">
        <div className="rounded-full bg-muted p-3">
          <KeyRound className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground text-center">
        Create a new password for your account.
      </p>

      {/* Password field */}
      <div className="space-y-2">
        <Label htmlFor="reset-password">New password</Label>
        <div className="relative">
          <Input
            id="reset-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a new password"
            autoComplete="new-password"
            value={password}
            onChange={handlePasswordChange}
            error={Boolean(errors.password)}
            errorMessage={errors.password}
            disabled={isSubmitting}
            required
            aria-required="true"
            shake={Boolean(errors.password)}
            wrapperClassName="mb-0"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isSubmitting}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded p-1 disabled:opacity-50"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Password strength indicator */}
        {password && passwordStrength.score > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    level <= passwordStrength.score
                      ? passwordStrength.color
                      : "bg-muted"
                  )}
                  aria-hidden="true"
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Password strength: {passwordStrength.label}
            </p>
          </div>
        )}

        {/* Password requirements */}
        {password && (
          <div className="space-y-1" aria-label="Password requirements">
            {passwordRequirements.map((req, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                {req.met ? (
                  <Check className="h-3 w-3 text-green-500" aria-hidden="true" />
                ) : (
                  <X className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  )}
                >
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm password field */}
      <div className="space-y-2">
        <Label htmlFor="reset-confirmPassword">Confirm password</Label>
        <div className="relative">
          <Input
            id="reset-confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            error={Boolean(errors.confirmPassword)}
            errorMessage={errors.confirmPassword}
            disabled={isSubmitting}
            required
            aria-required="true"
            shake={Boolean(errors.confirmPassword)}
            wrapperClassName="mb-0"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            disabled={isSubmitting}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded p-1 disabled:opacity-50"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full"
        isLoading={isSubmitting}
        loadingText="Resetting password..."
      >
        Reset password
      </Button>

      {/* Back to sign in */}
      {onBackToSignin && (
        <div className="text-center">
          <button
            type="button"
            onClick={onBackToSignin}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded disabled:opacity-50"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden="true" />
            Back to sign in
          </button>
        </div>
      )}
    </form>
  )

  const renderSuccess = (showHeading: boolean = true) => (
    <div className="space-y-4 text-center">
      {/* Success icon */}
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
          <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" aria-hidden="true" />
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        {showHeading && <h3 className="text-lg font-semibold">Password updated</h3>}
        <p className="text-sm text-muted-foreground">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
      </div>

      {/* Sign in button */}
      {onSignin && (
        <Button
          type="button"
          className="w-full"
          onClick={onSignin}
        >
          Sign in
        </Button>
      )}
    </div>
  )

  // Get content based on mode - showHeading controls whether inner h3 is shown
  const getContent = (showHeading: boolean = true) => {
    switch (mode) {
      case "request":
        return renderRequestForm()
      case "confirmation":
        return renderConfirmation(showHeading)
      case "reset":
        return renderResetForm()
      case "success":
        return renderSuccess(showHeading)
      default:
        return renderRequestForm()
    }
  }

  // Get title and description based on mode
  const getTitle = () => {
    switch (mode) {
      case "request":
        return "Reset your password"
      case "confirmation":
        return "Check your email"
      case "reset":
        return "Create new password"
      case "success":
        return "Password updated"
      default:
        return "Reset your password"
    }
  }

  const getDescription = () => {
    switch (mode) {
      case "request":
        return "Enter your email to receive a password reset link"
      case "confirmation":
        return null // No description needed, message is in content
      case "reset":
        return "Choose a strong password for your account"
      case "success":
        return null // No description needed, message is in content
      default:
        return ""
    }
  }

  // Render as card or inline
  if (variant === "card") {
    const description = getDescription()
    return (
      <Card className={cn("w-full max-w-md mx-auto", className)}>
        <CardHeader>
          <CardTitle>{getTitle()}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{getContent(false)}</CardContent>
      </Card>
    )
  }

  return <div className={cn("w-full max-w-md mx-auto", className)}>{getContent(true)}</div>
}
