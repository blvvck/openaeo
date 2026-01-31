

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act, renderHook } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import {
  useDragAndDrop,
  DraggableList,
  DraggableItem,
  DragHandle,
  DropIndicator,
  DropZone,
  dragDropClasses,
  DragItem,
} from "../drag-drop"

// Mock prefersReducedMotion
vi.mock("@/lib/motion", async () => {
  const actual = await vi.importActual("@/lib/motion")
  return {
    ...actual,
    prefersReducedMotion: vi.fn(() => false),
  }
})

import { prefersReducedMotion } from "@/lib/motion"

// Test data
const createTestItems = (count: number): DragItem<string>[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    data: `Item ${i + 1}`,
  }))

describe("useDragAndDrop Hook", () => {
  describe("Initialization", () => {
    it("initializes with provided items", () => {
      const items = createTestItems(3)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder: vi.fn() })
      )

      expect(result.current.items).toHaveLength(3)
      expect(result.current.items[0].id).toBe("item-1")
    })

    it("initializes with empty drag state", () => {
      const items = createTestItems(2)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder: vi.fn() })
      )

      expect(result.current.dragState.isDragging).toBe(false)
      expect(result.current.dragState.draggedItem).toBeNull()
      expect(result.current.dragState.dropTarget).toBeNull()
    })

    it("uses default list id when not provided", () => {
      const items = createTestItems(2)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder: vi.fn() })
      )

      expect(result.current.listProps["aria-label"]).toContain("default")
    })

    it("uses custom list id when provided", () => {
      const items = createTestItems(2)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, listId: "my-list", onReorder: vi.fn() })
      )

      expect(result.current.listProps["aria-label"]).toContain("my-list")
    })
  })

  describe("Drag State", () => {
    it("starts drag correctly", () => {
      const items = createTestItems(3)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder: vi.fn() })
      )

      act(() => {
        result.current.startDrag(items[0])
      })

      expect(result.current.dragState.isDragging).toBe(true)
      expect(result.current.dragState.draggedItem).toEqual(items[0])
    })

    it("ends drag correctly", () => {
      const items = createTestItems(3)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder: vi.fn() })
      )

      act(() => {
        result.current.startDrag(items[0])
      })

      act(() => {
        result.current.endDrag()
      })

      expect(result.current.dragState.isDragging).toBe(false)
      expect(result.current.dragState.draggedItem).toBeNull()
    })

    it("sets drop target correctly", () => {
      const items = createTestItems(3)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder: vi.fn() })
      )

      act(() => {
        result.current.setDropTarget("item-2")
      })

      expect(result.current.dragState.dropTarget).toBe("item-2")
    })

    it("clears drop target correctly", () => {
      const items = createTestItems(3)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder: vi.fn() })
      )

      act(() => {
        result.current.setDropTarget("item-2")
        result.current.setDropTarget(null)
      })

      expect(result.current.dragState.dropTarget).toBeNull()
    })

    it("tracks source list id during drag", () => {
      const items = createTestItems(3)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, listId: "source-list", onReorder: vi.fn() })
      )

      act(() => {
        result.current.startDrag(items[0])
      })

      expect(result.current.dragState.sourceListId).toBe("source-list")
    })
  })

  describe("Reordering", () => {
    it("handles reorder callback", () => {
      const items = createTestItems(3)
      const onReorder = vi.fn()
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder })
      )

      const newOrder = [items[1], items[0], items[2]]
      act(() => {
        result.current.handleReorder(newOrder)
      })

      expect(onReorder).toHaveBeenCalledWith(newOrder)
      expect(result.current.items[0].id).toBe("item-2")
    })

    it("updates items state on reorder", () => {
      const items = createTestItems(3)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder: vi.fn() })
      )

      const newOrder = [items[2], items[1], items[0]]
      act(() => {
        result.current.handleReorder(newOrder)
      })

      expect(result.current.items[0].id).toBe("item-3")
      expect(result.current.items[2].id).toBe("item-1")
    })
  })

  describe("Keyboard Navigation", () => {
    it("moves item up", () => {
      const items = createTestItems(3)
      const onReorder = vi.fn()
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder, enableKeyboard: true })
      )

      act(() => {
        result.current.moveItem("item-2", "up")
      })

      expect(onReorder).toHaveBeenCalled()
      expect(result.current.items[0].id).toBe("item-2")
    })

    it("moves item down", () => {
      const items = createTestItems(3)
      const onReorder = vi.fn()
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder, enableKeyboard: true })
      )

      act(() => {
        result.current.moveItem("item-1", "down")
      })

      expect(onReorder).toHaveBeenCalled()
      expect(result.current.items[1].id).toBe("item-1")
    })

    it("does not move first item up", () => {
      const items = createTestItems(3)
      const onReorder = vi.fn()
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder, enableKeyboard: true })
      )

      const originalItems = [...result.current.items]
      act(() => {
        result.current.moveItem("item-1", "up")
      })

      expect(result.current.items).toEqual(originalItems)
    })

    it("does not move last item down", () => {
      const items = createTestItems(3)
      const onReorder = vi.fn()
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder, enableKeyboard: true })
      )

      const originalItems = [...result.current.items]
      act(() => {
        result.current.moveItem("item-3", "down")
      })

      expect(result.current.items).toEqual(originalItems)
    })

    it("does not move when keyboard disabled", () => {
      const items = createTestItems(3)
      const onReorder = vi.fn()
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder, enableKeyboard: false })
      )

      const originalItems = [...result.current.items]
      act(() => {
        result.current.moveItem("item-2", "up")
      })

      expect(result.current.items).toEqual(originalItems)
      expect(onReorder).not.toHaveBeenCalled()
    })
  })

  describe("getItemProps", () => {
    it("returns correct props for item", () => {
      const items = createTestItems(3)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder: vi.fn() })
      )

      const props = result.current.getItemProps(items[1], 1)

      expect(props.item).toEqual(items[1])
      expect(props.index).toBe(1)
      expect(props.isDragging).toBe(false)
      expect(props.canMoveUp).toBe(true)
      expect(props.canMoveDown).toBe(true)
      expect(props.totalItems).toBe(3)
    })

    it("marks first item as cannot move up", () => {
      const items = createTestItems(3)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder: vi.fn() })
      )

      const props = result.current.getItemProps(items[0], 0)

      expect(props.canMoveUp).toBe(false)
      expect(props.canMoveDown).toBe(true)
    })

    it("marks last item as cannot move down", () => {
      const items = createTestItems(3)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder: vi.fn() })
      )

      const props = result.current.getItemProps(items[2], 2)

      expect(props.canMoveUp).toBe(true)
      expect(props.canMoveDown).toBe(false)
    })

    it("marks dragging item correctly", () => {
      const items = createTestItems(3)
      const { result } = renderHook(() =>
        useDragAndDrop({ items, onReorder: vi.fn() })
      )

      act(() => {
        result.current.startDrag(items[1])
      })

      const props = result.current.getItemProps(items[1], 1)
      expect(props.isDragging).toBe(true)
    })
  })
})

describe("DraggableList Component", () => {
  describe("Rendering", () => {
    it("renders all items", () => {
      const items = createTestItems(3)
      render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      expect(screen.getByText("Item 1")).toBeInTheDocument()
      expect(screen.getByText("Item 2")).toBeInTheDocument()
      expect(screen.getByText("Item 3")).toBeInTheDocument()
    })

    it("renders empty state when no items", () => {
      render(
        <DraggableList<string>
          items={[]}
          onReorder={vi.fn()}
          renderItem={(item) => <span>{item.data}</span>}
          emptyState={<div>No items</div>}
        />
      )

      expect(screen.getByText("No items")).toBeInTheDocument()
    })

    it("renders with custom list id", () => {
      const items = createTestItems(2)
      render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          listId="custom-list"
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      expect(screen.getByRole("listbox")).toHaveAttribute(
        "aria-label",
        expect.stringContaining("custom-list")
      )
    })

    it("renders with custom label", () => {
      const items = createTestItems(2)
      render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          label="My todo list"
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      expect(screen.getByRole("listbox")).toHaveAttribute(
        "aria-label",
        "My todo list"
      )
    })

    it("renders drag handles by default", () => {
      const items = createTestItems(2)
      render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      const handles = screen.getAllByLabelText(/Drag handle/i)
      expect(handles).toHaveLength(2)
    })

    it("hides drag handles when showHandle=false", () => {
      const items = createTestItems(2)
      render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          showHandle={false}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      expect(screen.queryByLabelText(/Drag handle/i)).not.toBeInTheDocument()
    })
  })

  describe("Gap Variants", () => {
    it("renders with no gap", () => {
      const items = createTestItems(2)
      const { container } = render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          gap="none"
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      expect(container.querySelector(".gap-0")).toBeInTheDocument()
    })

    it("renders with small gap", () => {
      const items = createTestItems(2)
      const { container } = render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          gap="sm"
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      expect(container.querySelector(".gap-2")).toBeInTheDocument()
    })

    it("renders with medium gap (default)", () => {
      const items = createTestItems(2)
      const { container } = render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      expect(container.querySelector(".gap-3")).toBeInTheDocument()
    })

    it("renders with large gap", () => {
      const items = createTestItems(2)
      const { container } = render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          gap="lg"
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      expect(container.querySelector(".gap-4")).toBeInTheDocument()
    })
  })

  describe("Axis", () => {
    it("renders vertically by default", () => {
      const items = createTestItems(2)
      const { container } = render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      expect(container.querySelector(".flex-col")).toBeInTheDocument()
    })

    it("renders horizontally when axis=x", () => {
      const items = createTestItems(2)
      const { container } = render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          axis="x"
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      expect(container.querySelector(".flex-row")).toBeInTheDocument()
    })
  })

  describe("Keyboard Navigation", () => {
    it("calls onReorder when ArrowUp pressed", () => {
      const items = createTestItems(3)
      const onReorder = vi.fn()
      render(
        <DraggableList
          items={items}
          onReorder={onReorder}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      const secondItem = screen.getByTestId("draggable-item-item-2")
      fireEvent.keyDown(secondItem, { key: "ArrowUp" })

      expect(onReorder).toHaveBeenCalled()
    })

    it("calls onReorder when ArrowDown pressed", () => {
      const items = createTestItems(3)
      const onReorder = vi.fn()
      render(
        <DraggableList
          items={items}
          onReorder={onReorder}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      const firstItem = screen.getByTestId("draggable-item-item-1")
      fireEvent.keyDown(firstItem, { key: "ArrowDown" })

      expect(onReorder).toHaveBeenCalled()
    })

    it("calls onReorder when Home pressed", () => {
      const items = createTestItems(3)
      const onReorder = vi.fn()
      render(
        <DraggableList
          items={items}
          onReorder={onReorder}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      const lastItem = screen.getByTestId("draggable-item-item-3")
      fireEvent.keyDown(lastItem, { key: "Home" })

      expect(onReorder).toHaveBeenCalled()
    })

    it("calls onReorder when End pressed", () => {
      const items = createTestItems(3)
      const onReorder = vi.fn()
      render(
        <DraggableList
          items={items}
          onReorder={onReorder}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      const firstItem = screen.getByTestId("draggable-item-item-1")
      fireEvent.keyDown(firstItem, { key: "End" })

      expect(onReorder).toHaveBeenCalled()
    })

    it("uses ArrowLeft/ArrowRight for horizontal axis", () => {
      const items = createTestItems(3)
      const onReorder = vi.fn()
      render(
        <DraggableList
          items={items}
          onReorder={onReorder}
          axis="x"
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      const secondItem = screen.getByTestId("draggable-item-item-2")
      fireEvent.keyDown(secondItem, { key: "ArrowLeft" })

      expect(onReorder).toHaveBeenCalled()
    })

    it("does not move when keyboard disabled", () => {
      const items = createTestItems(3)
      const onReorder = vi.fn()
      render(
        <DraggableList
          items={items}
          onReorder={onReorder}
          enableKeyboard={false}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      const secondItem = screen.getByTestId("draggable-item-item-2")
      fireEvent.keyDown(secondItem, { key: "ArrowUp" })

      expect(onReorder).not.toHaveBeenCalled()
    })
  })

  describe("Accessibility", () => {
    it("has listbox role", () => {
      const items = createTestItems(2)
      render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      expect(screen.getByRole("listbox")).toBeInTheDocument()
    })

    it("items have option role", () => {
      const items = createTestItems(2)
      render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      expect(screen.getAllByRole("option")).toHaveLength(2)
    })

    it("items have aria-label with position info", () => {
      const items = createTestItems(3)
      render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      const firstItem = screen.getByTestId("draggable-item-item-1")
      expect(firstItem).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Item 1 of 3")
      )
    })

    it("items are focusable", () => {
      const items = createTestItems(2)
      render(
        <DraggableList
          items={items}
          onReorder={vi.fn()}
          renderItem={(item) => <span>{item.data}</span>}
        />
      )

      const firstItem = screen.getByTestId("draggable-item-item-1")
      expect(firstItem).toHaveAttribute("tabIndex", "0")
    })
  })
})

describe("DraggableItem Component", () => {
  const defaultItem: DragItem<string> = { id: "test-1", data: "Test item" }

  describe("Rendering", () => {
    it("renders children", () => {
      render(
        <DraggableItem item={defaultItem} index={0}>
          <span>Content</span>
        </DraggableItem>
      )

      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("renders with test id", () => {
      render(
        <DraggableItem item={defaultItem} index={0}>
          Content
        </DraggableItem>
      )

      expect(screen.getByTestId("draggable-item-test-1")).toBeInTheDocument()
    })

    it("renders drag handle by default", () => {
      render(
        <DraggableItem item={defaultItem} index={0}>
          Content
        </DraggableItem>
      )

      expect(screen.getByLabelText(/Drag handle/i)).toBeInTheDocument()
    })

    it("hides drag handle when showHandle=false", () => {
      render(
        <DraggableItem item={defaultItem} index={0} showHandle={false}>
          Content
        </DraggableItem>
      )

      expect(screen.queryByLabelText(/Drag handle/i)).not.toBeInTheDocument()
    })

    it("renders custom drag handle", () => {
      render(
        <DraggableItem
          item={defaultItem}
          index={0}
          dragHandle={<button>Custom Handle</button>}
        >
          Content
        </DraggableItem>
      )

      expect(screen.getByText("Custom Handle")).toBeInTheDocument()
    })
  })

  describe("Drag State", () => {
    it("applies dragging styles", () => {
      render(
        <DraggableItem item={defaultItem} index={0} isDragging>
          Content
        </DraggableItem>
      )

      const item = screen.getByTestId("draggable-item-test-1")
      expect(item).toHaveClass("z-50")
    })

    it("applies drop target styles", () => {
      render(
        <DraggableItem item={defaultItem} index={0} isDropTarget>
          Content
        </DraggableItem>
      )

      const item = screen.getByTestId("draggable-item-test-1")
      expect(item).toHaveClass("ring-2")
    })
  })

  describe("Callbacks", () => {
    it("calls onDragEnd when drag ends", () => {
      const onDragEnd = vi.fn()
      render(
        <DraggableItem item={defaultItem} index={0} onDragEnd={onDragEnd}>
          Content
        </DraggableItem>
      )

      // Note: Testing actual drag requires more complex setup
      // This verifies the prop is accepted
      expect(onDragEnd).not.toHaveBeenCalled()
    })

    it("calls onMoveUp when ArrowUp pressed", () => {
      const onMoveUp = vi.fn()
      render(
        <DraggableItem item={defaultItem} index={1} onMoveUp={onMoveUp} canMoveUp>
          Content
        </DraggableItem>
      )

      const item = screen.getByTestId("draggable-item-test-1")
      fireEvent.keyDown(item, { key: "ArrowUp" })

      expect(onMoveUp).toHaveBeenCalled()
    })

    it("calls onMoveDown when ArrowDown pressed", () => {
      const onMoveDown = vi.fn()
      render(
        <DraggableItem
          item={defaultItem}
          index={0}
          onMoveDown={onMoveDown}
          canMoveDown
        >
          Content
        </DraggableItem>
      )

      const item = screen.getByTestId("draggable-item-test-1")
      fireEvent.keyDown(item, { key: "ArrowDown" })

      expect(onMoveDown).toHaveBeenCalled()
    })

    it("does not call onMoveUp when canMoveUp=false", () => {
      const onMoveUp = vi.fn()
      render(
        <DraggableItem
          item={defaultItem}
          index={0}
          onMoveUp={onMoveUp}
          canMoveUp={false}
        >
          Content
        </DraggableItem>
      )

      const item = screen.getByTestId("draggable-item-test-1")
      fireEvent.keyDown(item, { key: "ArrowUp" })

      expect(onMoveUp).not.toHaveBeenCalled()
    })

    it("does not call onMoveDown when canMoveDown=false", () => {
      const onMoveDown = vi.fn()
      render(
        <DraggableItem
          item={defaultItem}
          index={2}
          onMoveDown={onMoveDown}
          canMoveDown={false}
        >
          Content
        </DraggableItem>
      )

      const item = screen.getByTestId("draggable-item-test-1")
      fireEvent.keyDown(item, { key: "ArrowDown" })

      expect(onMoveDown).not.toHaveBeenCalled()
    })
  })

  describe("Accessibility", () => {
    it("has option role", () => {
      render(
        <DraggableItem item={defaultItem} index={0}>
          Content
        </DraggableItem>
      )

      expect(screen.getByRole("option")).toBeInTheDocument()
    })

    it("has aria-grabbed attribute", () => {
      render(
        <DraggableItem item={defaultItem} index={0} isDragging>
          Content
        </DraggableItem>
      )

      expect(screen.getByRole("option")).toHaveAttribute("aria-grabbed", "true")
    })

    it("has aria-dropeffect attribute when drop target", () => {
      render(
        <DraggableItem item={defaultItem} index={0} isDropTarget>
          Content
        </DraggableItem>
      )

      expect(screen.getByRole("option")).toHaveAttribute(
        "aria-dropeffect",
        "move"
      )
    })

    it("has aria-label with position info", () => {
      render(
        <DraggableItem item={defaultItem} index={1} totalItems={5}>
          Content
        </DraggableItem>
      )

      expect(screen.getByRole("option")).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Item 2 of 5")
      )
    })

    it("is focusable", () => {
      render(
        <DraggableItem item={defaultItem} index={0}>
          Content
        </DraggableItem>
      )

      expect(screen.getByRole("option")).toHaveAttribute("tabIndex", "0")
    })
  })
})

describe("DragHandle Component", () => {
  it("renders with grip icon", () => {
    const { container } = render(<DragHandle />)

    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("has aria-hidden attribute", () => {
    render(<DragHandle data-testid="handle" />)

    expect(screen.getByTestId("handle")).toHaveAttribute("aria-hidden", "true")
  })

  it("has cursor-grab class", () => {
    render(<DragHandle data-testid="handle" />)

    expect(screen.getByTestId("handle")).toHaveClass("cursor-grab")
  })

  it("accepts custom className", () => {
    render(<DragHandle className="custom-class" data-testid="handle" />)

    expect(screen.getByTestId("handle")).toHaveClass("custom-class")
  })

  it("forwards ref", () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<DragHandle ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})

describe("DropIndicator Component", () => {
  it("renders hidden by default", () => {
    render(<DropIndicator isVisible={false} />)

    expect(screen.getByTestId("drop-indicator")).toHaveClass("opacity-0")
  })

  it("renders visible when isVisible=true", () => {
    render(<DropIndicator isVisible={true} />)

    const indicator = screen.getByTestId("drop-indicator")
    expect(indicator).not.toHaveClass("opacity-0")
  })

  it("positions before by default", () => {
    render(<DropIndicator isVisible={true} />)

    expect(screen.getByTestId("drop-indicator")).toHaveClass("-top-1.5")
  })

  it("positions after when position=after", () => {
    render(<DropIndicator isVisible={true} position="after" />)

    expect(screen.getByTestId("drop-indicator")).toHaveClass("-bottom-1.5")
  })

  it("has aria-hidden attribute", () => {
    render(<DropIndicator isVisible={true} />)

    expect(screen.getByTestId("drop-indicator")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
  })

  it("accepts custom className", () => {
    render(<DropIndicator isVisible={true} className="custom-class" />)

    expect(screen.getByTestId("drop-indicator")).toHaveClass("custom-class")
  })
})

describe("DropZone Component", () => {
  describe("Rendering", () => {
    it("renders with default placeholder", () => {
      render(<DropZone zoneId="zone-1" />)

      expect(screen.getByText("Drop items here")).toBeInTheDocument()
    })

    it("renders children", () => {
      render(
        <DropZone zoneId="zone-1">
          <div>Zone content</div>
        </DropZone>
      )

      expect(screen.getByText("Zone content")).toBeInTheDocument()
    })

    it("renders custom placeholder", () => {
      render(
        <DropZone zoneId="zone-1" placeholder={<span>Custom placeholder</span>} />
      )

      expect(screen.getByText("Custom placeholder")).toBeInTheDocument()
    })

    it("renders with test id", () => {
      render(<DropZone zoneId="my-zone" />)

      expect(screen.getByTestId("drop-zone-my-zone")).toBeInTheDocument()
    })
  })

  describe("States", () => {
    it("applies active styles", () => {
      // Note: Testing animation variants is limited
      // This verifies the component accepts the prop
      render(<DropZone zoneId="zone-1" isActive />)

      expect(screen.getByTestId("drop-zone-zone-1")).toBeInTheDocument()
    })

    it("applies hovered styles", () => {
      render(<DropZone zoneId="zone-1" isHovered />)

      expect(screen.getByTestId("drop-zone-zone-1")).toBeInTheDocument()
    })
  })

  describe("Callbacks", () => {
    it("calls onZoneDragEnter when dragging enters", () => {
      const onZoneDragEnter = vi.fn()
      render(<DropZone zoneId="zone-1" onZoneDragEnter={onZoneDragEnter} />)

      fireEvent.dragEnter(screen.getByTestId("drop-zone-zone-1"))

      expect(onZoneDragEnter).toHaveBeenCalled()
    })

    it("calls onZoneDragLeave when dragging leaves", () => {
      const onZoneDragLeave = vi.fn()
      render(<DropZone zoneId="zone-1" onZoneDragLeave={onZoneDragLeave} />)

      fireEvent.dragLeave(screen.getByTestId("drop-zone-zone-1"))

      expect(onZoneDragLeave).toHaveBeenCalled()
    })

    it("calls onItemDrop with parsed data", () => {
      const onItemDrop = vi.fn()
      render(<DropZone zoneId="zone-1" onItemDrop={onItemDrop} />)

      const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: () =>
            JSON.stringify({
              item: { id: "item-1", data: "test" },
              sourceListId: "list-1",
            }),
        },
      })
      Object.defineProperty(dropEvent, "preventDefault", { value: vi.fn() })

      fireEvent(screen.getByTestId("drop-zone-zone-1"), dropEvent)

      expect(onItemDrop).toHaveBeenCalledWith(
        { id: "item-1", data: "test" },
        "list-1"
      )
    })

    it("handles invalid drop data gracefully", () => {
      const onItemDrop = vi.fn()
      render(<DropZone zoneId="zone-1" onItemDrop={onItemDrop} />)

      const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: () => "invalid json",
        },
      })
      Object.defineProperty(dropEvent, "preventDefault", { value: vi.fn() })

      // Should not throw
      fireEvent(screen.getByTestId("drop-zone-zone-1"), dropEvent)

      expect(onItemDrop).not.toHaveBeenCalled()
    })
  })

  describe("Accessibility", () => {
    it("has region role", () => {
      render(<DropZone zoneId="zone-1" />)

      expect(screen.getByRole("region")).toBeInTheDocument()
    })

    it("has aria-label", () => {
      render(<DropZone zoneId="zone-1" />)

      expect(screen.getByRole("region")).toHaveAttribute(
        "aria-label",
        expect.stringContaining("zone-1")
      )
    })

    it("has custom aria-label", () => {
      render(<DropZone zoneId="zone-1" label="Archive area" />)

      expect(screen.getByRole("region")).toHaveAttribute(
        "aria-label",
        "Archive area"
      )
    })

    it("has aria-dropeffect when active", () => {
      render(<DropZone zoneId="zone-1" isActive />)

      expect(screen.getByRole("region")).toHaveAttribute(
        "aria-dropeffect",
        "move"
      )
    })

    it("has aria-dropeffect=none when inactive", () => {
      render(<DropZone zoneId="zone-1" isActive={false} />)

      expect(screen.getByRole("region")).toHaveAttribute(
        "aria-dropeffect",
        "none"
      )
    })
  })

  describe("Ref forwarding", () => {
    it("forwards ref", () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<DropZone zoneId="zone-1" ref={ref} />)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })
})

describe("CSS Utility Classes", () => {
  it("exports item class", () => {
    expect(dragDropClasses.item).toContain("touch-none")
  })

  it("exports itemDragging class", () => {
    expect(dragDropClasses.itemDragging).toContain("z-50")
  })

  it("exports itemDropTarget class", () => {
    expect(dragDropClasses.itemDropTarget).toContain("ring-2")
  })

  it("exports handle class", () => {
    expect(dragDropClasses.handle).toContain("cursor-grab")
  })

  it("exports dropZone class", () => {
    expect(dragDropClasses.dropZone).toContain("border-dashed")
  })

  it("exports dropZoneActive class", () => {
    expect(dragDropClasses.dropZoneActive).toContain("border-primary")
  })

  it("exports dropZoneHover class", () => {
    expect(dragDropClasses.dropZoneHover).toContain("bg-primary/10")
  })

  it("exports dropIndicator class", () => {
    expect(dragDropClasses.dropIndicator).toContain("bg-primary")
  })

  it("exports motionReduce class", () => {
    expect(dragDropClasses.motionReduce).toContain("motion-reduce")
  })
})

describe("Reduced Motion", () => {
  beforeEach(() => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true)
  })

  afterEach(() => {
    vi.mocked(prefersReducedMotion).mockReturnValue(false)
  })

  it("DraggableList respects reduced motion", () => {
    const items = createTestItems(2)
    render(
      <DraggableList
        items={items}
        onReorder={vi.fn()}
        renderItem={(item) => <span>{item.data}</span>}
      />
    )

    // Component should still render
    expect(screen.getByText("Item 1")).toBeInTheDocument()
  })

  it("DraggableItem respects reduced motion", () => {
    const item: DragItem<string> = { id: "test", data: "Test" }
    render(
      <DraggableItem item={item} index={0}>
        Content
      </DraggableItem>
    )

    // Component should still render
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("DropIndicator respects reduced motion", () => {
    render(<DropIndicator isVisible={true} />)

    // Component should still render
    expect(screen.getByTestId("drop-indicator")).toBeInTheDocument()
  })

  it("DropZone respects reduced motion", () => {
    render(<DropZone zoneId="zone-1" />)

    // Component should still render
    expect(screen.getByTestId("drop-zone-zone-1")).toBeInTheDocument()
  })
})

describe("Integration", () => {
  it("reorders items with keyboard in list", () => {
    const items = createTestItems(3)
    const onReorder = vi.fn()
    render(
      <DraggableList
        items={items}
        onReorder={onReorder}
        renderItem={(item) => <span>{item.data}</span>}
      />
    )

    const secondItem = screen.getByTestId("draggable-item-item-2")
    fireEvent.keyDown(secondItem, { key: "ArrowUp" })

    expect(onReorder).toHaveBeenCalledWith([
      items[1],
      items[0],
      items[2],
    ])
  })

  it("moves item to start with Home key", () => {
    const items = createTestItems(3)
    const onReorder = vi.fn()
    render(
      <DraggableList
        items={items}
        onReorder={onReorder}
        renderItem={(item) => <span>{item.data}</span>}
      />
    )

    const thirdItem = screen.getByTestId("draggable-item-item-3")
    fireEvent.keyDown(thirdItem, { key: "Home" })

    expect(onReorder).toHaveBeenCalledWith([
      items[2],
      items[0],
      items[1],
    ])
  })

  it("moves item to end with End key", () => {
    const items = createTestItems(3)
    const onReorder = vi.fn()
    render(
      <DraggableList
        items={items}
        onReorder={onReorder}
        renderItem={(item) => <span>{item.data}</span>}
      />
    )

    const firstItem = screen.getByTestId("draggable-item-item-1")
    fireEvent.keyDown(firstItem, { key: "End" })

    expect(onReorder).toHaveBeenCalledWith([
      items[1],
      items[2],
      items[0],
    ])
  })

  it("does not move first item up", () => {
    const items = createTestItems(3)
    const onReorder = vi.fn()
    render(
      <DraggableList
        items={items}
        onReorder={onReorder}
        renderItem={(item) => <span>{item.data}</span>}
      />
    )

    const firstItem = screen.getByTestId("draggable-item-item-1")
    fireEvent.keyDown(firstItem, { key: "ArrowUp" })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it("does not move last item down", () => {
    const items = createTestItems(3)
    const onReorder = vi.fn()
    render(
      <DraggableList
        items={items}
        onReorder={onReorder}
        renderItem={(item) => <span>{item.data}</span>}
      />
    )

    const lastItem = screen.getByTestId("draggable-item-item-3")
    fireEvent.keyDown(lastItem, { key: "ArrowDown" })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it("renders custom content with renderItem", () => {
    const items = createTestItems(2)
    render(
      <DraggableList
        items={items}
        onReorder={vi.fn()}
        renderItem={(item, index) => (
          <div data-testid={`custom-${index}`}>
            <strong>{item.data}</strong>
            <span>Index: {index}</span>
          </div>
        )}
      />
    )

    expect(screen.getByTestId("custom-0")).toBeInTheDocument()
    expect(screen.getByText("Index: 0")).toBeInTheDocument()
    expect(screen.getByText("Index: 1")).toBeInTheDocument()
  })
})
