import * as React from "react"
import { Eye, EyeOff, Github, Mail, Check, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/field-label"
import { Checkbox } from "@/components/ui/check-control"



// Form validation schema
interface SignupFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

interface SignupFormErrors {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  confirmPassword?: string
  acceptTerms?: string
  form?: string
}

interface PasswordStrength {
  score: number // 0-4
  label: string
  color: string
}

export interface SignupFormProps {
  /** Callback when form is submitted */
  onSubmit?: (data: Omit<SignupFormData, "confirmPassword">) => Promise<void> | void
  /** Callback when OAuth is triggered */
  onOAuthSignup?: (provider: "google" | "github") => Promise<void> | void
  /** Callback when sign in is clicked */
  onSignin?: () => void
  /** Callback when terms link is clicked */
  onViewTerms?: () => void
  /** Callback when privacy link is clicked */
  onViewPrivacy?: () => void
  /** Show as card or inline form */
  variant?: "card" | "inline"
  /** Additional className */
  className?: string
  /** Default email value */
  defaultEmail?: string
  /** Show OAuth buttons */
  showOAuth?: boolean
}

export function SignupForm({
  onSubmit,
  onOAuthSignup,
  onSignin,
  onViewTerms,
  onViewPrivacy,
  variant = "card",
  className,
  defaultEmail = "",
  showOAuth = true,
}: SignupFormProps) {
  // Form state
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState(defaultEmail)
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [acceptTerms, setAcceptTerms] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  // UI state
  const [errors, setErrors] = React.useState<SignupFormErrors>({})
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

  // Validation functions
  const validateFirstName = (value: string): string | undefined => {
    // Optional field
    return undefined
  }

  const validateLastName = (value: string): string | undefined => {
    // Optional field
    return undefined
  }

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return "Please enter your email address"
    }
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address"
    }
    return undefined
  }

  const validatePassword = (value: string): string | undefined => {
    if (!value) {
      return "Please create a password"
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

  const validateAcceptTerms = (value: boolean): string | undefined => {
    if (!value) {
      return "You must accept the terms to continue"
    }
    return undefined
  }

  const validateForm = (): boolean => {
    const newErrors: SignupFormErrors = {}

    const firstNameError = validateFirstName(firstName)
    if (firstNameError) newErrors.firstName = firstNameError

    const lastNameError = validateLastName(lastName)
    if (lastNameError) newErrors.lastName = lastNameError

    const emailError = validateEmail(email)
    if (emailError) newErrors.email = emailError

    const passwordError = validatePassword(password)
    if (passwordError) newErrors.password = passwordError

    const confirmPasswordError = validateConfirmPassword(confirmPassword)
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError

    const acceptTermsError = validateAcceptTerms(acceptTerms)
    if (acceptTermsError) newErrors.acceptTerms = acceptTermsError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Field change handlers - clear errors on change
  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value)
    if (errors.firstName) {
      setErrors((prev) => ({ ...prev, firstName: undefined }))
    }
  }

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value)
    if (errors.lastName) {
      setErrors((prev) => ({ ...prev, lastName: undefined }))
    }
  }

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

  // Form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Validate form
    if (!validateForm()) {
      return
    }

    // Clear form error
    setErrors((prev) => ({ ...prev, form: undefined }))
    setIsSubmitting(true)

    try {
      await onSubmit?.({
        firstName,
        lastName,
        email,
        password,
        acceptTerms,
      })
    } catch (error: any) {
      // Handle different error types
      const errorMessage = error.message || "Something went wrong. Please try again."

      // Map common error messages
      if (errorMessage.includes("exists") || errorMessage.includes("already registered")) {
        setErrors({
          form: "An account with this email already exists. Sign in instead?",
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

  // OAuth handlers
  const handleOAuthSignup = async (provider: "google" | "github") => {
    setIsSubmitting(true)
    setErrors({})

    try {
      await onOAuthSignup?.(provider)
    } catch (error: any) {
      const errorMessage = error.message
      // Always use the standard OAuth message for consistency
      setErrors({
        form: errorMessage ? "OAuth sign-up failed. Please try again." : "OAuth sign-up failed. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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

  // Form content
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

      {/* OAuth buttons */}
      {showOAuth && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthSignup("google")}
            disabled={isSubmitting}
            leftIcon={<Mail className="h-4 w-4" />}
          >
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthSignup("github")}
            disabled={isSubmitting}
            leftIcon={<Github className="h-4 w-4" />}
          >
            Continue with GitHub
          </Button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Name fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="signup-firstName">
            First name <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="signup-firstName"
            name="firstName"
            type="text"
            placeholder="John"
            autoComplete="given-name"
            value={firstName}
            onChange={handleFirstNameChange}
            error={Boolean(errors.firstName)}
            errorMessage={errors.firstName}
            disabled={isSubmitting}
            shake={Boolean(errors.firstName)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-lastName">
            Last name <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="signup-lastName"
            name="lastName"
            type="text"
            placeholder="Doe"
            autoComplete="family-name"
            value={lastName}
            onChange={handleLastNameChange}
            error={Boolean(errors.lastName)}
            errorMessage={errors.lastName}
            disabled={isSubmitting}
            shake={Boolean(errors.lastName)}
          />
        </div>
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
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

      {/* Password field */}
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
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
        <Label htmlFor="signup-confirmPassword">Confirm password</Label>
        <div className="relative">
          <Input
            id="signup-confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Re-enter your password"
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

      {/* Terms of service checkbox */}
      <div className="space-y-2">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="signup-accept-terms"
            checked={acceptTerms}
            onCheckedChange={(checked) => {
              setAcceptTerms(Boolean(checked))
              if (Boolean(checked) && errors.acceptTerms) {
                setErrors((prev) => ({ ...prev, acceptTerms: undefined }))
              }
            }}
            disabled={isSubmitting}
            aria-required="true"
            aria-invalid={Boolean(errors.acceptTerms)}
            aria-describedby={errors.acceptTerms ? "terms-error" : undefined}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="signup-accept-terms"
              className="text-sm font-normal cursor-pointer"
            >
              I agree to the{" "}
              {onViewTerms ? (
                <button
                  type="button"
                  onClick={onViewTerms}
                  disabled={isSubmitting}
                  className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded disabled:opacity-50"
                >
                  Terms of Service
                </button>
              ) : (
                <span className="text-primary">Terms of Service</span>
              )}{" "}
              and{" "}
              {onViewPrivacy ? (
                <button
                  type="button"
                  onClick={onViewPrivacy}
                  disabled={isSubmitting}
                  className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded disabled:opacity-50"
                >
                  Privacy Policy
                </button>
              ) : (
                <span className="text-primary">Privacy Policy</span>
              )}
            </Label>
            {errors.acceptTerms && (
              <p id="terms-error" className="text-xs text-destructive" role="alert">
                {errors.acceptTerms}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full"
        isLoading={isSubmitting}
        loadingText="Creating account..."
      >
        Create account
      </Button>

      {/* Sign in link */}
      {onSignin && (
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSignin}
            disabled={isSubmitting}
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded disabled:opacity-50"
          >
            Sign in
          </button>
        </div>
      )}
    </form>
  )

  // Render as card or inline
  if (variant === "card") {
    return (
      <Card className={cn("w-full max-w-md mx-auto", className)}>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Get started with your brand visibility tracking
          </CardDescription>
        </CardHeader>
        <CardContent>{formContent}</CardContent>
      </Card>
    )
  }

  return <div className={cn("w-full max-w-md mx-auto", className)}>{formContent}</div>
}
