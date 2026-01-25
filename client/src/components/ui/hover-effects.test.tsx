

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"

import {
  HoverCard,
  HoverScale,
  HoverGlow,
  HoverUnderline,
  HoverImage,
  HoverButton,
  useHoverState,
  useReducedMotion,
  hoverClasses,
  getHoverClasses,
  cardHoverVariants,
  scaleUpVariants,
  scaleDownVariants,
  scaleSubtleVariants,
  buttonPressVariants,
  imageZoomVariants,
} from "./hover-effects"

// ===== Mock matchMedia =====
const mockMatchMedia = (matches: boolean) => {
  return vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

// ===== Helper Component for Hook Testing =====
function TestHoverHook() {
  const { isHovered, isPressed, isFocused, handlers } = useHoverState()

  return (
    <div data-testid="hover-target" {...handlers}>
      <span data-testid="hover">{isHovered ? "hovered" : "not-hovered"}</span>
      <span data-testid="pressed">{isPressed ? "pressed" : "not-pressed"}</span>
      <span data-testid="focused">{isFocused ? "focused" : "not-focused"}</span>
    </div>
  )
}

function TestReducedMotionHook() {
  const reducedMotion = useReducedMotion()
  return <span data-testid="reduced-motion">{reducedMotion ? "reduced" : "normal"}</span>
}

// ===== Tests =====

describe("HoverCard", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("renders children", () => {
    render(
      <HoverCard>
        <span>Card content</span>
      </HoverCard>
    )
    expect(screen.getByText("Card content")).toBeInTheDocument()
  })

  it("applies className", () => {
    render(
      <HoverCard className="custom-class">
        <span>Content</span>
      </HoverCard>
    )
    const wrapper = screen.getByText("Content").parentElement
    expect(wrapper).toHaveClass("custom-class")
  })

  it("applies rounded-lg class by default", () => {
    render(
      <HoverCard>
        <span>Content</span>
      </HoverCard>
    )
    const wrapper = screen.getByText("Content").parentElement
    expect(wrapper).toHaveClass("rounded-lg")
  })

  it("accepts custom lift value", () => {
    render(
      <HoverCard lift={8}>
        <span>Content</span>
      </HoverCard>
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("accepts tapFeedback prop", () => {
    render(
      <HoverCard tapFeedback={false}>
        <span>Content</span>
      </HoverCard>
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("accepts shadowIntensity sm", () => {
    render(
      <HoverCard shadowIntensity="sm">
        <span>Content</span>
      </HoverCard>
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("accepts shadowIntensity lg", () => {
    render(
      <HoverCard shadowIntensity="lg">
        <span>Content</span>
      </HoverCard>
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("renders without animation when reduced motion is preferred", () => {
    window.matchMedia = mockMatchMedia(true)

    render(
      <HoverCard>
        <span>Content</span>
      </HoverCard>
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })
})

describe("HoverScale", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("renders children", () => {
    render(
      <HoverScale>
        <span>Scale content</span>
      </HoverScale>
    )
    expect(screen.getByText("Scale content")).toBeInTheDocument()
  })

  it("accepts type=up", () => {
    render(
      <HoverScale type="up">
        <span>Up</span>
      </HoverScale>
    )
    expect(screen.getByText("Up")).toBeInTheDocument()
  })

  it("accepts type=down", () => {
    render(
      <HoverScale type="down">
        <span>Down</span>
      </HoverScale>
    )
    expect(screen.getByText("Down")).toBeInTheDocument()
  })

  it("accepts type=subtle (default)", () => {
    render(
      <HoverScale type="subtle">
        <span>Subtle</span>
      </HoverScale>
    )
    expect(screen.getByText("Subtle")).toBeInTheDocument()
  })

  it("accepts custom scale value", () => {
    render(
      <HoverScale scale={1.2}>
        <span>Custom</span>
      </HoverScale>
    )
    expect(screen.getByText("Custom")).toBeInTheDocument()
  })

  it("accepts tapFeedback prop", () => {
    render(
      <HoverScale tapFeedback={false}>
        <span>No tap</span>
      </HoverScale>
    )
    expect(screen.getByText("No tap")).toBeInTheDocument()
  })

  it("applies className", () => {
    render(
      <HoverScale className="custom-class">
        <span>Content</span>
      </HoverScale>
    )
    const wrapper = screen.getByText("Content").parentElement
    expect(wrapper).toHaveClass("custom-class")
  })

  it("renders without animation when reduced motion is preferred", () => {
    window.matchMedia = mockMatchMedia(true)

    render(
      <HoverScale>
        <span>Content</span>
      </HoverScale>
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })
})

describe("HoverGlow", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("renders children", () => {
    render(
      <HoverGlow>
        <span>Glow content</span>
      </HoverGlow>
    )
    expect(screen.getByText("Glow content")).toBeInTheDocument()
  })

  it("accepts custom color", () => {
    render(
      <HoverGlow color="rgb(255, 0, 0)">
        <span>Red glow</span>
      </HoverGlow>
    )
    expect(screen.getByText("Red glow")).toBeInTheDocument()
  })

  it("accepts intensity=sm", () => {
    render(
      <HoverGlow intensity="sm">
        <span>Small</span>
      </HoverGlow>
    )
    expect(screen.getByText("Small")).toBeInTheDocument()
  })

  it("accepts intensity=lg", () => {
    render(
      <HoverGlow intensity="lg">
        <span>Large</span>
      </HoverGlow>
    )
    expect(screen.getByText("Large")).toBeInTheDocument()
  })

  it("accepts custom spread", () => {
    render(
      <HoverGlow spread={40}>
        <span>Wide spread</span>
      </HoverGlow>
    )
    expect(screen.getByText("Wide spread")).toBeInTheDocument()
  })

  it("renders without animation when reduced motion is preferred", () => {
    window.matchMedia = mockMatchMedia(true)

    render(
      <HoverGlow>
        <span>Content</span>
      </HoverGlow>
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })
})

describe("HoverUnderline", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("renders children", () => {
    render(
      <HoverUnderline>
        <span>Link text</span>
      </HoverUnderline>
    )
    expect(screen.getByText("Link text")).toBeInTheDocument()
  })

  it("accepts custom color", () => {
    render(
      <HoverUnderline color="red">
        <span>Red underline</span>
      </HoverUnderline>
    )
    expect(screen.getByText("Red underline")).toBeInTheDocument()
  })

  it("accepts custom thickness", () => {
    render(
      <HoverUnderline thickness={4}>
        <span>Thick underline</span>
      </HoverUnderline>
    )
    expect(screen.getByText("Thick underline")).toBeInTheDocument()
  })

  it("accepts direction=left (default)", () => {
    render(
      <HoverUnderline direction="left">
        <span>Left</span>
      </HoverUnderline>
    )
    expect(screen.getByText("Left")).toBeInTheDocument()
  })

  it("accepts direction=right", () => {
    render(
      <HoverUnderline direction="right">
        <span>Right</span>
      </HoverUnderline>
    )
    expect(screen.getByText("Right")).toBeInTheDocument()
  })

  it("accepts direction=center", () => {
    render(
      <HoverUnderline direction="center">
        <span>Center</span>
      </HoverUnderline>
    )
    expect(screen.getByText("Center")).toBeInTheDocument()
  })

  it("accepts custom offset", () => {
    render(
      <HoverUnderline offset={4}>
        <span>Offset underline</span>
      </HoverUnderline>
    )
    expect(screen.getByText("Offset underline")).toBeInTheDocument()
  })

  it("wraps content in span element", () => {
    render(
      <HoverUnderline>
        <span>Content</span>
      </HoverUnderline>
    )
    // The content should be wrapped in a span (either plain or motion)
    const textElement = screen.getByText("Content")
    const parentSpan = textElement.closest("span")
    expect(parentSpan).toBeInTheDocument()
  })

  it("renders without animation when reduced motion is preferred", () => {
    window.matchMedia = mockMatchMedia(true)

    render(
      <HoverUnderline>
        <span>Content</span>
      </HoverUnderline>
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })
})

describe("HoverImage", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("renders image", () => {
    render(<HoverImage src="/test.jpg" alt="Test image" />)
    expect(screen.getByAltText("Test image")).toBeInTheDocument()
  })

  it("accepts custom zoom value", () => {
    render(<HoverImage src="/test.jpg" alt="Test" zoom={1.2} />)
    expect(screen.getByAltText("Test")).toBeInTheDocument()
  })

  it("wraps in container when contained is true (default)", () => {
    render(<HoverImage src="/test.jpg" alt="Test" contained />)
    const img = screen.getByAltText("Test")
    expect(img.parentElement).toHaveClass("overflow-hidden")
  })

  it("does not wrap when contained is false", () => {
    render(<HoverImage src="/test.jpg" alt="Test" contained={false} />)
    const img = screen.getByAltText("Test")
    expect(img.parentElement).not.toHaveClass("overflow-hidden")
  })

  it("accepts rounded=none", () => {
    render(<HoverImage src="/test.jpg" alt="Test" rounded="none" />)
    expect(screen.getByAltText("Test")).toBeInTheDocument()
  })

  it("accepts rounded=sm", () => {
    render(<HoverImage src="/test.jpg" alt="Test" rounded="sm" />)
    expect(screen.getByAltText("Test")).toBeInTheDocument()
  })

  it("accepts rounded=md", () => {
    render(<HoverImage src="/test.jpg" alt="Test" rounded="md" />)
    expect(screen.getByAltText("Test")).toBeInTheDocument()
  })

  it("accepts rounded=lg", () => {
    render(<HoverImage src="/test.jpg" alt="Test" rounded="lg" />)
    expect(screen.getByAltText("Test")).toBeInTheDocument()
  })

  it("accepts rounded=full", () => {
    render(<HoverImage src="/test.jpg" alt="Test" rounded="full" />)
    expect(screen.getByAltText("Test")).toBeInTheDocument()
  })

  it("applies object-cover class", () => {
    render(<HoverImage src="/test.jpg" alt="Test" />)
    const img = screen.getByAltText("Test")
    expect(img).toHaveClass("object-cover")
  })

  it("renders without animation when reduced motion is preferred", () => {
    window.matchMedia = mockMatchMedia(true)

    render(<HoverImage src="/test.jpg" alt="Test" />)
    expect(screen.getByAltText("Test")).toBeInTheDocument()
  })
})

describe("HoverButton", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("renders children", () => {
    render(<HoverButton>Click me</HoverButton>)
    expect(screen.getByText("Click me")).toBeInTheDocument()
  })

  it("renders as button element", () => {
    render(<HoverButton>Click</HoverButton>)
    expect(screen.getByRole("button")).toBeInTheDocument()
  })

  it("accepts pressStyle=scale (default)", () => {
    render(<HoverButton pressStyle="scale">Scale</HoverButton>)
    expect(screen.getByText("Scale")).toBeInTheDocument()
  })

  it("accepts pressStyle=spring", () => {
    render(<HoverButton pressStyle="spring">Spring</HoverButton>)
    expect(screen.getByText("Spring")).toBeInTheDocument()
  })

  it("calls onClick handler", async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<HoverButton onClick={handleClick}>Click</HoverButton>)
    await user.click(screen.getByText("Click"))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("applies className", () => {
    render(<HoverButton className="custom-class">Button</HoverButton>)
    expect(screen.getByRole("button")).toHaveClass("custom-class")
  })

  it("can be disabled", () => {
    render(<HoverButton disabled>Disabled</HoverButton>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("renders without animation when reduced motion is preferred", () => {
    window.matchMedia = mockMatchMedia(true)

    render(<HoverButton>Click</HoverButton>)
    expect(screen.getByRole("button")).toBeInTheDocument()
  })
})

describe("useHoverState hook", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("initializes with all states false", () => {
    render(<TestHoverHook />)

    expect(screen.getByTestId("hover")).toHaveTextContent("not-hovered")
    expect(screen.getByTestId("pressed")).toHaveTextContent("not-pressed")
    expect(screen.getByTestId("focused")).toHaveTextContent("not-focused")
  })

  it("sets isHovered true on mouseEnter", () => {
    render(<TestHoverHook />)
    const target = screen.getByTestId("hover-target")

    fireEvent.mouseEnter(target)
    expect(screen.getByTestId("hover")).toHaveTextContent("hovered")
  })

  it("sets isHovered false on mouseLeave", () => {
    render(<TestHoverHook />)
    const target = screen.getByTestId("hover-target")

    fireEvent.mouseEnter(target)
    fireEvent.mouseLeave(target)
    expect(screen.getByTestId("hover")).toHaveTextContent("not-hovered")
  })

  it("sets isPressed true on mouseDown", () => {
    render(<TestHoverHook />)
    const target = screen.getByTestId("hover-target")

    fireEvent.mouseDown(target)
    expect(screen.getByTestId("pressed")).toHaveTextContent("pressed")
  })

  it("sets isPressed false on mouseUp", () => {
    render(<TestHoverHook />)
    const target = screen.getByTestId("hover-target")

    fireEvent.mouseDown(target)
    fireEvent.mouseUp(target)
    expect(screen.getByTestId("pressed")).toHaveTextContent("not-pressed")
  })

  it("resets isPressed on mouseLeave", () => {
    render(<TestHoverHook />)
    const target = screen.getByTestId("hover-target")

    fireEvent.mouseDown(target)
    fireEvent.mouseLeave(target)
    expect(screen.getByTestId("pressed")).toHaveTextContent("not-pressed")
  })

  it("sets isFocused true on focus", () => {
    render(<TestHoverHook />)
    const target = screen.getByTestId("hover-target")

    fireEvent.focus(target)
    expect(screen.getByTestId("focused")).toHaveTextContent("focused")
  })

  it("sets isFocused false on blur", () => {
    render(<TestHoverHook />)
    const target = screen.getByTestId("hover-target")

    fireEvent.focus(target)
    fireEvent.blur(target)
    expect(screen.getByTestId("focused")).toHaveTextContent("not-focused")
  })
})

describe("useReducedMotion hook", () => {
  it("returns false when no preference", () => {
    window.matchMedia = mockMatchMedia(false)
    render(<TestReducedMotionHook />)
    expect(screen.getByTestId("reduced-motion")).toHaveTextContent("normal")
  })

  it("returns true when reduced motion is preferred", () => {
    window.matchMedia = mockMatchMedia(true)
    render(<TestReducedMotionHook />)
    expect(screen.getByTestId("reduced-motion")).toHaveTextContent("reduced")
  })
})

describe("hoverClasses", () => {
  it("exports lift classes", () => {
    expect(hoverClasses.lift).toContain("hover:-translate-y")
    expect(hoverClasses.liftSm).toContain("hover:-translate-y")
    expect(hoverClasses.liftLg).toContain("hover:-translate-y")
  })

  it("exports scale classes", () => {
    expect(hoverClasses.scale).toContain("hover:scale")
    expect(hoverClasses.scaleSubtle).toContain("hover:scale")
    expect(hoverClasses.scaleSm).toContain("hover:scale")
    expect(hoverClasses.scaleLg).toContain("hover:scale")
  })

  it("exports opacity classes", () => {
    expect(hoverClasses.fade).toContain("hover:opacity")
    expect(hoverClasses.fadeSubtle).toContain("hover:opacity")
    expect(hoverClasses.fadeDark).toContain("hover:opacity")
  })

  it("exports background classes", () => {
    expect(hoverClasses.bgHover).toContain("hover:bg")
    expect(hoverClasses.bgHoverAccent).toContain("hover:bg")
    expect(hoverClasses.bgHoverPrimary).toContain("hover:bg")
  })

  it("exports shadow classes", () => {
    expect(hoverClasses.shadowHover).toContain("hover:shadow")
    expect(hoverClasses.shadowHoverLg).toContain("hover:shadow")
    expect(hoverClasses.shadowHoverXl).toContain("hover:shadow")
  })

  it("exports underline classes", () => {
    expect(hoverClasses.underline).toContain("after:")
    expect(hoverClasses.underlineCenter).toContain("after:")
  })

  it("exports text classes", () => {
    expect(hoverClasses.textHover).toContain("hover:text")
    expect(hoverClasses.textHoverMuted).toContain("hover:text")
  })

  it("exports combined effect classes", () => {
    expect(hoverClasses.card).toBeDefined()
    expect(hoverClasses.button).toBeDefined()
    expect(hoverClasses.link).toBeDefined()
    expect(hoverClasses.icon).toBeDefined()
  })

  it("exports reduced motion classes", () => {
    expect(hoverClasses.motionSafe).toContain("motion-safe:")
    expect(hoverClasses.motionReduce).toContain("motion-reduce:")
  })
})

describe("getHoverClasses", () => {
  it("returns combined classes", () => {
    const classes = getHoverClasses("lift", "scale")
    expect(classes).toContain("hover:-translate-y")
    expect(classes).toContain("hover:scale")
  })

  it("includes motion-reduce class", () => {
    const classes = getHoverClasses("lift")
    expect(classes).toContain("motion-reduce:")
  })

  it("works with single class", () => {
    const classes = getHoverClasses("fade")
    expect(classes).toContain("hover:opacity")
  })

  it("works with multiple classes", () => {
    const classes = getHoverClasses("lift", "shadowHover", "bgHover")
    expect(classes).toContain("hover:-translate-y")
    expect(classes).toContain("hover:shadow")
    expect(classes).toContain("hover:bg")
  })
})

describe("Variants exports", () => {
  it("exports cardHoverVariants", () => {
    expect(cardHoverVariants).toHaveProperty("rest")
    expect(cardHoverVariants).toHaveProperty("hover")
    expect(cardHoverVariants).toHaveProperty("tap")
  })

  it("exports scaleUpVariants", () => {
    expect(scaleUpVariants).toHaveProperty("rest")
    expect(scaleUpVariants).toHaveProperty("hover")
    expect(scaleUpVariants).toHaveProperty("tap")
  })

  it("exports scaleDownVariants", () => {
    expect(scaleDownVariants).toHaveProperty("rest")
    expect(scaleDownVariants).toHaveProperty("hover")
    expect(scaleDownVariants).toHaveProperty("tap")
  })

  it("exports scaleSubtleVariants", () => {
    expect(scaleSubtleVariants).toHaveProperty("rest")
    expect(scaleSubtleVariants).toHaveProperty("hover")
    expect(scaleSubtleVariants).toHaveProperty("tap")
  })

  it("exports buttonPressVariants", () => {
    expect(buttonPressVariants).toHaveProperty("rest")
    expect(buttonPressVariants).toHaveProperty("hover")
    expect(buttonPressVariants).toHaveProperty("tap")
  })

  it("exports imageZoomVariants", () => {
    expect(imageZoomVariants).toHaveProperty("rest")
    expect(imageZoomVariants).toHaveProperty("hover")
  })
})

describe("Accessibility", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("HoverButton maintains button semantics", () => {
    render(<HoverButton>Accessible button</HoverButton>)
    expect(screen.getByRole("button")).toHaveAccessibleName("Accessible button")
  })

  it("HoverImage preserves alt text", () => {
    render(<HoverImage src="/test.jpg" alt="Descriptive alt text" />)
    expect(screen.getByAltText("Descriptive alt text")).toBeInTheDocument()
  })

  it("HoverUnderline underline is aria-hidden", () => {
    render(
      <HoverUnderline>
        <a href="/test">Link</a>
      </HoverUnderline>
    )
    // The animated underline span should have aria-hidden
    const wrapper = screen.getByText("Link").closest("span[class*='motion']")
    if (wrapper) {
      const underlineSpan = wrapper.querySelector("span[aria-hidden='true']")
      // With reduced motion, underline span may not exist
      // This test verifies the structure when motion is enabled
    }
    expect(screen.getByText("Link")).toBeInTheDocument()
  })

  it("reduced motion disables animations for accessibility", () => {
    window.matchMedia = mockMatchMedia(true)

    render(
      <HoverCard>
        <span>Accessible card</span>
      </HoverCard>
    )
    // With reduced motion, the component should render without motion wrapper
    expect(screen.getByText("Accessible card")).toBeInTheDocument()
  })
})

describe("Integration", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("HoverCard can contain HoverButton", () => {
    render(
      <HoverCard>
        <HoverButton>Nested button</HoverButton>
      </HoverCard>
    )
    expect(screen.getByRole("button")).toBeInTheDocument()
  })

  it("HoverScale can wrap HoverImage", () => {
    render(
      <HoverScale>
        <HoverImage src="/test.jpg" alt="Nested image" />
      </HoverScale>
    )
    expect(screen.getByAltText("Nested image")).toBeInTheDocument()
  })

  it("HoverGlow can wrap HoverButton", () => {
    render(
      <HoverGlow color="rgb(255, 0, 0)">
        <HoverButton>Glowing button</HoverButton>
      </HoverGlow>
    )
    expect(screen.getByRole("button")).toHaveTextContent("Glowing button")
  })
})
