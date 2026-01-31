

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardSkeleton,
} from "../card"

describe("Card", () => {
  describe("Variants", () => {
    it("renders default variant with shadow in light mode", () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("shadow-sm")
    })

    it("renders elevated variant with more shadow", () => {
      render(<Card variant="elevated" data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("shadow-md")
    })

    it("renders outline variant with border only", () => {
      render(<Card variant="outline" data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("border-border")
      expect(card).toHaveClass("shadow-none")
    })

    it("renders filled variant with background", () => {
      render(<Card variant="filled" data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("bg-muted/50")
    })

    it("renders ghost variant with minimal styling", () => {
      render(<Card variant="ghost" data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("bg-transparent")
      expect(card).toHaveClass("border-none")
    })
  })

  describe("Interactive", () => {
    it("applies interactive classes when interactive=true", () => {
      render(<Card interactive data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("cursor-pointer")
      expect(card).toHaveClass("hover:-translate-y-0.5")
    })

    it("sets tabIndex=0 for keyboard navigation", () => {
      render(<Card interactive data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveAttribute("tabIndex", "0")
    })

    it("sets role=button for interactive cards", () => {
      render(<Card interactive data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveAttribute("role", "button")
    })

    it("is keyboard focusable", () => {
      render(<Card interactive data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      card.focus()
      expect(document.activeElement).toBe(card)
    })

    it("has focus ring styles", () => {
      render(<Card interactive data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("focus-visible:ring-2")
    })
  })

  describe("Loading State", () => {
    it("shows loading overlay when isLoading=true", () => {
      render(<Card isLoading data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      const overlay = card.querySelector("[aria-busy='true']")
      expect(overlay).toBeInTheDocument()
    })

    it("shows spinner in loading state", () => {
      render(<Card isLoading data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      const spinner = card.querySelector(".animate-spin")
      expect(spinner).toBeInTheDocument()
    })

    it("shows loading text when provided", () => {
      render(<Card isLoading loadingText="Loading...">Content</Card>)
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })

    it("has aria-live for loading announcements", () => {
      render(<Card isLoading data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      const overlay = card.querySelector("[aria-live='polite']")
      expect(overlay).toBeInTheDocument()
    })
  })

  describe("Semantic Elements", () => {
    it("renders as div by default", () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card.tagName).toBe("DIV")
    })

    it("renders as article when specified", () => {
      render(<Card as="article" data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card.tagName).toBe("ARTICLE")
    })

    it("renders as section when specified", () => {
      render(<Card as="section" data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card.tagName).toBe("SECTION")
    })
  })

  describe("Custom className", () => {
    it("merges custom className", () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("custom-class")
      expect(card).toHaveClass("rounded-xl") // Still has base styles
    })
  })
})

describe("CardHeader", () => {
  it("renders children", () => {
    render(<CardHeader>Header Content</CardHeader>)
    expect(screen.getByText("Header Content")).toBeInTheDocument()
  })

  it("has default padding", () => {
    render(<CardHeader data-testid="header">Header</CardHeader>)
    const header = screen.getByTestId("header")
    expect(header).toHaveClass("p-6")
  })

  it("supports size prop for padding", () => {
    render(<CardHeader size="sm" data-testid="header">Header</CardHeader>)
    const header = screen.getByTestId("header")
    expect(header).toHaveClass("p-4")
  })
})

describe("CardTitle", () => {
  it("renders as h3 by default", () => {
    render(<CardTitle>Title</CardTitle>)
    const title = screen.getByText("Title")
    expect(title.tagName).toBe("H3")
  })

  it("renders as specified heading level", () => {
    render(<CardTitle as="h2">Title</CardTitle>)
    const title = screen.getByText("Title")
    expect(title.tagName).toBe("H2")
  })

  it("has proper typography styles", () => {
    render(<CardTitle data-testid="title">Title</CardTitle>)
    const title = screen.getByTestId("title")
    expect(title).toHaveClass("font-semibold")
    expect(title).toHaveClass("leading-none")
  })
})

describe("CardDescription", () => {
  it("renders as paragraph", () => {
    render(<CardDescription>Description</CardDescription>)
    const desc = screen.getByText("Description")
    expect(desc.tagName).toBe("P")
  })

  it("has muted text color", () => {
    render(<CardDescription data-testid="desc">Description</CardDescription>)
    const desc = screen.getByTestId("desc")
    expect(desc).toHaveClass("text-muted-foreground")
  })
})

describe("CardContent", () => {
  it("renders children", () => {
    render(<CardContent>Content</CardContent>)
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("has default padding without top", () => {
    render(<CardContent data-testid="content">Content</CardContent>)
    const content = screen.getByTestId("content")
    expect(content).toHaveClass("p-6")
    expect(content).toHaveClass("pt-0")
  })
})

describe("CardFooter", () => {
  it("renders children", () => {
    render(<CardFooter>Footer</CardFooter>)
    expect(screen.getByText("Footer")).toBeInTheDocument()
  })

  it("has flex layout", () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>)
    const footer = screen.getByTestId("footer")
    expect(footer).toHaveClass("flex")
    expect(footer).toHaveClass("items-center")
  })
})

describe("CardSkeleton", () => {
  it("renders with animate-pulse", () => {
    render(<CardSkeleton data-testid="skeleton" />)
    const skeleton = screen.getByTestId("skeleton")
    expect(skeleton).toHaveClass("animate-pulse")
  })

  it("shows header skeleton by default", () => {
    render(<CardSkeleton data-testid="skeleton" />)
    const skeleton = screen.getByTestId("skeleton")
    // Header contains two skeleton bars
    const skeletonBars = skeleton.querySelectorAll(".bg-muted")
    expect(skeletonBars.length).toBeGreaterThanOrEqual(2)
  })

  it("hides header when showHeader=false", () => {
    const { container } = render(<CardSkeleton showHeader={false} />)
    // Should not have header skeleton bars at the top
    const headers = container.querySelectorAll("[class*='space-y-1.5']")
    expect(headers.length).toBe(0)
  })

  it("renders specified number of content lines", () => {
    render(<CardSkeleton lines={5} data-testid="skeleton" />)
    const skeleton = screen.getByTestId("skeleton")
    const contentBars = skeleton.querySelectorAll(".space-y-2 > div")
    expect(contentBars.length).toBe(5)
  })

  it("shows footer when showFooter=true", () => {
    render(<CardSkeleton showFooter data-testid="skeleton" />)
    const skeleton = screen.getByTestId("skeleton")
    // Footer has a button-sized skeleton
    const footerBar = skeleton.querySelector(".h-9.w-24")
    expect(footerBar).toBeInTheDocument()
  })
})

describe("Full Card Composition", () => {
  it("renders complete card with all parts", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description text</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    )

    expect(screen.getByText("Card Title")).toBeInTheDocument()
    expect(screen.getByText("Card description text")).toBeInTheDocument()
    expect(screen.getByText("Card content goes here")).toBeInTheDocument()
    expect(screen.getByText("Action")).toBeInTheDocument()
  })
})
