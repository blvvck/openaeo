import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SignupForm } from "../signup-form"

describe("SignupForm", () => {
  const mockOnSubmit = vi.fn()
  const mockOnOAuthSignup = vi.fn()
  const mockOnSignin = vi.fn()
  const mockOnViewTerms = vi.fn()
  const mockOnViewPrivacy = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders signup form with all required fields", () => {
      render(<SignupForm onSubmit={mockOnSubmit} />)

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/terms of service/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument()
    })

    it("renders OAuth buttons when showOAuth is true", () => {
      render(<SignupForm onSubmit={mockOnSubmit} showOAuth={true} />)

      expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /continue with github/i })).toBeInTheDocument()
    })

    it("hides OAuth buttons when showOAuth is false", () => {
      render(<SignupForm onSubmit={mockOnSubmit} showOAuth={false} />)

      expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /continue with github/i })).not.toBeInTheDocument()
    })

    it("renders as card variant by default", () => {
      const { container } = render(<SignupForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText("Create your account")).toBeInTheDocument()
      expect(screen.getByText(/get started with your brand/i)).toBeInTheDocument()
      expect(container.querySelector('[class*="card"]')).toBeInTheDocument()
    })

    it("renders as inline variant when specified", () => {
      const { container } = render(<SignupForm onSubmit={mockOnSubmit} variant="inline" />)

      expect(screen.queryByText("Create your account")).not.toBeInTheDocument()
      expect(container.querySelector('[class*="card"]')).not.toBeInTheDocument()
    })

    it("renders sign in link when onSignin is provided", () => {
      render(<SignupForm onSubmit={mockOnSubmit} onSignin={mockOnSignin} />)

      expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    })

    it("pre-fills email when defaultEmail is provided", () => {
      render(<SignupForm onSubmit={mockOnSubmit} defaultEmail="test@example.com" />)

      const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement
      expect(emailInput.value).toBe("test@example.com")
    })
  })

  describe("Validation", () => {
    it("shows error when email is empty", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter your email/i)).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it("shows error when email is invalid", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/^email$/i)
      await user.type(emailInput, "invalid-email")

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it("shows error when password is empty", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/^email$/i)
      await user.type(emailInput, "test@example.com")

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please create a password/i)).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it("shows error when password is too short", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)

      await user.type(emailInput, "test@example.com")
      await user.type(passwordInput, "short1")

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/must be at least 8 characters/i)).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it("shows error when password has no number", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)

      await user.type(emailInput, "test@example.com")
      await user.type(passwordInput, "password")

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/must include at least one number/i)).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it("shows error when confirm password is empty", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)

      await user.type(emailInput, "test@example.com")
      await user.type(passwordInput, "password123")

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it("shows error when passwords don't match", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      await user.type(emailInput, "test@example.com")
      await user.type(passwordInput, "password123")
      await user.type(confirmPasswordInput, "different123")

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it("shows error when terms are not accepted", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      await user.type(emailInput, "test@example.com")
      await user.type(passwordInput, "password123")
      await user.type(confirmPasswordInput, "password123")

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/you must accept the terms/i)).toBeInTheDocument()
      })
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it("clears field error when user types", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      // Trigger validation error
      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter your email/i)).toBeInTheDocument()
      })

      // Type in email field
      const emailInput = screen.getByLabelText(/^email$/i)
      await user.type(emailInput, "test@example.com")

      // Error should be cleared
      expect(screen.queryByText(/please enter your email/i)).not.toBeInTheDocument()
    })
  })

  describe("Form submission", () => {
    it("calls onSubmit with correct data when form is valid", async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms of service/i)

      await user.type(firstNameInput, "John")
      await user.type(lastNameInput, "Doe")
      await user.type(emailInput, "john@example.com")
      await user.type(passwordInput, "password123")
      await user.type(confirmPasswordInput, "password123")
      await user.click(termsCheckbox)

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          password: "password123",
          acceptTerms: true,
        })
      })
    })

    it("works without optional name fields", async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockResolvedValue(undefined)
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms of service/i)

      await user.type(emailInput, "john@example.com")
      await user.type(passwordInput, "password123")
      await user.type(confirmPasswordInput, "password123")
      await user.click(termsCheckbox)

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          firstName: "",
          lastName: "",
          email: "john@example.com",
          password: "password123",
          acceptTerms: true,
        })
      })
    })

    it("shows loading state during submission", async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms of service/i)

      await user.type(emailInput, "john@example.com")
      await user.type(passwordInput, "password123")
      await user.type(confirmPasswordInput, "password123")
      await user.click(termsCheckbox)

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      expect(screen.getByText(/creating account/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it("shows error when email already exists", async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockRejectedValue(new Error("Email already exists"))
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms of service/i)

      await user.type(emailInput, "existing@example.com")
      await user.type(passwordInput, "password123")
      await user.type(confirmPasswordInput, "password123")
      await user.click(termsCheckbox)

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/already exists.*sign in instead/i)).toBeInTheDocument()
      })
    })

    it("shows generic error for other submission errors", async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockRejectedValue(new Error("Network error"))
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms of service/i)

      await user.type(emailInput, "test@example.com")
      await user.type(passwordInput, "password123")
      await user.type(confirmPasswordInput, "password123")
      await user.click(termsCheckbox)

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })
  })

  describe("OAuth", () => {
    it("calls onOAuthSignup with google when Google button is clicked", async () => {
      const user = userEvent.setup()
      mockOnOAuthSignup.mockResolvedValue(undefined)
      render(<SignupForm onOAuthSignup={mockOnOAuthSignup} showOAuth={true} />)

      const googleButton = screen.getByRole("button", { name: /continue with google/i })
      await user.click(googleButton)

      await waitFor(() => {
        expect(mockOnOAuthSignup).toHaveBeenCalledWith("google")
      })
    })

    it("calls onOAuthSignup with github when GitHub button is clicked", async () => {
      const user = userEvent.setup()
      mockOnOAuthSignup.mockResolvedValue(undefined)
      render(<SignupForm onOAuthSignup={mockOnOAuthSignup} showOAuth={true} />)

      const githubButton = screen.getByRole("button", { name: /continue with github/i })
      await user.click(githubButton)

      await waitFor(() => {
        expect(mockOnOAuthSignup).toHaveBeenCalledWith("github")
      })
    })

    it("shows consistent error message when OAuth fails", async () => {
      const user = userEvent.setup()
      mockOnOAuthSignup.mockRejectedValue(new Error("OAuth provider error"))
      render(<SignupForm onOAuthSignup={mockOnOAuthSignup} showOAuth={true} />)

      const googleButton = screen.getByRole("button", { name: /continue with google/i })
      await user.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText(/oauth sign-up failed/i)).toBeInTheDocument()
      })
    })

    it("disables all buttons during OAuth submission", async () => {
      const user = userEvent.setup()
      mockOnOAuthSignup.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))
      render(
        <SignupForm
          onSubmit={mockOnSubmit}
          onOAuthSignup={mockOnOAuthSignup}
          showOAuth={true}
        />
      )

      const googleButton = screen.getByRole("button", { name: /continue with google/i })
      await user.click(googleButton)

      expect(googleButton).toBeDisabled()
      expect(screen.getByRole("button", { name: /continue with github/i })).toBeDisabled()
      // During OAuth submission, button shows loading text
      expect(screen.getByRole("button", { name: /creating account/i })).toBeDisabled()
    })
  })

  describe("Password visibility toggle", () => {
    it("toggles password visibility when eye button is clicked", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement
      const toggleButton = screen.getAllByLabelText(/show password/i)[0]

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
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement
      const toggleButtons = screen.getAllByLabelText(/show password/i)
      const confirmToggleButton = toggleButtons[1]

      // Initially hidden
      expect(confirmPasswordInput.type).toBe("password")

      // Click to show
      await user.click(confirmToggleButton)
      expect(confirmPasswordInput.type).toBe("text")

      // Click to hide
      await user.click(confirmToggleButton)
      expect(confirmPasswordInput.type).toBe("password")
    })
  })

  describe("Password strength indicator", () => {
    it("shows password strength indicator when password is entered", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const passwordInput = screen.getByLabelText(/^password$/i)

      // No indicator initially
      expect(screen.queryByText(/password strength/i)).not.toBeInTheDocument()

      // Enter weak password
      await user.type(passwordInput, "pass1")
      expect(screen.getByText(/password strength: weak/i)).toBeInTheDocument()

      // Clear and enter stronger password
      await user.clear(passwordInput)
      await user.type(passwordInput, "password123")
      expect(screen.getByText(/password strength: fair/i)).toBeInTheDocument()

      // Clear and enter strong password
      await user.clear(passwordInput)
      await user.type(passwordInput, "P@ssw0rd123!")
      expect(screen.getByText(/password strength: strong/i)).toBeInTheDocument()
    })

    it("shows password requirements checklist", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const passwordInput = screen.getByLabelText(/^password$/i)

      // No checklist initially
      expect(screen.queryByText(/at least 8 characters/i)).not.toBeInTheDocument()

      // Enter password that fails both requirements
      await user.type(passwordInput, "pass")
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
      expect(screen.getByText(/contains a number/i)).toBeInTheDocument()

      // Clear and enter password that meets length but not number
      await user.clear(passwordInput)
      await user.type(passwordInput, "password")
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
      expect(screen.getByText(/contains a number/i)).toBeInTheDocument()

      // Clear and enter password that meets both
      await user.clear(passwordInput)
      await user.type(passwordInput, "password123")
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
      expect(screen.getByText(/contains a number/i)).toBeInTheDocument()
    })
  })

  describe("Terms and privacy links", () => {
    it("calls onViewTerms when terms link is clicked", async () => {
      const user = userEvent.setup()
      render(
        <SignupForm
          onSubmit={mockOnSubmit}
          onViewTerms={mockOnViewTerms}
          onViewPrivacy={mockOnViewPrivacy}
        />
      )

      // Terms link is nested in label, find by text content
      const termsLink = screen.getByText("Terms of Service", { selector: "button" })
      await user.click(termsLink)

      expect(mockOnViewTerms).toHaveBeenCalledTimes(1)
    })

    it("calls onViewPrivacy when privacy link is clicked", async () => {
      const user = userEvent.setup()
      render(
        <SignupForm
          onSubmit={mockOnSubmit}
          onViewTerms={mockOnViewTerms}
          onViewPrivacy={mockOnViewPrivacy}
        />
      )

      // Privacy link is nested in label, find by text content
      const privacyLink = screen.getByText("Privacy Policy", { selector: "button" })
      await user.click(privacyLink)

      expect(mockOnViewPrivacy).toHaveBeenCalledTimes(1)
    })

    it("renders terms as plain text when no callback provided", () => {
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const termsText = screen.getByText(/terms of service/i, { selector: "span" })
      expect(termsText).toBeInTheDocument()
      expect(termsText.tagName).toBe("SPAN")
    })
  })

  describe("Link handlers", () => {
    it("calls onSignin when sign in link is clicked", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} onSignin={mockOnSignin} />)

      const signinLink = screen.getByRole("button", { name: /sign in/i })
      await user.click(signinLink)

      expect(mockOnSignin).toHaveBeenCalledTimes(1)
    })
  })

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/^email$/i)
      expect(emailInput).toHaveAttribute("aria-required", "true")

      const passwordInput = screen.getByLabelText(/^password$/i)
      expect(passwordInput).toHaveAttribute("aria-required", "true")

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      expect(confirmPasswordInput).toHaveAttribute("aria-required", "true")

      const termsCheckbox = screen.getByLabelText(/terms of service/i)
      expect(termsCheckbox).toHaveAttribute("aria-required", "true")
    })

    it("associates error messages with inputs", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/^email$/i)
        const emailError = screen.getByText(/please enter your email/i)
        expect(emailInput).toHaveAttribute("aria-describedby")
        expect(emailError.id).toBeTruthy()
      })
    })

    it("announces form errors to screen readers", async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockRejectedValue(new Error("Something went wrong"))
      render(<SignupForm onSubmit={mockOnSubmit} />)

      // Fill form completely to trigger form-level error
      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms of service/i)

      await user.type(emailInput, "test@example.com")
      await user.type(passwordInput, "password123")
      await user.type(confirmPasswordInput, "password123")
      await user.click(termsCheckbox)

      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        const errorAlert = screen.getByRole("alert")
        expect(errorAlert).toHaveAttribute("aria-live", "assertive")
      })
    })

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} onSignin={mockOnSignin} />)

      const firstNameInput = screen.getByLabelText(/first name/i)

      // Tab through form
      await user.tab()
      expect(screen.getByRole("button", { name: /continue with google/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole("button", { name: /continue with github/i })).toHaveFocus()

      await user.tab()
      expect(firstNameInput).toHaveFocus()

      // Continue tabbing through all fields
      await user.tab() // last name
      await user.tab() // email
      await user.tab() // password
      await user.tab() // password toggle
      await user.tab() // confirm password
      await user.tab() // confirm password toggle
      await user.tab() // terms checkbox
      await user.tab() // submit button
      expect(screen.getByRole("button", { name: /create account/i })).toHaveFocus()
    })
  })

  describe("Terms checkbox behavior", () => {
    it("updates terms checkbox state correctly", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      const termsCheckbox = screen.getByLabelText(/terms of service/i)

      // Initially unchecked
      expect(termsCheckbox).not.toBeChecked()

      // Click to check
      await user.click(termsCheckbox)
      expect(termsCheckbox).toBeChecked()

      // Click to uncheck
      await user.click(termsCheckbox)
      expect(termsCheckbox).not.toBeChecked()
    })

    it("clears terms error when checkbox is checked", async () => {
      const user = userEvent.setup()
      render(<SignupForm onSubmit={mockOnSubmit} />)

      // Fill form except terms
      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      await user.type(emailInput, "test@example.com")
      await user.type(passwordInput, "password123")
      await user.type(confirmPasswordInput, "password123")

      // Submit to trigger terms error
      const submitButton = screen.getByRole("button", { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/you must accept the terms/i)).toBeInTheDocument()
      })

      // Check terms checkbox
      const termsCheckbox = screen.getByLabelText(/terms of service/i)
      await user.click(termsCheckbox)

      // Error should be cleared
      expect(screen.queryByText(/you must accept the terms/i)).not.toBeInTheDocument()
    })
  })
})
