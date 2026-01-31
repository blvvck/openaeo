import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { motion } from "framer-motion"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { modalOverlay, modalContent, prefersReducedMotion } from "@/lib/motion"

export {
  Root as Dialog,
  Trigger as DialogTrigger,
  Portal as DialogPortal,
  Close as DialogClose,
} from "@radix-ui/react-dialog"

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const reducedMotion = prefersReducedMotion()

  if (reducedMotion) {
    return (
      <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 bg-black/80",
          className
        )}
        {...props}
      />
    )
  }

  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50",
        className
      )}
      asChild
      {...props}
    >
      <motion.div
        className="fixed inset-0 bg-black/80"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={modalOverlay}
      />
    </DialogPrimitive.Overlay>
  )
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const reducedMotion = prefersReducedMotion()

  if (reducedMotion) {
    return (
      <DialogPrimitive.Portal>
        <DialogOverlay />
        {/* Flex container that accounts for sidebar */}
        <div className="fixed inset-0 z-50 flex items-center justify-center pl-64">
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              "relative grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
              className
            )}
            {...props}
          >
            {children}
            <DialogPrimitive.Close
              aria-label="Close dialog"
              className="absolute right-3 top-3 inline-grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Close dialog</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    )
  }

  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      {/* Flex container that accounts for sidebar */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pl-64 pointer-events-none">
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "relative grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg pointer-events-auto",
            className
          )}
          asChild
          {...props}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalContent}
          >
            {children}
            <DialogPrimitive.Close
              aria-label="Close dialog"
              className="absolute right-3 top-3 inline-grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Close dialog</span>
            </DialogPrimitive.Close>
          </motion.div>
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <header {...props} className={cn("grid gap-2 text-left", className)} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <footer {...props} className={cn("mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)} />
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function OpenAeoDialogTitle({ className, ...props }, ref) {
  return React.createElement(DialogPrimitive.Title, {
    ...props,
    ref,
    className: cn("text-base font-semibold tracking-tight text-foreground", className),
  })
})
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function OpenAeoDialogDescription({ className, ...props }, ref) {
  return React.createElement(DialogPrimitive.Description, {
    ...props,
    ref,
    className: cn("text-sm leading-relaxed text-muted-foreground", className),
  })
})
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
