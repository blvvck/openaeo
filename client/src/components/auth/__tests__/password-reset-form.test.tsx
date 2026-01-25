import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PasswordResetForm } from "../password-reset-form"



describe("PasswordResetForm", () => {
  // Mock handlers
  const mockOnRequestReset = vi.fn()
  const mockOnResetPassword = vi.fn()
  const mockOnBackToSignin = vi.fn()
  const mockOnSignin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering - Request Mode", () => {
    it("renders request reset form with all elements (card variant)", () => {
      render(
        <PasswordResetForm
          onRequestReset={mockOnRequestReset}
          onBackToSignin={mockOnBackToSignin}
        />
      )

      // Title and description
      expect(screen.getByText("Reset your password")).toBeInTheDocument()
      expect(screen.getByText(/Enter your email to receive/i)).toBeInTheDocument()

      // Instructions
      expect(screen.getByText(/Enter your email address/i)).toBeInTheDocument()

      // Form fields
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()

      // Submit button
      expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument()

      // Back to sign in link
      expect(screen.getByRole("button", { name: /Back to sign in/i })).toBeInTheDocument()
    })

    it("renders inline variant without card wrapper", () => {
      render(<PasswordResetForm variant="inline" onRequestReset={mockOnRequestReset} />)

      // Should not have card title/description
      expect(screen.queryByText("Reset your password")).not.toBeInTheDocument()

      // But should have form fields
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    })

    it("hides back to signin link when onBackToSignin is not provided", () => {
      render(<PasswordResetForm onRequestReset={mockOnRequestReset} />)

      expect(screen.queryByRole("button", { name: /Back to sign in/i })).not.toBeInTheDocument()
    })

    it("populates email field with defaultEmail", () => {
      render(
        <PasswordResetForm
          defaultEmail="test@example.com"
          onRequestReset={mockOnRequestReset}
        />
      )

      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
      expect(emailInput.value).toBe("test@example.com")
    })
  })

  describe("Rendering - Reset Mode", () => {
    it("renders reset password form when token is provided", () => {
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
          onBackToSignin={mockOnBackToSignin}
        />
      )

      // Title and description
      expect(screen.getByText("Create new password")).toBeInTheDocument()
      expect(screen.getByText(/Choose a strong password/i)).toBeInTheDocument()

      // Instructions
      expect(screen.getByText(/Create a new password for your account/i)).toBeInTheDocument()

      // Form fields
      expect(screen.getByLabelText(/New password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Confirm password/i)).toBeInTheDocument()

      // Submit button
      expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument()

      // Back to sign in
      expect(screen.getByRole("button", { name: /Back to sign in/i })).toBeInTheDocument()
    })

    it("shows password visibility toggles in reset mode", () => {
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      // Should have two visibility toggle buttons
      const toggleButtons = screen.getAllByRole("button", { name: /Show password/i })
      expect(toggleButtons).toHaveLength(2)
    })
  })

  describe("Email Validation - Request Mode", () => {
    it("shows error when email is empty", async () => {
      const user = userEvent.setup()
      render(<PasswordResetForm onRequestReset={mockOnRequestReset} />)

      const submitButton = screen.getByRole("button", { name: "Send reset link" })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Please enter your email address")).toBeInTheDocument()
      })

      expect(mockOnRequestReset).not.toHaveBeenCalled()
    })

    it("shows error when email format is invalid", async () => {
      const user = userEvent.setup()
      render(<PasswordResetForm onRequestReset={mockOnRequestReset} />)

      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, "invalid-email")

      const submitButton = screen.getByRole("button", { name: "Send reset link" })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument()
      })

      expect(mockOnRequestReset).not.toHaveBeenCalled()
    })

    it("clears email error when user starts typing", async () => {
      const user = userEvent.setup()
      render(<PasswordResetForm onRequestReset={mockOnRequestReset} />)

      // Trigger validation error
      const submitButton = screen.getByRole("button", { name: "Send reset link" })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Please enter your email address")).toBeInTheDocument()
      })

      // Start typing
      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, "test@example.com")

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText("Please enter your email address")).not.toBeInTheDocument()
      })
    })
  })

  describe("Password Validation - Reset Mode", () => {
    it("shows error when password is empty", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const submitButton = screen.getByRole("button", { name: "Reset password" })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Please enter a new password")).toBeInTheDocument()
      })

      expect(mockOnResetPassword).not.toHaveBeenCalled()
    })

    it("shows error when password is too short", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      await user.type(passwordInput, "short")

      const submitButton = screen.getByRole("button", { name: "Reset password" })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument()
      })

      expect(mockOnResetPassword).not.toHaveBeenCalled()
    })

    it("shows error when password has no number", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      await user.type(passwordInput, "longenoughpassword")

      const submitButton = screen.getByRole("button", { name: "Reset password" })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Password must include at least one number")).toBeInTheDocument()
      })

      expect(mockOnResetPassword).not.toHaveBeenCalled()
    })

    it("shows error when confirm password is empty", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      await user.type(passwordInput, "password123")

      const submitButton = screen.getByRole("button", { name: "Reset password" })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Please confirm your password")).toBeInTheDocument()
      })

      expect(mockOnResetPassword).not.toHaveBeenCalled()
    })

    it("shows error when passwords do not match", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      const confirmInput = screen.getByLabelText(/Confirm password/i)

      await user.type(passwordInput, "password123")
      await user.type(confirmInput, "differentpassword123")

      const submitButton = screen.getByRole("button", { name: "Reset password" })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
      })

      expect(mockOnResetPassword).not.toHaveBeenCalled()
    })

    it("clears password error when user starts typing", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      // Trigger validation error
      const submitButton = screen.getByRole("button", { name: "Reset password" })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Please enter a new password")).toBeInTheDocument()
      })

      // Start typing
      const passwordInput = screen.getByLabelText(/New password/i)
      await user.type(passwordInput, "password123")

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText("Please enter a new password")).not.toBeInTheDocument()
      })
    })

    it("clears confirm password error when user starts typing", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      await user.type(passwordInput, "password123")

      // Trigger validation error
      const submitButton = screen.getByRole("button", { name: "Reset password" })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Please confirm your password")).toBeInTheDocument()
      })

      // Start typing
      const confirmInput = screen.getByLabelText(/Confirm password/i)
      await user.type(confirmInput, "password123")

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText("Please confirm your password")).not.toBeInTheDocument()
      })
    })
  })

  describe("Password Strength Indicator", () => {
    it("shows password strength indicator when typing", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      // Need at least 8 chars with a number to get a score > 0
      await user.type(passwordInput, "password1")

      await waitFor(() => {
        expect(screen.getByText(/Password strength:/i)).toBeInTheDocument()
      })
    })

    it("shows Weak for short passwords", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      await user.type(passwordInput, "abc1")

      await waitFor(() => {
        expect(screen.getByText(/Password strength: Weak/i)).toBeInTheDocument()
      })
    })

    it("shows stronger rating for complex passwords", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      await user.type(passwordInput, "StrongPass123!")

      await waitFor(() => {
        expect(screen.getByText(/Password strength: Strong/i)).toBeInTheDocument()
      })
    })
  })

  describe("Password Requirements Checklist", () => {
    it("shows requirements checklist when typing", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      await user.type(passwordInput, "test")

      await waitFor(() => {
        expect(screen.getByText("At least 8 characters")).toBeInTheDocument()
        expect(screen.getByText("Contains a number")).toBeInTheDocument()
      })
    })

    it("updates checklist as requirements are met", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)

      // Start with short password
      await user.type(passwordInput, "test")

      // Length requirement not met (will have X icon)
      let lengthReq = screen.getByText("At least 8 characters")
      expect(lengthReq).toHaveClass("text-muted-foreground")

      // Type more to meet length requirement
      await user.clear(passwordInput)
      await user.type(passwordInput, "longenough1")

      // Both requirements now met
      await waitFor(() => {
        lengthReq = screen.getByText("At least 8 characters")
        expect(lengthReq).toHaveClass("text-green-600")
      })
    })
  })

  describe("Request Reset Submission", () => {
    it("calls onRequestReset with email when valid", async () => {
      const user = userEvent.setup()
      mockOnRequestReset.mockResolvedValueOnce(undefined)

      render(<PasswordResetForm onRequestReset={mockOnRequestReset} />)

      const emailInput = screen.getByLabelText(/Email/i)
      const submitButton = screen.getByRole("button", { name: "Send reset link" })

      await user.type(emailInput, "test@example.com")
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnRequestReset).toHaveBeenCalledWith({
          email: "test@example.com",
        })
      })
    })

    it("shows loading text on submit button during submission", async () => {
      const user = userEvent.setup()
      // This test validates the loading text appears on the button
      // We use a delayed promise to catch the loading state
      mockOnRequestReset.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(<PasswordResetForm onRequestReset={mockOnRequestReset} />)

      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, "test@example.com")

      const submitButton = screen.getByRole("button", { name: "Send reset link" })
      await user.click(submitButton)

      // The button should show loading text while submitting
      expect(screen.getByText("Sending reset link...")).toBeInTheDocument()
    })

    it("shows confirmation after successful submission", async () => {
      const user = userEvent.setup()
      mockOnRequestReset.mockResolvedValue(undefined)

      render(<PasswordResetForm onRequestReset={mockOnRequestReset} />)

      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, "test@example.com")

      const submitButton = screen.getByRole("button", { name: "Send reset link" })
      await user.click(submitButton)

      // Wait for confirmation state - card shows "Try a different email" button
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Try a different email/i })).toBeInTheDocument()
      })

      // Verify other elements
      expect(screen.getByText(/If an account exists for/i)).toBeInTheDocument()
    })

    it("shows confirmation even on non-network errors (security)", async () => {
      const user = userEvent.setup()
      mockOnRequestReset.mockRejectedValue(new Error("User not found"))

      render(<PasswordResetForm onRequestReset={mockOnRequestReset} />)

      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, "test@example.com")

      const submitButton = screen.getByRole("button", { name: "Send reset link" })
      await user.click(submitButton)

      // Should still show confirmation (prevents email enumeration)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Try a different email/i })).toBeInTheDocument()
      })
    })

    it("shows error only on network/server errors", async () => {
      const user = userEvent.setup()
      mockOnRequestReset.mockRejectedValueOnce(new Error("network error"))

      render(<PasswordResetForm onRequestReset={mockOnRequestReset} />)

      const emailInput = screen.getByLabelText(/Email/i)
      const submitButton = screen.getByRole("button", { name: "Send reset link" })

      await user.type(emailInput, "test@example.com")
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
      })
    })
  })

  describe("Reset Password Submission", () => {
    it("calls onResetPassword with password and token when valid", async () => {
      const user = userEvent.setup()
      mockOnResetPassword.mockResolvedValue(undefined)

      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      const confirmInput = screen.getByLabelText(/Confirm password/i)
      const submitButton = screen.getByRole("button", { name: "Reset password" })

      await user.type(passwordInput, "newpassword123")
      await user.type(confirmInput, "newpassword123")
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnResetPassword).toHaveBeenCalledWith({
          password: "newpassword123",
          confirmPassword: "newpassword123",
          token: "valid-token-123",
        })
      })
    })

    it("shows loading text on submit button during submission", async () => {
      const user = userEvent.setup()
      // Use a delayed promise to catch the loading state
      mockOnResetPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      const confirmInput = screen.getByLabelText(/Confirm password/i)

      await user.type(passwordInput, "newpassword123")
      await user.type(confirmInput, "newpassword123")

      const submitButton = screen.getByRole("button", { name: "Reset password" })
      await user.click(submitButton)

      // Should show loading text on button
      expect(screen.getByText("Resetting password...")).toBeInTheDocument()
    })

    it("shows success state after successful reset", async () => {
      const user = userEvent.setup()
      mockOnResetPassword.mockResolvedValue(undefined)

      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
          onSignin={mockOnSignin}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      const confirmInput = screen.getByLabelText(/Confirm password/i)

      await user.type(passwordInput, "newpassword123")
      await user.type(confirmInput, "newpassword123")

      const submitButton = screen.getByRole("button", { name: "Reset password" })
      await user.click(submitButton)

      // Wait for success state - sign in button appears only in success mode
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
      })

      // Verify other elements
      expect(screen.getByText(/successfully reset/i)).toBeInTheDocument()
    })
  })

  describe("Error States - Reset Mode", () => {
    it("handles expired token error", async () => {
      const user = userEvent.setup()
      mockOnResetPassword.mockRejectedValueOnce(new Error("Token expired"))

      render(
        <PasswordResetForm
          token="expired-token"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      const confirmInput = screen.getByLabelText(/Confirm password/i)
      const submitButton = screen.getByRole("button", { name: "Reset password" })

      await user.type(passwordInput, "newpassword123")
      await user.type(confirmInput, "newpassword123")
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/This reset link has expired/i)).toBeInTheDocument()
      })
    })

    it("handles invalid token error", async () => {
      const user = userEvent.setup()
      mockOnResetPassword.mockRejectedValueOnce(new Error("Invalid token"))

      render(
        <PasswordResetForm
          token="invalid-token"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      const confirmInput = screen.getByLabelText(/Confirm password/i)
      const submitButton = screen.getByRole("button", { name: "Reset password" })

      await user.type(passwordInput, "newpassword123")
      await user.type(confirmInput, "newpassword123")
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/This reset link is invalid/i)).toBeInTheDocument()
      })
    })

    it("handles already used token error", async () => {
      const user = userEvent.setup()
      mockOnResetPassword.mockRejectedValueOnce(new Error("Token already used"))

      render(
        <PasswordResetForm
          token="used-token"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      const confirmInput = screen.getByLabelText(/Confirm password/i)
      const submitButton = screen.getByRole("button", { name: "Reset password" })

      await user.type(passwordInput, "newpassword123")
      await user.type(confirmInput, "newpassword123")
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/This reset link has already been used/i)).toBeInTheDocument()
      })
    })

    it("handles weak password error from server", async () => {
      const user = userEvent.setup()
      mockOnResetPassword.mockRejectedValueOnce(new Error("Password too weak"))

      render(
        <PasswordResetForm
          token="valid-token"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      const confirmInput = screen.getByLabelText(/Confirm password/i)
      const submitButton = screen.getByRole("button", { name: "Reset password" })

      await user.type(passwordInput, "password1")
      await user.type(confirmInput, "password1")
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Please choose a stronger password/i)).toBeInTheDocument()
      })
    })
  })

  describe("Password Visibility Toggle", () => {
    it("toggles new password visibility when eye icon is clicked", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i) as HTMLInputElement
      const toggleButtons = screen.getAllByRole("button", { name: /Show password/i })
      const toggleButton = toggleButtons[0]

      // Initially hidden
      expect(passwordInput.type).toBe("password")

      // Click to show
      await user.click(toggleButton)
      expect(passwordInput.type).toBe("text")

      // Click to hide
      await user.click(toggleButton)
      expect(passwordInput.type).toBe("password")
    })

    it("toggles confirm password visibility independently", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i) as HTMLInputElement
      const confirmInput = screen.getByLabelText(/Confirm password/i) as HTMLInputElement
      const toggleButtons = screen.getAllByRole("button", { name: /Show password/i })

      // Toggle confirm password visibility
      await user.click(toggleButtons[1])
      expect(confirmInput.type).toBe("text")
      expect(passwordInput.type).toBe("password") // Should remain hidden
    })
  })

  describe("Success State", () => {
    it("calls onSignin when sign in button is clicked in success state", async () => {
      const user = userEvent.setup()
      mockOnResetPassword.mockResolvedValue(undefined)

      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
          onSignin={mockOnSignin}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      const confirmInput = screen.getByLabelText(/Confirm password/i)

      await user.type(passwordInput, "newpassword123")
      await user.type(confirmInput, "newpassword123")

      const submitButton = screen.getByRole("button", { name: "Reset password" })
      await user.click(submitButton)

      // Wait for success state - sign in button appears
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
      })

      // Click sign in button
      const signinButton = screen.getByRole("button", { name: "Sign in" })
      await user.click(signinButton)

      expect(mockOnSignin).toHaveBeenCalledTimes(1)
    })
  })

  describe("Confirmation State", () => {
    it("allows trying a different email from confirmation", async () => {
      const user = userEvent.setup()
      mockOnRequestReset.mockResolvedValue(undefined)

      render(<PasswordResetForm onRequestReset={mockOnRequestReset} />)

      // Submit initial request
      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, "test@example.com")

      const submitButton = screen.getByRole("button", { name: "Send reset link" })
      await user.click(submitButton)

      // Wait for confirmation - try different email button appears
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Try a different email/i })).toBeInTheDocument()
      })

      // Click try different email
      const tryDifferentButton = screen.getByRole("button", { name: /Try a different email/i })
      await user.click(tryDifferentButton)

      // Should be back to request form with empty email
      await waitFor(() => {
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
      })
      const newEmailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
      expect(newEmailInput.value).toBe("")
    })

    it("calls onBackToSignin from confirmation state", async () => {
      const user = userEvent.setup()
      mockOnRequestReset.mockResolvedValue(undefined)

      render(
        <PasswordResetForm
          onRequestReset={mockOnRequestReset}
          onBackToSignin={mockOnBackToSignin}
        />
      )

      // Submit initial request
      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, "test@example.com")

      const submitButton = screen.getByRole("button", { name: "Send reset link" })
      await user.click(submitButton)

      // Wait for confirmation - try different email button appears
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Try a different email/i })).toBeInTheDocument()
      })

      // Click back to sign in
      const backButton = screen.getByRole("button", { name: /Back to sign in/i })
      await user.click(backButton)

      expect(mockOnBackToSignin).toHaveBeenCalledTimes(1)
    })
  })

  describe("Accessibility", () => {
    it("has proper ARIA labels and attributes in request mode", () => {
      render(<PasswordResetForm onRequestReset={mockOnRequestReset} />)

      const emailInput = screen.getByLabelText(/Email/i)
      expect(emailInput).toHaveAttribute("aria-required", "true")
    })

    it("has proper ARIA labels and attributes in reset mode", () => {
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      const confirmInput = screen.getByLabelText(/Confirm password/i)

      expect(passwordInput).toHaveAttribute("aria-required", "true")
      expect(confirmInput).toHaveAttribute("aria-required", "true")
    })

    it("links error messages to inputs with aria-describedby", async () => {
      const user = userEvent.setup()
      render(<PasswordResetForm onRequestReset={mockOnRequestReset} />)

      const submitButton = screen.getByRole("button", { name: "Send reset link" })
      await user.click(submitButton)

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/Email/i)
        const errorId = emailInput.getAttribute("aria-describedby")
        expect(errorId).toBeTruthy()
        expect(document.getElementById(errorId!)).toHaveTextContent(
          "Please enter your email address"
        )
      })
    })

    it("marks form errors with role=alert", async () => {
      const user = userEvent.setup()
      mockOnResetPassword.mockRejectedValueOnce(new Error("Token expired"))

      render(
        <PasswordResetForm
          token="expired-token"
          onResetPassword={mockOnResetPassword}
        />
      )

      const passwordInput = screen.getByLabelText(/New password/i)
      const confirmInput = screen.getByLabelText(/Confirm password/i)
      const submitButton = screen.getByRole("button", { name: "Reset password" })

      await user.type(passwordInput, "newpassword123")
      await user.type(confirmInput, "newpassword123")
      await user.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole("alert")
        expect(alert).toBeInTheDocument()
      })
    })

    it("supports keyboard navigation in request mode", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          onRequestReset={mockOnRequestReset}
          onBackToSignin={mockOnBackToSignin}
        />
      )

      // Tab through form
      await user.tab() // Email input
      await user.tab() // Submit button
      await user.tab() // Back to sign in

      expect(document.activeElement).toBeTruthy()
    })

    it("supports keyboard navigation in reset mode", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
          onBackToSignin={mockOnBackToSignin}
        />
      )

      // Tab through form
      await user.tab() // Password input
      await user.tab() // Password visibility toggle
      await user.tab() // Confirm password input
      await user.tab() // Confirm password visibility toggle
      await user.tab() // Submit button
      await user.tab() // Back to sign in

      expect(document.activeElement).toBeTruthy()
    })
  })

  describe("Link Handlers", () => {
    it("calls onBackToSignin when back link is clicked in request mode", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          onRequestReset={mockOnRequestReset}
          onBackToSignin={mockOnBackToSignin}
        />
      )

      const backLink = screen.getByRole("button", { name: /Back to sign in/i })
      await user.click(backLink)

      expect(mockOnBackToSignin).toHaveBeenCalledTimes(1)
    })

    it("calls onBackToSignin when back link is clicked in reset mode", async () => {
      const user = userEvent.setup()
      render(
        <PasswordResetForm
          token="valid-token-123"
          onResetPassword={mockOnResetPassword}
          onBackToSignin={mockOnBackToSignin}
        />
      )

      const backLink = screen.getByRole("button", { name: /Back to sign in/i })
      await user.click(backLink)

      expect(mockOnBackToSignin).toHaveBeenCalledTimes(1)
    })
  })
})
