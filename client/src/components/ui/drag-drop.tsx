

import * as React from "react"
import { motion, AnimatePresence, Reorder, useDragControls, PanInfo } from "framer-motion"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { DURATION, EASE, SPRING, prefersReducedMotion } from "@/lib/motion"

// ===== Types =====

export interface DragItem<T = unknown> {
  id: string
  data: T
}

export interface DragState<T = unknown> {
  /** Currently dragged item */
  draggedItem: DragItem<T> | null
  /** Current drop target id */
  dropTarget: string | null
  /** Whether dragging is active */
  isDragging: boolean
  /** Source list id (for cross-list drops) */
  sourceListId: string | null
}

export interface UseDragAndDropOptions<T> {
  /** Initial items */
  items: DragItem<T>[]
  /** List identifier (for cross-list operations) */
  listId?: string
  /** Called when items are reordered */
  onReorder?: (items: DragItem<T>[]) => void
  /** Called when an item is dropped from another list */
  onReceive?: (item: DragItem<T>, sourceListId: string) => void
  /** Called when an item is removed (dropped to another list) */
  onRemove?: (item: DragItem<T>, targetListId: string) => void
  /** Whether to allow keyboard reordering */
  enableKeyboard?: boolean
  /** Axis constraint */
  axis?: "x" | "y"
}

export interface UseDragAndDropReturn<T> {
  /** Current ordered items */
  items: DragItem<T>[]
  /** Set items programmatically */
  setItems: React.Dispatch<React.SetStateAction<DragItem<T>[]>>
  /** Current drag state */
  dragState: DragState<T>
  /** Start dragging an item */
  startDrag: (item: DragItem<T>, listId?: string) => void
  /** End dragging */
  endDrag: () => void
  /** Set drop target */
  setDropTarget: (targetId: string | null) => void
  /** Handle reorder (internal use) */
  handleReorder: (newOrder: DragItem<T>[]) => void
  /** Move item by keyboard */
  moveItem: (itemId: string, direction: "up" | "down") => void
  /** Props to spread on the list container */
  listProps: {
    role: string
    "aria-label": string
  }
  /** Get props for an item */
  getItemProps: (item: DragItem<T>, index: number) => DraggableItemProps<T>
}

// ===== useDragAndDrop Hook =====

export function useDragAndDrop<T>(
  options: UseDragAndDropOptions<T>
): UseDragAndDropReturn<T> {
  const {
    items: initialItems,
    listId = "default",
    onReorder,
    onReceive,
    onRemove,
    enableKeyboard = true,
    axis = "y",
  } = options

  const [items, setItems] = React.useState<DragItem<T>[]>(initialItems)
  const [dragState, setDragState] = React.useState<DragState<T>>({
    draggedItem: null,
    dropTarget: null,
    isDragging: false,
    sourceListId: null,
  })

  // Sync items with prop changes
  React.useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const startDrag = React.useCallback(
    (item: DragItem<T>, sourceId?: string) => {
      setDragState({
        draggedItem: item,
        dropTarget: null,
        isDragging: true,
        sourceListId: sourceId || listId,
      })
    },
    [listId]
  )

  const endDrag = React.useCallback(() => {
    setDragState({
      draggedItem: null,
      dropTarget: null,
      isDragging: false,
      sourceListId: null,
    })
  }, [])

  const setDropTarget = React.useCallback((targetId: string | null) => {
    setDragState((prev) => ({
      ...prev,
      dropTarget: targetId,
    }))
  }, [])

  const handleReorder = React.useCallback(
    (newOrder: DragItem<T>[]) => {
      setItems(newOrder)
      onReorder?.(newOrder)
    },
    [onReorder]
  )

  const moveItem = React.useCallback(
    (itemId: string, direction: "up" | "down") => {
      if (!enableKeyboard) return

      setItems((prev) => {
        const currentIndex = prev.findIndex((item) => item.id === itemId)
        if (currentIndex === -1) return prev

        const newIndex =
          direction === "up"
            ? Math.max(0, currentIndex - 1)
            : Math.min(prev.length - 1, currentIndex + 1)

        if (newIndex === currentIndex) return prev

        const newItems = [...prev]
        const [removed] = newItems.splice(currentIndex, 1)
        newItems.splice(newIndex, 0, removed)

        onReorder?.(newItems)
        return newItems
      })
    },
    [enableKeyboard, onReorder]
  )

  const listProps = React.useMemo(
    () => ({
      role: "listbox" as const,
      "aria-label": `Reorderable list ${listId}`,
    }),
    [listId]
  )

  const getItemProps = React.useCallback(
    (item: DragItem<T>, index: number): DraggableItemProps<T> => ({
      item,
      index,
      isDragging: dragState.draggedItem?.id === item.id,
      isDropTarget: dragState.dropTarget === item.id,
      onDragStart: () => startDrag(item),
      onDragEnd: endDrag,
      onMoveUp: () => moveItem(item.id, "up"),
      onMoveDown: () => moveItem(item.id, "down"),
      canMoveUp: index > 0,
      canMoveDown: index < items.length - 1,
      totalItems: items.length,
    }),
    [dragState, items.length, startDrag, endDrag, moveItem]
  )

  return {
    items,
    setItems,
    dragState,
    startDrag,
    endDrag,
    setDropTarget,
    handleReorder,
    moveItem,
    listProps,
    getItemProps,
  }
}

// ===== Animation Variants =====

const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.fast, ease: EASE.outExpo },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: DURATION.fast },
  },
  dragging: {
    scale: 1.02,
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    zIndex: 50,
    transition: { duration: DURATION.fast, ease: EASE.outExpo },
  },
}

const dropIndicatorVariants = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: DURATION.fast, ease: EASE.outExpo },
  },
}

const dropZoneVariants = {
  idle: {
    borderColor: "rgb(229 231 235)",
    backgroundColor: "transparent",
  },
  active: {
    borderColor: "rgb(59 130 246)",
    backgroundColor: "rgba(59, 130, 246, 0.05)",
    transition: { duration: DURATION.fast },
  },
  hover: {
    borderColor: "rgb(37 99 235)",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    scale: 1.01,
    transition: { duration: DURATION.fast },
  },
}

// ===== DraggableList Component =====

export interface DraggableListProps<T> {
  /** Items to render */
  items: DragItem<T>[]
  /** Handle reorder */
  onReorder: (items: DragItem<T>[]) => void
  /** Render function for each item */
  renderItem: (item: DragItem<T>, index: number) => React.ReactNode
  /** List id for cross-list operations */
  listId?: string
  /** Container class name */
  className?: string
  /** Item class name */
  itemClassName?: string
  /** Gap between items (tailwind spacing) */
  gap?: "none" | "sm" | "md" | "lg"
  /** Show drag handles */
  showHandle?: boolean
  /** Enable keyboard navigation */
  enableKeyboard?: boolean
  /** Axis constraint */
  axis?: "x" | "y"
  /** Accessible label */
  label?: string
  /** Empty state content */
  emptyState?: React.ReactNode
}

const gapClasses = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
}

export function DraggableList<T>({
  items,
  onReorder,
  renderItem,
  listId = "default",
  className,
  itemClassName,
  gap = "md",
  showHandle = true,
  enableKeyboard = true,
  axis = "y",
  label,
  emptyState,
}: DraggableListProps<T>): React.ReactElement {
  const reducedMotion = prefersReducedMotion()

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent, item: DragItem<T>, index: number) => {
      if (!enableKeyboard) return

      const moveUp = () => {
        if (index > 0) {
          const newItems = [...items]
          const [removed] = newItems.splice(index, 1)
          newItems.splice(index - 1, 0, removed)
          onReorder(newItems)
        }
      }

      const moveDown = () => {
        if (index < items.length - 1) {
          const newItems = [...items]
          const [removed] = newItems.splice(index, 1)
          newItems.splice(index + 1, 0, removed)
          onReorder(newItems)
        }
      }

      switch (e.key) {
        case "ArrowUp":
          if (axis === "y") {
            e.preventDefault()
            moveUp()
          }
          break
        case "ArrowDown":
          if (axis === "y") {
            e.preventDefault()
            moveDown()
          }
          break
        case "ArrowLeft":
          if (axis === "x") {
            e.preventDefault()
            moveUp()
          }
          break
        case "ArrowRight":
          if (axis === "x") {
            e.preventDefault()
            moveDown()
          }
          break
        case "Home":
          e.preventDefault()
          if (index > 0) {
            const newItems = [...items]
            const [removed] = newItems.splice(index, 1)
            newItems.splice(0, 0, removed)
            onReorder(newItems)
          }
          break
        case "End":
          e.preventDefault()
          if (index < items.length - 1) {
            const newItems = [...items]
            const [removed] = newItems.splice(index, 1)
            newItems.push(removed)
            onReorder(newItems)
          }
          break
      }
    },
    [items, onReorder, enableKeyboard, axis]
  )

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  // Use Reorder.Group for Framer Motion drag reordering
  return (
    <Reorder.Group
      axis={axis}
      values={items}
      onReorder={onReorder}
      className={cn(
        "flex",
        axis === "y" ? "flex-col" : "flex-row",
        gapClasses[gap],
        className
      )}
      role="listbox"
      aria-label={label || `Reorderable list ${listId}`}
      layoutScroll
    >
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <Reorder.Item
            key={item.id}
            value={item}
            initial={reducedMotion ? false : "initial"}
            animate="animate"
            exit={reducedMotion ? undefined : "exit"}
            variants={itemVariants}
            whileDrag={reducedMotion ? undefined : "dragging"}
            dragListener={!showHandle}
            className={cn(
              "relative touch-none select-none outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              "rounded-lg",
              itemClassName
            )}
            tabIndex={0}
            role="option"
            aria-selected="false"
            aria-grabbed="false"
            aria-label={`Item ${index + 1} of ${items.length}. ${enableKeyboard ? "Use arrow keys to reorder." : ""}`}
            onKeyDown={(e) => handleKeyDown(e, item, index)}
            data-testid={`draggable-item-${item.id}`}
          >
            <div className="flex items-center">
              {showHandle && (
                <DragHandle
                  aria-label={`Drag handle for item ${index + 1}`}
                />
              )}
              <div className="flex-1">{renderItem(item, index)}</div>
            </div>
          </Reorder.Item>
        ))}
      </AnimatePresence>
    </Reorder.Group>
  )
}

// ===== DragHandle Component =====

export interface DragHandleProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DragHandle = React.forwardRef<HTMLDivElement, DragHandleProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center w-8 h-8 -ml-2 mr-1",
          "cursor-grab active:cursor-grabbing",
          "text-muted-foreground hover:text-foreground",
          "transition-colors duration-150",
          "touch-none",
          className
        )}
        aria-hidden="true"
        {...props}
      >
        <GripVertical className="w-4 h-4" />
      </div>
    )
  }
)
DragHandle.displayName = "DragHandle"

// ===== DraggableItem Component =====

export interface DraggableItemProps<T = unknown> {
  /** The item data */
  item: DragItem<T>
  /** Item index */
  index: number
  /** Whether this item is being dragged */
  isDragging?: boolean
  /** Whether this is a drop target */
  isDropTarget?: boolean
  /** Called when drag starts */
  onDragStart?: () => void
  /** Called when drag ends */
  onDragEnd?: () => void
  /** Move item up */
  onMoveUp?: () => void
  /** Move item down */
  onMoveDown?: () => void
  /** Whether item can move up */
  canMoveUp?: boolean
  /** Whether item can move down */
  canMoveDown?: boolean
  /** Total items in list */
  totalItems?: number
  /** Show drag handle */
  showHandle?: boolean
  /** Custom drag handle */
  dragHandle?: React.ReactNode
  /** Item content */
  children?: React.ReactNode
  /** Class name */
  className?: string
}

export function DraggableItem<T>({
  item,
  index,
  isDragging = false,
  isDropTarget = false,
  onDragStart,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  totalItems = 1,
  showHandle = true,
  dragHandle,
  children,
  className,
}: DraggableItemProps<T>): React.ReactElement {
  const reducedMotion = prefersReducedMotion()
  const dragControls = useDragControls()

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          if (canMoveUp) onMoveUp?.()
          break
        case "ArrowDown":
          e.preventDefault()
          if (canMoveDown) onMoveDown?.()
          break
      }
    },
    [canMoveUp, canMoveDown, onMoveUp, onMoveDown]
  )

  const startDrag = (event: React.PointerEvent) => {
    dragControls.start(event)
    onDragStart?.()
  }

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging
          ? "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
          : "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      }}
      transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
      drag
      dragControls={dragControls}
      dragListener={!showHandle}
      dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
      dragElastic={0.1}
      onDragEnd={onDragEnd}
      className={cn(
        "relative flex items-center",
        "bg-background border rounded-lg",
        "touch-none select-none",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isDragging && "z-50 opacity-90",
        isDropTarget && "ring-2 ring-primary ring-offset-2",
        className
      )}
      role="option"
      aria-grabbed={isDragging}
      aria-dropeffect={isDropTarget ? "move" : "none"}
      aria-label={`Item ${index + 1} of ${totalItems}. Use arrow keys to reorder.`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-testid={`draggable-item-${item.id}`}
    >
      {showHandle && (
        dragHandle || (
          <div
            className={cn(
              "flex items-center justify-center w-10 h-full",
              "cursor-grab active:cursor-grabbing",
              "text-muted-foreground hover:text-foreground",
              "transition-colors duration-150",
              "touch-none"
            )}
            onPointerDown={startDrag}
            aria-label={`Drag handle for item ${index + 1}`}
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )
      )}
      <div className="flex-1 p-3">{children}</div>
    </motion.div>
  )
}

// ===== DropIndicator Component =====

export interface DropIndicatorProps {
  /** Whether indicator is visible */
  isVisible: boolean
  /** Position: 'before' | 'after' */
  position?: "before" | "after"
  /** Class name */
  className?: string
}

export function DropIndicator({
  isVisible,
  position = "before",
  className,
}: DropIndicatorProps): React.ReactElement {
  const reducedMotion = prefersReducedMotion()

  return (
    <motion.div
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={reducedMotion ? undefined : dropIndicatorVariants}
      className={cn(
        "absolute left-0 right-0 h-0.5 bg-primary rounded-full",
        position === "before" ? "-top-1.5" : "-bottom-1.5",
        !isVisible && "opacity-0",
        className
      )}
      aria-hidden="true"
      data-testid="drop-indicator"
    />
  )
}

// ===== DropZone Component =====

export interface DropZoneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrop' | 'onDragEnter' | 'onDragLeave'> {
  /** Zone identifier */
  zoneId: string
  /** Whether zone accepts drops */
  isActive?: boolean
  /** Whether something is being dragged over */
  isHovered?: boolean
  /** Called when item is dropped */
  onItemDrop?: (item: DragItem, sourceListId: string) => void
  /** Called when drag enters zone */
  onZoneDragEnter?: () => void
  /** Called when drag leaves zone */
  onZoneDragLeave?: () => void
  /** Accessible label */
  label?: string
  /** Placeholder content when empty */
  placeholder?: React.ReactNode
  /** Children */
  children?: React.ReactNode
}

export const DropZone = React.forwardRef<HTMLDivElement, DropZoneProps>(
  (
    {
      zoneId,
      isActive = false,
      isHovered = false,
      onItemDrop,
      onZoneDragEnter,
      onZoneDragLeave,
      label,
      placeholder,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()
    const [internalHovered, setInternalHovered] = React.useState(false)

    const handleDragEnter = React.useCallback(() => {
      setInternalHovered(true)
      onZoneDragEnter?.()
    }, [onZoneDragEnter])

    const handleDragLeave = React.useCallback(() => {
      setInternalHovered(false)
      onZoneDragLeave?.()
    }, [onZoneDragLeave])

    // Use HTML5 drag and drop events for cross-list compatibility
    const handleDragOver = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
    }, [])

    const handleDropEvent = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()
        setInternalHovered(false)
        try {
          const data = e.dataTransfer.getData("application/json")
          if (data) {
            const { item, sourceListId } = JSON.parse(data)
            onItemDrop?.(item, sourceListId)
          }
        } catch {
          // Invalid data, ignore
        }
      },
      [onItemDrop]
    )

    const isHighlighted = isHovered || internalHovered

    // Filter out props that conflict with native drag events
    const { onAnimationStart, onDrag, onDragEnd, onDragStart, ...safeProps } = props as Record<string, unknown>

    return (
      <div
        ref={ref}
        className={cn(
          "relative min-h-[100px] p-4",
          "border-2 border-dashed rounded-lg",
          "transition-all duration-200",
          isHighlighted && "border-primary bg-primary/5 scale-[1.01]",
          isActive && !isHighlighted && "border-primary/50 bg-primary/5",
          className
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDropEvent}
        role="region"
        aria-label={label || `Drop zone ${zoneId}`}
        aria-dropeffect={isActive ? "move" : "none"}
        data-testid={`drop-zone-${zoneId}`}
        {...(safeProps as React.HTMLAttributes<HTMLDivElement>)}
      >
        {children || (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            {placeholder || (
              <>
                <GripVertical className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm">Drop items here</span>
              </>
            )}
          </div>
        )}
      </div>
    )
  }
)
DropZone.displayName = "DropZone"

// ===== CSS Utility Classes =====

export const dragDropClasses = {
  /** Draggable item base */
  item: "relative touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg",
  /** Item when dragging */
  itemDragging: "z-50 opacity-90 scale-[1.02] shadow-lg",
  /** Item when drop target */
  itemDropTarget: "ring-2 ring-primary ring-offset-2",
  /** Drag handle */
  handle: "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors duration-150 touch-none",
  /** Drop zone base */
  dropZone: "min-h-[100px] p-4 border-2 border-dashed rounded-lg transition-colors duration-200",
  /** Drop zone active */
  dropZoneActive: "border-primary bg-primary/5",
  /** Drop zone hover */
  dropZoneHover: "border-primary bg-primary/10 scale-[1.01]",
  /** Drop indicator */
  dropIndicator: "h-0.5 bg-primary rounded-full",
  /** Reduced motion */
  motionReduce: "motion-reduce:transition-none motion-reduce:transform-none",
}

// ===== Exports =====

export {
  itemVariants as draggableItemVariants,
  dropIndicatorVariants,
  dropZoneVariants,
}
