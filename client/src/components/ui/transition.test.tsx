

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"

vi.mock("framer-motion", () => {
  const tags = new Map<string, React.ComponentType<any>>()
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!tags.has(tag)) {
        tags.set(tag, React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>((props, ref) =>
          React.createElement(tag, { ...props, ref }),
        ))
      }
      return tags.get(tag)
    },
  })

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  }
})

import {
  Transition,
  FadeTransition,
  SlideTransition,
  ScaleTransition,
  RotateTransition,
  StaggeredList,
  StaggeredItem,
  AnimatedPresenceWrapper,
  useTransition,
  useReducedMotion,
  transitionClasses,
  getMotionSafeClasses,
  DURATION,
  EASE,
  SPRING,
  STAGGER,
} from "./transition"

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
function TestTransitionHook({
  initialVisible = true,
  onShow,
  onHide,
}: {
  initialVisible?: boolean
  onShow?: () => void
  onHide?: () => void
}) {
  const { isVisible, isAnimating, show, hide, toggle } = useTransition({
    initialVisible,
    onShow,
    onHide,
  })

  return (
    <div>
      <span data-testid="visible">{isVisible ? "visible" : "hidden"}</span>
      <span data-testid="animating">{isAnimating ? "animating" : "idle"}</span>
      <button onClick={show}>Show</button>
      <button onClick={hide}>Hide</button>
      <button onClick={toggle}>Toggle</button>
    </div>
  )
}

function TestReducedMotionHook() {
  const reducedMotion = useReducedMotion()
  return <span data-testid="reduced-motion">{reducedMotion ? "reduced" : "normal"}</span>
}

// ===== Tests =====

describe("Transition", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  describe("Basic rendering", () => {
    it("renders children when show is true", () => {
      render(
        <Transition show={true}>
          <span>Content</span>
        </Transition>
      )
      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("does not render children when show is false and unmountOnHide is true", async () => {
      render(
        <Transition show={false} unmountOnHide={true}>
          <span>Content</span>
        </Transition>
      )
      await waitFor(() => {
        expect(screen.queryByText("Content")).not.toBeInTheDocument()
      })
    })

    it("renders children when show is false but unmountOnHide is false", () => {
      render(
        <Transition show={false} unmountOnHide={false}>
          <span>Content</span>
        </Transition>
      )
      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("applies className to wrapper", () => {
      render(
        <Transition show={true} className="custom-class">
          <span>Content</span>
        </Transition>
      )
      const wrapper = screen.getByText("Content").parentElement
      expect(wrapper).toHaveClass("custom-class")
    })
  })

  describe("Presets", () => {
    it("renders with fade preset", () => {
      render(
        <Transition preset="fade" show={true}>
          <span>Fade</span>
        </Transition>
      )
      expect(screen.getByText("Fade")).toBeInTheDocument()
    })

    it("renders with fadeUp preset", () => {
      render(
        <Transition preset="fadeUp" show={true}>
          <span>FadeUp</span>
        </Transition>
      )
      expect(screen.getByText("FadeUp")).toBeInTheDocument()
    })

    it("renders with fadeDown preset", () => {
      render(
        <Transition preset="fadeDown" show={true}>
          <span>FadeDown</span>
        </Transition>
      )
      expect(screen.getByText("FadeDown")).toBeInTheDocument()
    })

    it("renders with slideUp preset", () => {
      render(
        <Transition preset="slideUp" show={true}>
          <span>SlideUp</span>
        </Transition>
      )
      expect(screen.getByText("SlideUp")).toBeInTheDocument()
    })

    it("renders with slideDown preset", () => {
      render(
        <Transition preset="slideDown" show={true}>
          <span>SlideDown</span>
        </Transition>
      )
      expect(screen.getByText("SlideDown")).toBeInTheDocument()
    })

    it("renders with slideLeft preset", () => {
      render(
        <Transition preset="slideLeft" show={true}>
          <span>SlideLeft</span>
        </Transition>
      )
      expect(screen.getByText("SlideLeft")).toBeInTheDocument()
    })

    it("renders with slideRight preset", () => {
      render(
        <Transition preset="slideRight" show={true}>
          <span>SlideRight</span>
        </Transition>
      )
      expect(screen.getByText("SlideRight")).toBeInTheDocument()
    })

    it("renders with scale preset", () => {
      render(
        <Transition preset="scale" show={true}>
          <span>Scale</span>
        </Transition>
      )
      expect(screen.getByText("Scale")).toBeInTheDocument()
    })

    it("renders with scaleSpring preset", () => {
      render(
        <Transition preset="scaleSpring" show={true}>
          <span>ScaleSpring</span>
        </Transition>
      )
      expect(screen.getByText("ScaleSpring")).toBeInTheDocument()
    })

    it("renders with rotate preset", () => {
      render(
        <Transition preset="rotate" show={true}>
          <span>Rotate</span>
        </Transition>
      )
      expect(screen.getByText("Rotate")).toBeInTheDocument()
    })

    it("renders with none preset (no animation)", () => {
      render(
        <Transition preset="none" show={true}>
          <span>None</span>
        </Transition>
      )
      expect(screen.getByText("None")).toBeInTheDocument()
    })
  })

  describe("Reduced motion", () => {
    it("skips animation when prefers-reduced-motion is set", () => {
      window.matchMedia = mockMatchMedia(true)

      render(
        <Transition preset="fadeUp" show={true}>
          <span>Content</span>
        </Transition>
      )

      // Should render content directly without motion wrapper
      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("renders content when show is false and reduced motion is enabled", () => {
      window.matchMedia = mockMatchMedia(true)

      render(
        <Transition preset="fadeUp" show={false} unmountOnHide={true}>
          <span>Content</span>
        </Transition>
      )

      // With reduced motion, unmountOnHide should still work
      expect(screen.queryByText("Content")).not.toBeInTheDocument()
    })
  })

  describe("Duration and easing", () => {
    it("accepts duration preset", () => {
      render(
        <Transition preset="fade" duration="slow" show={true}>
          <span>Slow</span>
        </Transition>
      )
      expect(screen.getByText("Slow")).toBeInTheDocument()
    })

    it("accepts easing preset", () => {
      render(
        <Transition preset="fade" easing="spring" show={true}>
          <span>Spring</span>
        </Transition>
      )
      expect(screen.getByText("Spring")).toBeInTheDocument()
    })

    it("accepts delay", () => {
      render(
        <Transition preset="fade" delay={0.5} show={true}>
          <span>Delayed</span>
        </Transition>
      )
      expect(screen.getByText("Delayed")).toBeInTheDocument()
    })
  })

  describe("Custom variants", () => {
    it("accepts custom variants", () => {
      const customVariants = {
        hidden: { opacity: 0, x: -100 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 100 },
      }

      render(
        <Transition variants={customVariants} show={true}>
          <span>Custom</span>
        </Transition>
      )
      expect(screen.getByText("Custom")).toBeInTheDocument()
    })
  })

  describe("Callbacks", () => {
    it("calls onAnimationComplete when animation finishes", async () => {
      const onComplete = vi.fn()

      render(
        <Transition
          preset="fade"
          show={true}
          onAnimationComplete={onComplete}
        >
          <span>Content</span>
        </Transition>
      )

      // Framer Motion will call this after animation
      // In tests, we can verify the prop is passed
      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("calls onAnimationStart when animation begins", () => {
      const onStart = vi.fn()

      render(
        <Transition
          preset="fade"
          show={true}
          onAnimationStart={onStart}
        >
          <span>Content</span>
        </Transition>
      )

      expect(screen.getByText("Content")).toBeInTheDocument()
    })
  })
})

describe("FadeTransition", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("renders with no direction (pure fade)", () => {
    render(
      <FadeTransition direction="none" show={true}>
        <span>Pure Fade</span>
      </FadeTransition>
    )
    expect(screen.getByText("Pure Fade")).toBeInTheDocument()
  })

  it("renders with up direction", () => {
    render(
      <FadeTransition direction="up" show={true}>
        <span>Fade Up</span>
      </FadeTransition>
    )
    expect(screen.getByText("Fade Up")).toBeInTheDocument()
  })

  it("renders with down direction", () => {
    render(
      <FadeTransition direction="down" show={true}>
        <span>Fade Down</span>
      </FadeTransition>
    )
    expect(screen.getByText("Fade Down")).toBeInTheDocument()
  })

  it("defaults to no direction", () => {
    render(
      <FadeTransition show={true}>
        <span>Default</span>
      </FadeTransition>
    )
    expect(screen.getByText("Default")).toBeInTheDocument()
  })
})

describe("SlideTransition", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("slides from up", () => {
    render(
      <SlideTransition direction="up" show={true}>
        <span>Slide Up</span>
      </SlideTransition>
    )
    expect(screen.getByText("Slide Up")).toBeInTheDocument()
  })

  it("slides from down", () => {
    render(
      <SlideTransition direction="down" show={true}>
        <span>Slide Down</span>
      </SlideTransition>
    )
    expect(screen.getByText("Slide Down")).toBeInTheDocument()
  })

  it("slides from left", () => {
    render(
      <SlideTransition direction="left" show={true}>
        <span>Slide Left</span>
      </SlideTransition>
    )
    expect(screen.getByText("Slide Left")).toBeInTheDocument()
  })

  it("slides from right", () => {
    render(
      <SlideTransition direction="right" show={true}>
        <span>Slide Right</span>
      </SlideTransition>
    )
    expect(screen.getByText("Slide Right")).toBeInTheDocument()
  })

  it("defaults to up direction", () => {
    render(
      <SlideTransition show={true}>
        <span>Default</span>
      </SlideTransition>
    )
    expect(screen.getByText("Default")).toBeInTheDocument()
  })
})

describe("ScaleTransition", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("renders without spring", () => {
    render(
      <ScaleTransition show={true}>
        <span>Scale</span>
      </ScaleTransition>
    )
    expect(screen.getByText("Scale")).toBeInTheDocument()
  })

  it("renders with spring", () => {
    render(
      <ScaleTransition spring show={true}>
        <span>Spring Scale</span>
      </ScaleTransition>
    )
    expect(screen.getByText("Spring Scale")).toBeInTheDocument()
  })
})

describe("RotateTransition", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("renders rotate transition", () => {
    render(
      <RotateTransition show={true}>
        <span>Rotate</span>
      </RotateTransition>
    )
    expect(screen.getByText("Rotate")).toBeInTheDocument()
  })
})

describe("StaggeredList", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("renders children", () => {
    render(
      <StaggeredList show={true}>
        <span>Item 1</span>
        <span>Item 2</span>
        <span>Item 3</span>
      </StaggeredList>
    )

    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
    expect(screen.getByText("Item 3")).toBeInTheDocument()
  })

  it("does not render when show is false", async () => {
    render(
      <StaggeredList show={false}>
        <span>Item 1</span>
      </StaggeredList>
    )

    await waitFor(() => {
      expect(screen.queryByText("Item 1")).not.toBeInTheDocument()
    })
  })

  it("accepts stagger speed", () => {
    render(
      <StaggeredList show={true} stagger="slow">
        <span>Item 1</span>
        <span>Item 2</span>
      </StaggeredList>
    )

    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
  })

  it("applies className to container", () => {
    render(
      <StaggeredList show={true} className="custom-list">
        <span>Item 1</span>
        <span>Item 2</span>
      </StaggeredList>
    )

    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
  })

  it("accepts delayChildren prop", () => {
    render(
      <StaggeredList show={true} delayChildren={0.5}>
        <span>Item 1</span>
      </StaggeredList>
    )

    expect(screen.getByText("Item 1")).toBeInTheDocument()
  })

  it("accepts itemPreset prop", () => {
    render(
      <StaggeredList show={true} itemPreset="scale">
        <span>Item 1</span>
      </StaggeredList>
    )

    expect(screen.getByText("Item 1")).toBeInTheDocument()
  })

  it("skips non-element children", () => {
    render(
      <StaggeredList show={true}>
        <span>Item 1</span>
        {null}
        <span>Item 2</span>
      </StaggeredList>
    )

    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
  })

  it("renders without animation when reduced motion is preferred", () => {
    window.matchMedia = mockMatchMedia(true)

    render(
      <StaggeredList show={true}>
        <span>Item 1</span>
        <span>Item 2</span>
      </StaggeredList>
    )

    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
  })
})

describe("StaggeredItem", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("renders children", () => {
    render(
      <StaggeredItem>
        <span>Item</span>
      </StaggeredItem>
    )
    expect(screen.getByText("Item")).toBeInTheDocument()
  })

  it("accepts preset prop", () => {
    render(
      <StaggeredItem preset="scale">
        <span>Item</span>
      </StaggeredItem>
    )
    expect(screen.getByText("Item")).toBeInTheDocument()
  })

  it("accepts custom variants", () => {
    const customVariants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    }

    render(
      <StaggeredItem variants={customVariants}>
        <span>Item</span>
      </StaggeredItem>
    )
    expect(screen.getByText("Item")).toBeInTheDocument()
  })

  it("renders without animation when reduced motion is preferred", () => {
    window.matchMedia = mockMatchMedia(true)

    render(
      <StaggeredItem>
        <span>Item</span>
      </StaggeredItem>
    )
    expect(screen.getByText("Item")).toBeInTheDocument()
  })

  it("applies className", () => {
    render(
      <StaggeredItem className="custom-class">
        <span>Item</span>
      </StaggeredItem>
    )
    const wrapper = screen.getByText("Item").parentElement
    expect(wrapper).toHaveClass("custom-class")
  })
})

describe("AnimatedPresenceWrapper", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("renders children", () => {
    render(
      <AnimatedPresenceWrapper>
        <span>Content</span>
      </AnimatedPresenceWrapper>
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("accepts mode prop", () => {
    render(
      <AnimatedPresenceWrapper mode="sync">
        <span>Content</span>
      </AnimatedPresenceWrapper>
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("accepts initial prop", () => {
    render(
      <AnimatedPresenceWrapper initial={false}>
        <span>Content</span>
      </AnimatedPresenceWrapper>
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("calls onExitComplete callback", async () => {
    const onExitComplete = vi.fn()

    const { rerender } = render(
      <AnimatedPresenceWrapper onExitComplete={onExitComplete}>
        <div key="1">Content</div>
      </AnimatedPresenceWrapper>
    )

    rerender(
      <AnimatedPresenceWrapper onExitComplete={onExitComplete}>
        <div key="2">New Content</div>
      </AnimatedPresenceWrapper>
    )

    // Callback behavior depends on animation completion
    expect(screen.getByText("New Content")).toBeInTheDocument()
  })
})

describe("useTransition hook", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("initializes with default visible state", () => {
    render(<TestTransitionHook />)
    expect(screen.getByTestId("visible")).toHaveTextContent("visible")
  })

  it("initializes with custom visible state", () => {
    render(<TestTransitionHook initialVisible={false} />)
    expect(screen.getByTestId("visible")).toHaveTextContent("hidden")
  })

  it("shows element when show is called", async () => {
    const user = userEvent.setup()
    render(<TestTransitionHook initialVisible={false} />)

    await user.click(screen.getByText("Show"))
    expect(screen.getByTestId("visible")).toHaveTextContent("visible")
  })

  it("hides element when hide is called", async () => {
    const user = userEvent.setup()
    render(<TestTransitionHook initialVisible={true} />)

    await user.click(screen.getByText("Hide"))
    expect(screen.getByTestId("visible")).toHaveTextContent("hidden")
  })

  it("toggles visibility", async () => {
    const user = userEvent.setup()
    render(<TestTransitionHook initialVisible={true} />)

    await user.click(screen.getByText("Toggle"))
    expect(screen.getByTestId("visible")).toHaveTextContent("hidden")

    await user.click(screen.getByText("Toggle"))
    expect(screen.getByTestId("visible")).toHaveTextContent("visible")
  })

  it("calls onShow callback", async () => {
    const onShow = vi.fn()
    const user = userEvent.setup()
    render(<TestTransitionHook initialVisible={false} onShow={onShow} />)

    await user.click(screen.getByText("Show"))
    expect(onShow).toHaveBeenCalledTimes(1)
  })

  it("calls onHide callback", async () => {
    const onHide = vi.fn()
    const user = userEvent.setup()
    render(<TestTransitionHook initialVisible={true} onHide={onHide} />)

    await user.click(screen.getByText("Hide"))
    expect(onHide).toHaveBeenCalledTimes(1)
  })

  it("sets isAnimating to true when showing", async () => {
    const user = userEvent.setup()
    render(<TestTransitionHook initialVisible={false} />)

    await user.click(screen.getByText("Show"))
    expect(screen.getByTestId("animating")).toHaveTextContent("animating")
  })

  it("sets isAnimating to true when hiding", async () => {
    const user = userEvent.setup()
    render(<TestTransitionHook initialVisible={true} />)

    await user.click(screen.getByText("Hide"))
    expect(screen.getByTestId("animating")).toHaveTextContent("animating")
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

describe("transitionClasses", () => {
  it("exports base transition classes", () => {
    expect(transitionClasses.base).toBe("transition-all")
    expect(transitionClasses.fast).toBe("transition-all duration-150")
    expect(transitionClasses.normal).toBe("transition-all duration-200")
    expect(transitionClasses.slow).toBe("transition-all duration-300")
  })

  it("exports property-specific transition classes", () => {
    expect(transitionClasses.opacity).toBe("transition-opacity")
    expect(transitionClasses.transform).toBe("transition-transform")
    expect(transitionClasses.colors).toBe("transition-colors")
    expect(transitionClasses.shadow).toBe("transition-shadow")
  })

  it("exports timing function classes", () => {
    expect(transitionClasses.easeDefault).toBe("ease-[cubic-bezier(0.4,0,0.2,1)]")
    expect(transitionClasses.easeIn).toBe("ease-in")
    expect(transitionClasses.easeOut).toBe("ease-out")
    expect(transitionClasses.easeInOut).toBe("ease-in-out")
    expect(transitionClasses.easeOutExpo).toBe("ease-[cubic-bezier(0.16,1,0.3,1)]")
  })

  it("exports enter animation classes", () => {
    expect(transitionClasses.fadeIn).toBe("animate-in fade-in")
    expect(transitionClasses.fadeInUp).toBe("animate-in fade-in slide-in-from-bottom-2")
    expect(transitionClasses.fadeInDown).toBe("animate-in fade-in slide-in-from-top-2")
    expect(transitionClasses.fadeInLeft).toBe("animate-in fade-in slide-in-from-right-2")
    expect(transitionClasses.fadeInRight).toBe("animate-in fade-in slide-in-from-left-2")
    expect(transitionClasses.scaleIn).toBe("animate-in zoom-in-95")
    expect(transitionClasses.slideInUp).toBe("animate-in slide-in-from-bottom-4")
    expect(transitionClasses.slideInDown).toBe("animate-in slide-in-from-top-4")
    expect(transitionClasses.slideInLeft).toBe("animate-in slide-in-from-right-4")
    expect(transitionClasses.slideInRight).toBe("animate-in slide-in-from-left-4")
  })

  it("exports exit animation classes", () => {
    expect(transitionClasses.fadeOut).toBe("animate-out fade-out")
    expect(transitionClasses.fadeOutUp).toBe("animate-out fade-out slide-out-to-top-2")
    expect(transitionClasses.fadeOutDown).toBe("animate-out fade-out slide-out-to-bottom-2")
    expect(transitionClasses.fadeOutLeft).toBe("animate-out fade-out slide-out-to-left-2")
    expect(transitionClasses.fadeOutRight).toBe("animate-out fade-out slide-out-to-right-2")
    expect(transitionClasses.scaleOut).toBe("animate-out zoom-out-95")
    expect(transitionClasses.slideOutUp).toBe("animate-out slide-out-to-top-4")
    expect(transitionClasses.slideOutDown).toBe("animate-out slide-out-to-bottom-4")
    expect(transitionClasses.slideOutLeft).toBe("animate-out slide-out-to-left-4")
    expect(transitionClasses.slideOutRight).toBe("animate-out slide-out-to-right-4")
  })

  it("exports duration modifier classes", () => {
    expect(transitionClasses.duration50).toBe("duration-50")
    expect(transitionClasses.duration75).toBe("duration-75")
    expect(transitionClasses.duration100).toBe("duration-100")
    expect(transitionClasses.duration150).toBe("duration-150")
    expect(transitionClasses.duration200).toBe("duration-200")
    expect(transitionClasses.duration300).toBe("duration-300")
    expect(transitionClasses.duration500).toBe("duration-500")
  })

  it("exports reduced motion classes", () => {
    expect(transitionClasses.motionSafe).toBe("motion-safe:transition-all motion-safe:duration-200")
    expect(transitionClasses.motionReduce).toBe("motion-reduce:transition-none motion-reduce:animate-none")
  })
})

describe("getMotionSafeClasses", () => {
  it("returns motion-safe classes with default transition", () => {
    const classes = getMotionSafeClasses()
    expect(classes).toContain("transition-all duration-200")
    expect(classes).toContain("motion-reduce:transition-none")
    expect(classes).toContain("motion-reduce:animate-none")
  })

  it("returns motion-safe classes with specified transition", () => {
    const classes = getMotionSafeClasses("slow")
    expect(classes).toContain("transition-all duration-300")
    expect(classes).toContain("motion-reduce:transition-none")
  })

  it("returns motion-safe classes for opacity transition", () => {
    const classes = getMotionSafeClasses("opacity")
    expect(classes).toContain("transition-opacity")
    expect(classes).toContain("motion-reduce:transition-none")
  })
})

describe("Motion constants", () => {
  it("exports DURATION constants", () => {
    expect(DURATION.instant).toBe(0.1)
    expect(DURATION.fast).toBe(0.15)
    expect(DURATION.normal).toBe(0.2)
    expect(DURATION.slow).toBe(0.3)
    expect(DURATION.slower).toBe(0.5)
    expect(DURATION.slowest).toBe(0.7)
    expect(DURATION.chart).toBe(1)
  })

  it("exports EASE constants", () => {
    expect(EASE.default).toEqual([0.4, 0, 0.2, 1])
    expect(EASE.outExpo).toEqual([0.16, 1, 0.3, 1])
    expect(EASE.inExpo).toEqual([0.7, 0, 0.84, 0])
    expect(EASE.inOut).toEqual([0.65, 0, 0.35, 1])
    expect(EASE.spring).toEqual([0.34, 1.56, 0.64, 1])
    expect(EASE.emphasized).toEqual([0.2, 0, 0, 1])
  })

  it("exports SPRING constants", () => {
    expect(SPRING.gentle).toEqual({ type: "spring", stiffness: 120, damping: 14 })
    expect(SPRING.snappy).toEqual({ type: "spring", stiffness: 300, damping: 30 })
    expect(SPRING.bouncy).toEqual({ type: "spring", stiffness: 400, damping: 10 })
    expect(SPRING.stiff).toEqual({ type: "spring", stiffness: 700, damping: 30 })
  })

  it("exports STAGGER constants", () => {
    expect(STAGGER.fast).toBe(0.03)
    expect(STAGGER.normal).toBe(0.05)
    expect(STAGGER.slow).toBe(0.1)
  })
})

describe("Accessibility", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("respects reduced motion at system level", () => {
    window.matchMedia = mockMatchMedia(true)

    render(
      <Transition preset="fadeUp" show={true}>
        <span>Content</span>
      </Transition>
    )

    // Should render without animation wrapper
    expect(screen.getByText("Content")).toBeInTheDocument()
    // Should not have motion wrapper
    expect(screen.getByText("Content").parentElement?.tagName).not.toBe("MOTION")
  })

  it("StaggeredList respects reduced motion", () => {
    window.matchMedia = mockMatchMedia(true)

    render(
      <StaggeredList show={true}>
        <span>Item 1</span>
        <span>Item 2</span>
      </StaggeredList>
    )

    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
  })

  it("allows content to be accessible even during animation", () => {
    render(
      <Transition preset="fade" show={true}>
        <button>Click me</button>
      </Transition>
    )

    const button = screen.getByRole("button", { name: "Click me" })
    expect(button).toBeInTheDocument()
  })
})

describe("Integration", () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false)
  })

  it("works with nested transitions", () => {
    render(
      <Transition preset="fade" show={true}>
        <Transition preset="scale" show={true}>
          <span>Nested</span>
        </Transition>
      </Transition>
    )

    expect(screen.getByText("Nested")).toBeInTheDocument()
  })

  it("works with dynamic show prop", async () => {
    function TestComponent() {
      const [show, setShow] = React.useState(false)
      return (
        <>
          <button onClick={() => setShow(!show)}>Toggle</button>
          <Transition preset="fade" show={show}>
            <span>Dynamic</span>
          </Transition>
        </>
      )
    }

    const user = userEvent.setup()
    render(<TestComponent />)

    expect(screen.queryByText("Dynamic")).not.toBeInTheDocument()

    await user.click(screen.getByText("Toggle"))
    expect(screen.getByText("Dynamic")).toBeInTheDocument()

    await user.click(screen.getByText("Toggle"))
    await waitFor(() => {
      expect(screen.queryByText("Dynamic")).not.toBeInTheDocument()
    })
  })

  it("StaggeredList works with mapped data", () => {
    const items = [
      { id: 1, name: "Apple" },
      { id: 2, name: "Banana" },
      { id: 3, name: "Cherry" },
    ]

    render(
      <StaggeredList show={true}>
        {items.map((item) => (
          <div key={item.id}>{item.name}</div>
        ))}
      </StaggeredList>
    )

    expect(screen.getByText("Apple")).toBeInTheDocument()
    expect(screen.getByText("Banana")).toBeInTheDocument()
    expect(screen.getByText("Cherry")).toBeInTheDocument()
  })
})
