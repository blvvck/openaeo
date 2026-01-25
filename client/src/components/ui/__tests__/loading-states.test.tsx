

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act, renderHook } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  LoadingSpinner,
  LoadingDots,
  LoadingBar,
  LoadingOverlay,
  LoadingButton,
  LoadingCard,
  LoadingPage,
  LoadingInline,
  LoadingSkeletonList,
  useLoadingState,
  loadingClasses,
} from "../loading-states"

// Mock prefersReducedMotion
vi.mock("@/lib/motion", async () => {
  const actual = await vi.importActual("@/lib/motion")
  return {
    ...actual,
    prefersReducedMotion: vi.fn(() => false),
  }
})

import { prefersReducedMotion } from "@/lib/motion"

describe("LoadingSpinner", () => {
  describe("Rendering", () => {
    it("renders spinner", () => {
      render(<LoadingSpinner />)
      expect(screen.getByRole("status")).toBeInTheDocument()
    })

    it("renders with screen reader text", () => {
      render(<LoadingSpinner label="Loading data" />)
      expect(screen.getByText("Loading data")).toBeInTheDocument()
    })
  })

  describe("Sizes", () => {
    it("renders xs size", () => {
      render(<LoadingSpinner size="xs" data-testid="spinner" />)
      const container = screen.getByTestId("spinner")
      expect(container.querySelector("svg")).toHaveClass("w-3", "h-3")
    })

    it("renders sm size", () => {
      render(<LoadingSpinner size="sm" data-testid="spinner" />)
      const container = screen.getByTestId("spinner")
      expect(container.querySelector("svg")).toHaveClass("w-4", "h-4")
    })

    it("renders md size (default)", () => {
      render(<LoadingSpinner data-testid="spinner" />)
      const container = screen.getByTestId("spinner")
      expect(container.querySelector("svg")).toHaveClass("w-6", "h-6")
    })

    it("renders lg size", () => {
      render(<LoadingSpinner size="lg" data-testid="spinner" />)
      const container = screen.getByTestId("spinner")
      expect(container.querySelector("svg")).toHaveClass("w-8", "h-8")
    })

    it("renders xl size", () => {
      render(<LoadingSpinner size="xl" data-testid="spinner" />)
      const container = screen.getByTestId("spinner")
      expect(container.querySelector("svg")).toHaveClass("w-12", "h-12")
    })
  })

  describe("Colors", () => {
    it("renders default color", () => {
      render(<LoadingSpinner data-testid="spinner" />)
      const container = screen.getByTestId("spinner")
      expect(container.querySelector("svg")).toHaveClass("text-muted-foreground")
    })

    it("renders primary color", () => {
      render(<LoadingSpinner color="primary" data-testid="spinner" />)
      const container = screen.getByTestId("spinner")
      expect(container.querySelector("svg")).toHaveClass("text-primary")
    })

    it("renders white color", () => {
      render(<LoadingSpinner color="white" data-testid="spinner" />)
      const container = screen.getByTestId("spinner")
      expect(container.querySelector("svg")).toHaveClass("text-white")
    })
  })

  describe("Accessibility", () => {
    it("has role=status", () => {
      render(<LoadingSpinner />)
      expect(screen.getByRole("status")).toBeInTheDocument()
    })

    it("has aria-label", () => {
      render(<LoadingSpinner label="Processing" />)
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Processing")
    })

    it("icon is aria-hidden", () => {
      render(<LoadingSpinner data-testid="spinner" />)
      const container = screen.getByTestId("spinner")
      expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    })
  })

  describe("Reduced Motion", () => {
    it("disables animation when reduced motion preferred", () => {
      vi.mocked(prefersReducedMotion).mockReturnValue(true)
      render(<LoadingSpinner data-testid="spinner" />)
      const container = screen.getByTestId("spinner")
      expect(container.querySelector("svg")).toHaveClass("animate-none")
      vi.mocked(prefersReducedMotion).mockReturnValue(false)
    })
  })
})

describe("LoadingDots", () => {
  describe("Rendering", () => {
    it("renders three dots", () => {
      render(<LoadingDots data-testid="dots" />)
      const container = screen.getByTestId("dots")
      expect(container.querySelectorAll(".rounded-full")).toHaveLength(3)
    })

    it("has screen reader text", () => {
      render(<LoadingDots label="Loading..." />)
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  describe("Sizes", () => {
    it("renders small dots", () => {
      render(<LoadingDots size="sm" data-testid="dots" />)
      const container = screen.getByTestId("dots")
      expect(container.querySelector(".rounded-full")).toHaveClass("w-1.5", "h-1.5")
    })

    it("renders medium dots", () => {
      render(<LoadingDots size="md" data-testid="dots" />)
      const container = screen.getByTestId("dots")
      expect(container.querySelector(".rounded-full")).toHaveClass("w-2", "h-2")
    })

    it("renders large dots", () => {
      render(<LoadingDots size="lg" data-testid="dots" />)
      const container = screen.getByTestId("dots")
      expect(container.querySelector(".rounded-full")).toHaveClass("w-3", "h-3")
    })
  })

  describe("Colors", () => {
    it("renders default color", () => {
      render(<LoadingDots data-testid="dots" />)
      const container = screen.getByTestId("dots")
      expect(container.querySelector(".rounded-full")).toHaveClass("bg-muted-foreground")
    })

    it("renders primary color", () => {
      render(<LoadingDots color="primary" data-testid="dots" />)
      const container = screen.getByTestId("dots")
      expect(container.querySelector(".rounded-full")).toHaveClass("bg-primary")
    })
  })

  describe("Accessibility", () => {
    it("has role=status", () => {
      render(<LoadingDots />)
      expect(screen.getByRole("status")).toBeInTheDocument()
    })
  })
})

describe("LoadingBar", () => {
  describe("Rendering", () => {
    it("renders progress bar", () => {
      render(<LoadingBar progress={50} />)
      expect(screen.getByRole("progressbar")).toBeInTheDocument()
    })

    it("shows percentage when enabled", () => {
      render(<LoadingBar progress={75} showPercentage />)
      expect(screen.getByText("75%")).toBeInTheDocument()
    })

    it("does not show percentage for indeterminate", () => {
      render(<LoadingBar showPercentage />)
      expect(screen.queryByText(/%/)).not.toBeInTheDocument()
    })
  })

  describe("Heights", () => {
    it("renders small height", () => {
      render(<LoadingBar height="sm" progress={50} data-testid="bar" />)
      const container = screen.getByTestId("bar")
      expect(container.querySelector("[role='progressbar']")).toHaveClass("h-1")
    })

    it("renders medium height", () => {
      render(<LoadingBar height="md" progress={50} data-testid="bar" />)
      const container = screen.getByTestId("bar")
      expect(container.querySelector("[role='progressbar']")).toHaveClass("h-2")
    })

    it("renders large height", () => {
      render(<LoadingBar height="lg" progress={50} data-testid="bar" />)
      const container = screen.getByTestId("bar")
      expect(container.querySelector("[role='progressbar']")).toHaveClass("h-3")
    })
  })

  describe("Progress", () => {
    it("sets progress width", () => {
      render(<LoadingBar progress={60} data-testid="bar" />)
      const container = screen.getByTestId("bar")
      const bar = container.querySelector(".bg-primary")
      expect(bar).toHaveStyle({ width: "60%" })
    })

    it("renders indeterminate when no progress", () => {
      render(<LoadingBar data-testid="bar" />)
      const container = screen.getByTestId("bar")
      const bar = container.querySelector(".bg-primary")
      expect(bar).toHaveStyle({ width: "30%" })
    })
  })

  describe("Accessibility", () => {
    it("has aria-valuenow when determinate", () => {
      render(<LoadingBar progress={50} />)
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50")
    })

    it("has aria-valuemin and aria-valuemax", () => {
      render(<LoadingBar progress={50} />)
      const bar = screen.getByRole("progressbar")
      expect(bar).toHaveAttribute("aria-valuemin", "0")
      expect(bar).toHaveAttribute("aria-valuemax", "100")
    })

    it("has aria-label", () => {
      render(<LoadingBar label="Uploading" />)
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-label", "Uploading")
    })
  })
})

describe("LoadingOverlay", () => {
  describe("Visibility", () => {
    it("shows overlay when isLoading is true", () => {
      render(
        <LoadingOverlay isLoading data-testid="overlay">
          <div>Content</div>
        </LoadingOverlay>
      )
      // There's both an overlay status and spinner status
      const statuses = screen.getAllByRole("status")
      expect(statuses.length).toBeGreaterThan(0)
    })

    it("hides overlay when isLoading is false", () => {
      render(
        <LoadingOverlay isLoading={false} data-testid="overlay">
          <div>Content</div>
        </LoadingOverlay>
      )
      expect(screen.queryByRole("status")).not.toBeInTheDocument()
    })

    it("shows message when provided", () => {
      render(
        <LoadingOverlay isLoading message="Please wait...">
          <div>Content</div>
        </LoadingOverlay>
      )
      expect(screen.getByText("Please wait...")).toBeInTheDocument()
    })
  })

  describe("Content", () => {
    it("renders children", () => {
      render(
        <LoadingOverlay isLoading={false}>
          <div data-testid="child">Content</div>
        </LoadingOverlay>
      )
      expect(screen.getByTestId("child")).toBeInTheDocument()
    })

    it("children visible when loading", () => {
      render(
        <LoadingOverlay isLoading>
          <div data-testid="child">Content</div>
        </LoadingOverlay>
      )
      expect(screen.getByTestId("child")).toBeInTheDocument()
    })
  })

  describe("Options", () => {
    it("applies blur when enabled", () => {
      render(
        <LoadingOverlay isLoading blur>
          <div>Content</div>
        </LoadingOverlay>
      )
      // Find the overlay status div (has aria-live)
      const overlay = screen.getByLabelText("Loading")
      expect(overlay.parentElement).toHaveClass("backdrop-blur-sm")
    })

    it("applies fullScreen positioning", () => {
      render(
        <LoadingOverlay isLoading fullScreen>
          <div>Content</div>
        </LoadingOverlay>
      )
      // The parent of spinner should be fixed
      const overlay = screen.getByLabelText("Loading")
      expect(overlay.parentElement).toHaveClass("fixed", "inset-0")
    })
  })
})

describe("LoadingButton", () => {
  describe("Rendering", () => {
    it("renders children when not loading", () => {
      render(<LoadingButton>Submit</LoadingButton>)
      expect(screen.getByText("Submit")).toBeInTheDocument()
    })

    it("shows spinner when loading", () => {
      render(<LoadingButton isLoading>Submit</LoadingButton>)
      const button = screen.getByRole("button")
      expect(button.querySelector("svg")).toHaveClass("animate-spin")
    })

    it("shows loading text when provided", () => {
      render(
        <LoadingButton isLoading loadingText="Submitting...">
          Submit
        </LoadingButton>
      )
      expect(screen.getByText("Submitting...")).toBeInTheDocument()
    })

    it("shows children as loading text when not provided", () => {
      render(<LoadingButton isLoading>Submit</LoadingButton>)
      expect(screen.getByText("Submit")).toBeInTheDocument()
    })
  })

  describe("Disabled State", () => {
    it("is disabled when loading", () => {
      render(<LoadingButton isLoading>Submit</LoadingButton>)
      expect(screen.getByRole("button")).toBeDisabled()
    })

    it("is disabled when disabled prop is true", () => {
      render(<LoadingButton disabled>Submit</LoadingButton>)
      expect(screen.getByRole("button")).toBeDisabled()
    })
  })

  describe("Spinner Position", () => {
    it("shows spinner on left by default", () => {
      render(<LoadingButton isLoading>Submit</LoadingButton>)
      const button = screen.getByRole("button")
      const svg = button.querySelector("svg")
      expect(svg).toHaveClass("mr-2")
    })

    it("shows spinner on right when specified", () => {
      render(
        <LoadingButton isLoading spinnerPosition="right">
          Submit
        </LoadingButton>
      )
      const button = screen.getByRole("button")
      const svg = button.querySelector("svg")
      expect(svg).toHaveClass("ml-2")
    })
  })

  describe("Accessibility", () => {
    it("has aria-busy when loading", () => {
      render(<LoadingButton isLoading>Submit</LoadingButton>)
      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true")
    })

    it("does not have aria-busy when not loading", () => {
      render(<LoadingButton>Submit</LoadingButton>)
      expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy")
    })
  })
})

describe("LoadingCard", () => {
  it("renders skeleton card", () => {
    render(<LoadingCard data-testid="card" />)
    expect(screen.getByTestId("card")).toBeInTheDocument()
  })

  it("renders with header", () => {
    render(<LoadingCard showHeader data-testid="card" />)
    expect(screen.getByTestId("card")).toBeInTheDocument()
  })

  it("renders with image", () => {
    render(<LoadingCard showImage imageHeight={150} data-testid="card" />)
    expect(screen.getByTestId("card")).toBeInTheDocument()
  })

  it("renders with footer", () => {
    render(<LoadingCard showFooter data-testid="card" />)
    expect(screen.getByTestId("card")).toBeInTheDocument()
  })

  it("has role=status", () => {
    render(<LoadingCard data-testid="card" />)
    expect(screen.getByTestId("card")).toHaveAttribute("role", "status")
  })
})

describe("LoadingPage", () => {
  it("renders loading page", () => {
    render(<LoadingPage />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("shows custom message", () => {
    render(<LoadingPage message="Fetching data..." />)
    expect(screen.getByText("Fetching data...")).toBeInTheDocument()
  })

  it("shows progress bar when enabled", () => {
    render(<LoadingPage showProgress progress={50} />)
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
  })

  it("shows logo when enabled", () => {
    render(<LoadingPage showLogo data-testid="page" />)
    expect(screen.getByTestId("page")).toBeInTheDocument()
  })

  it("shows custom logo", () => {
    render(
      <LoadingPage
        showLogo
        logo={<div data-testid="custom-logo">Logo</div>}
      />
    )
    expect(screen.getByTestId("custom-logo")).toBeInTheDocument()
  })

  describe("Accessibility", () => {
    it("has role=status", () => {
      render(<LoadingPage data-testid="page" />)
      expect(screen.getByTestId("page")).toHaveAttribute("role", "status")
    })

    it("has aria-live=polite", () => {
      render(<LoadingPage data-testid="page" />)
      expect(screen.getByTestId("page")).toHaveAttribute("aria-live", "polite")
    })
  })
})

describe("LoadingInline", () => {
  it("renders inline loading", () => {
    render(<LoadingInline data-testid="inline" />)
    expect(screen.getByTestId("inline")).toBeInTheDocument()
    // Check for the visible loading text (not the sr-only one)
    const inline = screen.getByTestId("inline")
    expect(inline.querySelector(".text-sm")).toHaveTextContent("Loading...")
  })

  it("shows custom text", () => {
    render(<LoadingInline text="Saving..." data-testid="inline" />)
    const inline = screen.getByTestId("inline")
    expect(inline.querySelector(".text-sm")).toHaveTextContent("Saving...")
  })

  it("has role=status", () => {
    render(<LoadingInline data-testid="inline" />)
    // The outer span has role=status
    expect(screen.getByTestId("inline")).toHaveAttribute("role", "status")
  })
})

describe("LoadingSkeletonList", () => {
  it("renders list items", () => {
    render(<LoadingSkeletonList count={3} data-testid="list" />)
    const list = screen.getByTestId("list")
    expect(list.children).toHaveLength(3)
  })

  it("renders with avatars", () => {
    render(<LoadingSkeletonList count={2} showAvatar data-testid="list" />)
    const list = screen.getByTestId("list")
    expect(list.querySelectorAll(".rounded-full")).toHaveLength(2)
  })

  it("renders without avatars", () => {
    render(<LoadingSkeletonList count={2} showAvatar={false} data-testid="list" />)
    const list = screen.getByTestId("list")
    // No circular skeletons for avatars
    expect(list.querySelectorAll(".rounded-full")).toHaveLength(0)
  })

  it("has role=status", () => {
    render(<LoadingSkeletonList data-testid="list" />)
    expect(screen.getByTestId("list")).toHaveAttribute("role", "status")
  })

  it("has aria-label", () => {
    render(<LoadingSkeletonList data-testid="list" />)
    expect(screen.getByTestId("list")).toHaveAttribute("aria-label", "Loading list...")
  })
})

describe("useLoadingState", () => {
  describe("Initial State", () => {
    it("starts not loading by default", () => {
      const { result } = renderHook(() => useLoadingState())
      expect(result.current.isLoading).toBe(false)
    })

    it("starts loading when initialLoading is true", () => {
      const { result } = renderHook(() =>
        useLoadingState({ initialLoading: true })
      )
      expect(result.current.isLoading).toBe(true)
    })

    it("has no error by default", () => {
      const { result } = renderHook(() => useLoadingState())
      expect(result.current.error).toBeNull()
    })
  })

  describe("startLoading", () => {
    it("sets isLoading to true", () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.startLoading()
      })

      expect(result.current.isLoading).toBe(true)
    })

    it("clears any existing error", () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.setError(new Error("test"))
        result.current.startLoading()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe("stopLoading", () => {
    it("sets isLoading to false", () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.startLoading()
        result.current.stopLoading()
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe("setError", () => {
    it("sets error", () => {
      const { result } = renderHook(() => useLoadingState())
      const error = new Error("Something went wrong")

      act(() => {
        result.current.setError(error)
      })

      expect(result.current.error).toBe(error)
    })

    it("stops loading", () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.startLoading()
        result.current.setError(new Error("test"))
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe("clearError", () => {
    it("clears error", () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.setError(new Error("test"))
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe("reset", () => {
    it("resets to initial state", () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.startLoading()
        result.current.setError(new Error("test"))
        result.current.reset()
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe("withLoading", () => {
    it("sets loading during async function", async () => {
      const { result } = renderHook(() => useLoadingState())

      // Create a promise we can control
      let resolvePromise: (value: string) => void
      const controlledPromise = new Promise<string>((resolve) => {
        resolvePromise = resolve
      })

      let loadingDuringCall = false

      act(() => {
        // Start the withLoading call
        result.current.withLoading(async () => {
          loadingDuringCall = true
          return await controlledPromise
        })
      })

      // Check loading is true while promise is pending
      expect(result.current.isLoading).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolvePromise!("success")
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.isLoading).toBe(false)
      expect(loadingDuringCall).toBe(true)
    })

    it("returns result on success", async () => {
      const { result } = renderHook(() => useLoadingState())

      let returnValue: string | undefined
      await act(async () => {
        returnValue = await result.current.withLoading(async () => "success")
      })

      expect(returnValue).toBe("success")
    })

    it("sets error on failure", async () => {
      const { result } = renderHook(() => useLoadingState())
      const testError = new Error("Test error")

      await act(async () => {
        await result.current.withLoading(async () => {
          throw testError
        })
      })

      expect(result.current.error).toBe(testError)
      expect(result.current.isLoading).toBe(false)
    })

    it("returns undefined on failure", async () => {
      const { result } = renderHook(() => useLoadingState())

      let returnValue: string | undefined = "initial"
      await act(async () => {
        returnValue = await result.current.withLoading(async () => {
          throw new Error("Test error")
        })
      })

      expect(returnValue).toBeUndefined()
    })
  })
})

describe("loadingClasses", () => {
  it("exports pulse class", () => {
    expect(loadingClasses.pulse).toBe("animate-pulse")
  })

  it("exports spin class", () => {
    expect(loadingClasses.spin).toBe("animate-spin")
  })

  it("exports bounce class", () => {
    expect(loadingClasses.bounce).toBe("animate-bounce")
  })

  it("exports shimmer class", () => {
    expect(loadingClasses.shimmer).toContain("animate-[shimmer")
  })

  it("exports overlay class", () => {
    expect(loadingClasses.overlay).toContain("fixed")
    expect(loadingClasses.overlay).toContain("backdrop-blur")
  })

  it("exports center class", () => {
    expect(loadingClasses.center).toContain("flex")
    expect(loadingClasses.center).toContain("items-center")
  })
})

describe("Custom className", () => {
  it("LoadingSpinner accepts custom className", () => {
    render(<LoadingSpinner className="custom-class" data-testid="spinner" />)
    expect(screen.getByTestId("spinner")).toHaveClass("custom-class")
  })

  it("LoadingDots accepts custom className", () => {
    render(<LoadingDots className="custom-class" data-testid="dots" />)
    expect(screen.getByTestId("dots")).toHaveClass("custom-class")
  })

  it("LoadingBar accepts custom className", () => {
    render(<LoadingBar className="custom-class" data-testid="bar" />)
    expect(screen.getByTestId("bar")).toHaveClass("custom-class")
  })

  it("LoadingOverlay accepts custom className", () => {
    render(
      <LoadingOverlay isLoading={false} className="custom-class" data-testid="overlay">
        <div>Content</div>
      </LoadingOverlay>
    )
    expect(screen.getByTestId("overlay")).toHaveClass("custom-class")
  })
})
