// @vitest-environment jsdom



import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act, renderHook } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  useOptimisticMutation,
  OptimisticList,
  OptimisticToggle,
  OptimisticCard,
  useOptimisticToggle,
  optimisticClasses,
  optimisticAnimationVariants,
  type OptimisticItem,
} from "../optimistic-updates"

// Mock prefersReducedMotion
vi.mock("@/lib/motion", async () => {
  const actual = await vi.importActual("@/lib/motion")
  return {
    ...actual,
    prefersReducedMotion: vi.fn(() => false),
  }
})

import { prefersReducedMotion } from "@/lib/motion"

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Sample item type
interface TestItem {
  id: number
  name: string
  completed: boolean
}

// Sample optimistic items
const sampleItems: OptimisticItem<TestItem>[] = [
  { id: 1, data: { id: 1, name: "Item 1", completed: false } },
  { id: 2, data: { id: 2, name: "Item 2", completed: true } },
  { id: 3, data: { id: 3, name: "Item 3", completed: false } },
]

describe("useOptimisticMutation", () => {
  it("initializes with empty pending items", () => {
    const { result } = renderHook(
      () =>
        useOptimisticMutation({
          queryKey: ["test"],
          mutationFn: async () => {},
          optimisticUpdate: (old) => old,
          getItem: () => ({ id: 1, data: {} }),
          getAction: () => "update",
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current.pendingItems.size).toBe(0)
    expect(result.current.errorItems.size).toBe(0)
  })

  it("provides isItemPending helper", () => {
    const { result } = renderHook(
      () =>
        useOptimisticMutation({
          queryKey: ["test"],
          mutationFn: async () => {},
          optimisticUpdate: (old) => old,
          getItem: () => ({ id: 1, data: {} }),
          getAction: () => "update",
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isItemPending(1)).toBe(false)
    expect(result.current.isItemPending(2)).toBe(false)
  })

  it("provides getItemError helper", () => {
    const { result } = renderHook(
      () =>
        useOptimisticMutation({
          queryKey: ["test"],
          mutationFn: async () => {},
          optimisticUpdate: (old) => old,
          getItem: () => ({ id: 1, data: {} }),
          getAction: () => "update",
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current.getItemError(1)).toBeUndefined()
  })

  it("provides clearItemError helper", async () => {
    const { result } = renderHook(
      () =>
        useOptimisticMutation<TestItem[], Error, { id: number }>({
          queryKey: ["test"],
          mutationFn: async () => {
            throw new Error("Test error")
          },
          optimisticUpdate: (old) => old || [],
          getItem: (vars) => ({ id: vars.id, data: {} as TestItem }),
          getAction: () => "update",
        }),
      { wrapper: createWrapper() }
    )

    // Trigger mutation that will fail
    await act(async () => {
      result.current.mutate({ id: 1 })
    })

    await waitFor(() => {
      expect(result.current.getItemError(1)).toBeDefined()
    })

    // Clear the error
    act(() => {
      result.current.clearItemError(1)
    })

    expect(result.current.getItemError(1)).toBeUndefined()
  })
})

describe("OptimisticList", () => {
  describe("Rendering", () => {
    it("renders list items", () => {
      render(
        <OptimisticList
          items={sampleItems}
          renderItem={(item) => <div data-testid={`item-${item.id}`}>{item.data.name}</div>}
        />
      )

      expect(screen.getByTestId("item-1")).toBeInTheDocument()
      expect(screen.getByTestId("item-2")).toBeInTheDocument()
      expect(screen.getByTestId("item-3")).toBeInTheDocument()
    })

    it("renders empty state when no items", () => {
      render(
        <OptimisticList
          items={[]}
          renderItem={() => null}
          emptyMessage="No tasks yet"
        />
      )

      expect(screen.getByText("No tasks yet")).toBeInTheDocument()
    })

    it("renders custom empty element", () => {
      render(
        <OptimisticList
          items={[]}
          renderItem={() => null}
          emptyElement={<div data-testid="custom-empty">Custom empty</div>}
        />
      )

      expect(screen.getByTestId("custom-empty")).toBeInTheDocument()
    })

    it("uses custom keyExtractor", () => {
      const items: OptimisticItem<{ uuid: string; title: string }>[] = [
        { id: "a", data: { uuid: "uuid-1", title: "Task A" } },
        { id: "b", data: { uuid: "uuid-2", title: "Task B" } },
      ]

      render(
        <OptimisticList
          items={items}
          renderItem={(item) => <div>{item.data.title}</div>}
          keyExtractor={(item) => item.data.uuid}
        />
      )

      expect(screen.getByText("Task A")).toBeInTheDocument()
      expect(screen.getByText("Task B")).toBeInTheDocument()
    })
  })

  describe("Gap Variants", () => {
    it("applies no gap", () => {
      render(
        <OptimisticList
          items={sampleItems}
          renderItem={(item) => <div>{item.data.name}</div>}
          gap="none"
          data-testid="list"
          animate={false}
        />
      )

      expect(screen.getByTestId("list")).toHaveClass("gap-0")
    })

    it("applies small gap", () => {
      render(
        <OptimisticList
          items={sampleItems}
          renderItem={(item) => <div>{item.data.name}</div>}
          gap="sm"
          data-testid="list"
          animate={false}
        />
      )

      expect(screen.getByTestId("list")).toHaveClass("gap-2")
    })

    it("applies medium gap (default)", () => {
      render(
        <OptimisticList
          items={sampleItems}
          renderItem={(item) => <div>{item.data.name}</div>}
          data-testid="list"
          animate={false}
        />
      )

      expect(screen.getByTestId("list")).toHaveClass("gap-4")
    })

    it("applies large gap", () => {
      render(
        <OptimisticList
          items={sampleItems}
          renderItem={(item) => <div>{item.data.name}</div>}
          gap="lg"
          data-testid="list"
          animate={false}
        />
      )

      expect(screen.getByTestId("list")).toHaveClass("gap-6")
    })
  })

  describe("Pending State", () => {
    it("shows pending indicator for pending items", () => {
      const itemsWithPending: OptimisticItem<TestItem>[] = [
        { id: 1, data: { id: 1, name: "Item 1", completed: false }, isPending: true },
      ]

      render(
        <OptimisticList
          items={itemsWithPending}
          renderItem={(item) => <div>{item.data.name}</div>}
          animate={false}
        />
      )

      expect(screen.getByLabelText("Saving changes")).toBeInTheDocument()
    })

    it("applies opacity to pending items", () => {
      const itemsWithPending: OptimisticItem<TestItem>[] = [
        { id: 1, data: { id: 1, name: "Item 1", completed: false }, isPending: true },
      ]

      render(
        <OptimisticList
          items={itemsWithPending}
          renderItem={(item) => <div>{item.data.name}</div>}
          animate={false}
        />
      )

      const listItem = screen.getByRole("listitem")
      expect(listItem).toHaveClass("opacity-70")
    })

    it("sets aria-busy on pending items", () => {
      const itemsWithPending: OptimisticItem<TestItem>[] = [
        { id: 1, data: { id: 1, name: "Item 1", completed: false }, isPending: true },
      ]

      render(
        <OptimisticList
          items={itemsWithPending}
          renderItem={(item) => <div>{item.data.name}</div>}
          animate={false}
        />
      )

      expect(screen.getByRole("listitem")).toHaveAttribute("aria-busy", "true")
    })
  })

  describe("Error State", () => {
    it("shows error message", () => {
      const itemsWithError: OptimisticItem<TestItem>[] = [
        { id: 1, data: { id: 1, name: "Item 1", completed: false }, error: "Failed to save" },
      ]

      render(
        <OptimisticList
          items={itemsWithError}
          renderItem={(item) => <div>{item.data.name}</div>}
          animate={false}
        />
      )

      expect(screen.getByText("Failed to save")).toBeInTheDocument()
      expect(screen.getByRole("alert")).toBeInTheDocument()
    })

    it("calls onDismissError when error is dismissed", async () => {
      const onDismissError = vi.fn()
      const itemsWithError: OptimisticItem<TestItem>[] = [
        { id: 1, data: { id: 1, name: "Item 1", completed: false }, error: "Failed to save" },
      ]

      render(
        <OptimisticList
          items={itemsWithError}
          renderItem={(item) => <div>{item.data.name}</div>}
          onDismissError={onDismissError}
          animate={false}
        />
      )

      fireEvent.click(screen.getByLabelText("Dismiss error"))
      expect(onDismissError).toHaveBeenCalledWith(itemsWithError[0])
    })
  })

  describe("Optimistic Items", () => {
    it("shows border on optimistic items", () => {
      const optimisticItems: OptimisticItem<TestItem>[] = [
        { id: 1, data: { id: 1, name: "Item 1", completed: false }, isOptimistic: true },
      ]

      render(
        <OptimisticList
          items={optimisticItems}
          renderItem={(item) => <div>{item.data.name}</div>}
          animate={false}
        />
      )

      const content = screen.getByText("Item 1").parentElement
      expect(content).toHaveClass("border-l-2", "border-primary")
    })

    it("shows undo button for optimistic items when showUndo is true", () => {
      const optimisticItems: OptimisticItem<TestItem>[] = [
        { id: 1, data: { id: 1, name: "Item 1", completed: false }, isOptimistic: true },
      ]

      render(
        <OptimisticList
          items={optimisticItems}
          renderItem={(item) => <div>{item.data.name}</div>}
          showUndo
          onUndo={vi.fn()}
          animate={false}
        />
      )

      expect(screen.getByLabelText("Undo action")).toBeInTheDocument()
    })

    it("calls onUndo when undo is clicked", async () => {
      const onUndo = vi.fn()
      const optimisticItems: OptimisticItem<TestItem>[] = [
        { id: 1, data: { id: 1, name: "Item 1", completed: false }, isOptimistic: true },
      ]

      render(
        <OptimisticList
          items={optimisticItems}
          renderItem={(item) => <div>{item.data.name}</div>}
          showUndo
          onUndo={onUndo}
          animate={false}
        />
      )

      fireEvent.click(screen.getByLabelText("Undo action"))
      expect(onUndo).toHaveBeenCalledWith(optimisticItems[0])
    })

    it("hides undo button when showUndo is false", () => {
      const optimisticItems: OptimisticItem<TestItem>[] = [
        { id: 1, data: { id: 1, name: "Item 1", completed: false }, isOptimistic: true },
      ]

      render(
        <OptimisticList
          items={optimisticItems}
          renderItem={(item) => <div>{item.data.name}</div>}
          showUndo={false}
          animate={false}
        />
      )

      expect(screen.queryByLabelText("Undo action")).not.toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("has role=list", () => {
      render(
        <OptimisticList
          items={sampleItems}
          renderItem={(item) => <div>{item.data.name}</div>}
          data-testid="list"
          animate={false}
        />
      )

      expect(screen.getByTestId("list")).toHaveAttribute("role", "list")
    })

    it("items have role=listitem", () => {
      render(
        <OptimisticList
          items={sampleItems}
          renderItem={(item) => <div>{item.data.name}</div>}
          animate={false}
        />
      )

      const items = screen.getAllByRole("listitem")
      expect(items).toHaveLength(3)
    })
  })
})

describe("OptimisticToggle", () => {
  describe("Rendering", () => {
    it("renders switch", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
        />
      )

      expect(screen.getByRole("switch")).toBeInTheDocument()
    })

    it("renders label", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          label="Enable notifications"
        />
      )

      expect(screen.getByText("Enable notifications")).toBeInTheDocument()
    })

    it("renders description", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          label="Enable notifications"
          description="Get notified about new updates"
        />
      )

      expect(screen.getByText("Get notified about new updates")).toBeInTheDocument()
    })

    it("reflects checked state", () => {
      render(
        <OptimisticToggle
          checked={true}
          onCheckedChange={vi.fn()}
        />
      )

      expect(screen.getByRole("switch")).toHaveAttribute("data-state", "checked")
    })
  })

  describe("Interactions", () => {
    it("calls onCheckedChange when clicked", async () => {
      const onCheckedChange = vi.fn()

      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={onCheckedChange}
        />
      )

      fireEvent.click(screen.getByRole("switch"))
      expect(onCheckedChange).toHaveBeenCalledWith(true)
    })

    it("updates optimistically on click", () => {
      const onCheckedChange = vi.fn()

      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={onCheckedChange}
        />
      )

      fireEvent.click(screen.getByRole("switch"))

      // Should optimistically show checked
      expect(screen.getByRole("switch")).toHaveAttribute("data-state", "checked")
    })
  })

  describe("Pending State", () => {
    it("shows loading indicator when pending", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          isPending
        />
      )

      expect(screen.getByLabelText("Saving")).toBeInTheDocument()
    })

    it("disables switch when pending", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          isPending
        />
      )

      expect(screen.getByRole("switch")).toBeDisabled()
    })

    it("sets aria-busy when pending", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          isPending
        />
      )

      expect(screen.getByRole("switch")).toHaveAttribute("aria-busy", "true")
    })

    it("hides loading indicator when showLoadingIndicator is false", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          isPending
          showLoadingIndicator={false}
        />
      )

      expect(screen.queryByLabelText("Saving")).not.toBeInTheDocument()
    })
  })

  describe("Error State", () => {
    it("shows error message", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          error="Failed to update"
        />
      )

      expect(screen.getByText("Failed to update")).toBeInTheDocument()
      expect(screen.getByRole("alert")).toBeInTheDocument()
    })

    it("sets aria-invalid on error", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          error="Failed to update"
        />
      )

      expect(screen.getByRole("switch")).toHaveAttribute("aria-invalid", "true")
    })

    it("calls onDismissError when error dismissed", async () => {
      const onDismissError = vi.fn()

      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          error="Failed to update"
          onDismissError={onDismissError}
        />
      )

      fireEvent.click(screen.getByLabelText("Dismiss error"))
      expect(onDismissError).toHaveBeenCalled()
    })
  })

  describe("Success Indicator", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("shows success indicator after state change", async () => {
      const { rerender } = render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          isPending
          showSuccessIndicator
        />
      )

      // Complete the mutation
      rerender(
        <OptimisticToggle
          checked={true}
          onCheckedChange={vi.fn()}
          isPending={false}
          showSuccessIndicator
        />
      )

      expect(screen.getByLabelText("Saved")).toBeInTheDocument()
    })

    it("shows success indicator after pending completes", async () => {
      const { rerender } = render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          isPending
          showSuccessIndicator
          successDuration={1000}
        />
      )

      // Initially no success indicator during pending
      expect(screen.queryByLabelText("Saved")).not.toBeInTheDocument()

      rerender(
        <OptimisticToggle
          checked={true}
          onCheckedChange={vi.fn()}
          isPending={false}
          showSuccessIndicator
          successDuration={1000}
        />
      )

      // Success indicator should appear after pending completes
      expect(screen.getByLabelText("Saved")).toBeInTheDocument()
    })
  })

  describe("Disabled State", () => {
    it("disables switch when disabled", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          disabled
        />
      )

      expect(screen.getByRole("switch")).toBeDisabled()
    })

    it("applies opacity to label when disabled", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          disabled
          label="Enable feature"
        />
      )

      expect(screen.getByText("Enable feature")).toHaveClass("opacity-50")
    })
  })

  describe("Sizes", () => {
    it("applies small size", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          size="sm"
          data-testid="toggle"
        />
      )

      expect(screen.getByTestId("toggle")).toHaveClass("text-sm")
    })

    it("applies medium size (default)", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          data-testid="toggle"
        />
      )

      expect(screen.getByTestId("toggle")).toHaveClass("text-base")
    })

    it("applies large size", () => {
      render(
        <OptimisticToggle
          checked={false}
          onCheckedChange={vi.fn()}
          size="lg"
          data-testid="toggle"
        />
      )

      expect(screen.getByTestId("toggle")).toHaveClass("text-lg")
    })
  })
})

describe("OptimisticCard", () => {
  describe("Rendering", () => {
    it("renders children", () => {
      render(
        <OptimisticCard>
          <div data-testid="content">Card content</div>
        </OptimisticCard>
      )

      expect(screen.getByTestId("content")).toBeInTheDocument()
    })
  })

  describe("Pending State", () => {
    it("shows loading overlay when pending", () => {
      render(
        <OptimisticCard isPending>
          <div>Content</div>
        </OptimisticCard>
      )

      expect(screen.getByLabelText("Saving changes")).toBeInTheDocument()
    })

    it("applies opacity when pending", () => {
      render(
        <OptimisticCard isPending data-testid="card">
          <div>Content</div>
        </OptimisticCard>
      )

      expect(screen.getByTestId("card")).toHaveClass("opacity-70")
    })

    it("sets aria-busy when pending", () => {
      render(
        <OptimisticCard isPending data-testid="card">
          <div>Content</div>
        </OptimisticCard>
      )

      expect(screen.getByTestId("card")).toHaveAttribute("aria-busy", "true")
    })
  })

  describe("Error State", () => {
    it("shows error banner", () => {
      render(
        <OptimisticCard error="Failed to save">
          <div>Content</div>
        </OptimisticCard>
      )

      expect(screen.getByText("Failed to save")).toBeInTheDocument()
      expect(screen.getByRole("alert")).toBeInTheDocument()
    })

    it("applies error border", () => {
      render(
        <OptimisticCard error="Failed to save" data-testid="card">
          <div>Content</div>
        </OptimisticCard>
      )

      expect(screen.getByTestId("card")).toHaveClass("border-destructive")
    })

    it("calls onDismissError when dismiss clicked", async () => {
      const onDismissError = vi.fn()

      render(
        <OptimisticCard error="Failed" onDismissError={onDismissError}>
          <div>Content</div>
        </OptimisticCard>
      )

      fireEvent.click(screen.getByLabelText("Dismiss error"))
      expect(onDismissError).toHaveBeenCalled()
    })
  })

  describe("Optimistic State", () => {
    it("shows border for optimistic cards", () => {
      render(
        <OptimisticCard isOptimistic data-testid="card">
          <div>Content</div>
        </OptimisticCard>
      )

      expect(screen.getByTestId("card")).toHaveClass("border-l-4", "border-l-primary")
    })

    it("shows undo button for optimistic cards", () => {
      render(
        <OptimisticCard isOptimistic showUndo onUndo={vi.fn()}>
          <div>Content</div>
        </OptimisticCard>
      )

      expect(screen.getByLabelText("Undo action")).toBeInTheDocument()
    })

    it("calls onUndo when clicked", async () => {
      const onUndo = vi.fn()

      render(
        <OptimisticCard isOptimistic showUndo onUndo={onUndo}>
          <div>Content</div>
        </OptimisticCard>
      )

      fireEvent.click(screen.getByLabelText("Undo action"))
      expect(onUndo).toHaveBeenCalled()
    })

    it("hides undo when showUndo is false", () => {
      render(
        <OptimisticCard isOptimistic showUndo={false} onUndo={vi.fn()}>
          <div>Content</div>
        </OptimisticCard>
      )

      expect(screen.queryByLabelText("Undo action")).not.toBeInTheDocument()
    })

    it("hides undo when pending", () => {
      render(
        <OptimisticCard isOptimistic showUndo isPending onUndo={vi.fn()}>
          <div>Content</div>
        </OptimisticCard>
      )

      expect(screen.queryByLabelText("Undo action")).not.toBeInTheDocument()
    })

    it("hides undo when has error", () => {
      render(
        <OptimisticCard isOptimistic showUndo error="Error" onUndo={vi.fn()}>
          <div>Content</div>
        </OptimisticCard>
      )

      expect(screen.queryByLabelText("Undo action")).not.toBeInTheDocument()
    })
  })
})

describe("useOptimisticToggle", () => {
  it("initializes checked from query data", () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(["toggle"], { enabled: true })

    const { result } = renderHook(
      () =>
        useOptimisticToggle({
          queryKey: ["toggle"],
          mutationFn: async () => ({ enabled: true }),
          getChecked: (data) => data?.enabled ?? false,
          updateData: (data, checked) => ({ ...data, enabled: checked }),
        }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      }
    )

    expect(result.current.checked).toBe(true)
  })

  it("provides toggle function", () => {
    const { result } = renderHook(
      () =>
        useOptimisticToggle({
          queryKey: ["toggle"],
          mutationFn: async () => ({ enabled: true }),
          getChecked: (data) => data?.enabled ?? false,
          updateData: (data, checked) => ({ ...data, enabled: checked }),
        }),
      { wrapper: createWrapper() }
    )

    expect(typeof result.current.toggle).toBe("function")
  })

  it("provides error and clearError", () => {
    const { result } = renderHook(
      () =>
        useOptimisticToggle({
          queryKey: ["toggle"],
          mutationFn: async () => ({ enabled: true }),
          getChecked: (data) => data?.enabled ?? false,
          updateData: (data, checked) => ({ ...data, enabled: checked }),
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current.error).toBeNull()
    expect(typeof result.current.clearError).toBe("function")
  })

  it("provides toggle function", () => {
    const { result } = renderHook(
      () =>
        useOptimisticToggle({
          queryKey: ["toggle"],
          mutationFn: async (checked: boolean) => ({ enabled: checked }),
          getChecked: (data) => data?.enabled ?? false,
          updateData: (data, checked) => ({ ...data, enabled: checked }),
        }),
      { wrapper: createWrapper() }
    )

    // Hook should provide toggle function
    expect(typeof result.current.toggle).toBe("function")
    // Initial checked state
    expect(result.current.checked).toBe(false)
    // Initially not pending
    expect(result.current.isPending).toBe(false)
  })
})

describe("optimisticClasses", () => {
  it("exports pending class", () => {
    expect(optimisticClasses.pending).toContain("opacity-70")
    expect(optimisticClasses.pending).toContain("pointer-events-none")
  })

  it("exports optimistic class", () => {
    expect(optimisticClasses.optimistic).toContain("border-l-4")
    expect(optimisticClasses.optimistic).toContain("border-l-primary")
  })

  it("exports error class", () => {
    expect(optimisticClasses.error).toContain("border-destructive")
  })

  it("exports success class", () => {
    expect(optimisticClasses.success).toContain("animate-pulse")
  })

  it("exports undoPosition class", () => {
    expect(optimisticClasses.undoPosition).toContain("absolute")
  })

  it("exports overlay class", () => {
    expect(optimisticClasses.overlay).toContain("absolute")
    expect(optimisticClasses.overlay).toContain("bg-background/50")
  })
})

describe("optimisticAnimationVariants", () => {
  it("exports itemEnter variant", () => {
    expect(optimisticAnimationVariants.itemEnter).toHaveProperty("initial")
    expect(optimisticAnimationVariants.itemEnter).toHaveProperty("animate")
    expect(optimisticAnimationVariants.itemEnter).toHaveProperty("exit")
  })

  it("exports fade variant", () => {
    expect(optimisticAnimationVariants.fade).toHaveProperty("initial")
    expect(optimisticAnimationVariants.fade).toHaveProperty("animate")
    expect(optimisticAnimationVariants.fade).toHaveProperty("exit")
  })

  it("exports indicator variant", () => {
    expect(optimisticAnimationVariants.indicator).toHaveProperty("initial")
    expect(optimisticAnimationVariants.indicator).toHaveProperty("animate")
    expect(optimisticAnimationVariants.indicator).toHaveProperty("exit")
  })
})

describe("Reduced Motion", () => {
  beforeEach(() => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true)
  })

  afterEach(() => {
    vi.mocked(prefersReducedMotion).mockReturnValue(false)
  })

  it("OptimisticList disables animations when reduced motion", () => {
    render(
      <OptimisticList
        items={sampleItems}
        renderItem={(item) => <div>{item.data.name}</div>}
        data-testid="list"
      />
    )

    // Should not have motion wrapper
    const list = screen.getByTestId("list")
    expect(list.tagName).toBe("DIV")
  })

  it("OptimisticToggle respects reduced motion for indicators", () => {
    const { rerender } = render(
      <OptimisticToggle
        checked={false}
        onCheckedChange={vi.fn()}
        isPending
      />
    )

    rerender(
      <OptimisticToggle
        checked={true}
        onCheckedChange={vi.fn()}
        isPending={false}
      />
    )

    // Animation should be instant
    expect(screen.getByLabelText("Saved")).toBeInTheDocument()
  })
})

describe("Custom className", () => {
  it("OptimisticList accepts custom className", () => {
    render(
      <OptimisticList
        items={sampleItems}
        renderItem={(item) => <div>{item.data.name}</div>}
        className="custom-class"
        data-testid="list"
        animate={false}
      />
    )

    expect(screen.getByTestId("list")).toHaveClass("custom-class")
  })

  it("OptimisticToggle accepts custom className", () => {
    render(
      <OptimisticToggle
        checked={false}
        onCheckedChange={vi.fn()}
        className="custom-class"
        data-testid="toggle"
      />
    )

    expect(screen.getByTestId("toggle")).toHaveClass("custom-class")
  })

  it("OptimisticCard accepts custom className", () => {
    render(
      <OptimisticCard className="custom-class" data-testid="card">
        <div>Content</div>
      </OptimisticCard>
    )

    expect(screen.getByTestId("card")).toHaveClass("custom-class")
  })
})
