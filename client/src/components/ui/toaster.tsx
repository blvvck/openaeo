import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { pauseToast, resumeToast, useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" aria-relevant="additions">
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <motion.section
            key={item.id}
            role={item.variant === "destructive" ? "alert" : "status"}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onMouseEnter={() => pauseToast(item.id)}
            onMouseLeave={() => resumeToast(item.id)}
            className={`relative flex items-start gap-3 rounded-xl border p-4 shadow-lg ${item.variant === "destructive" ? "border-red-200 bg-red-50 text-red-950" : item.variant === "warning" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-gray-200 bg-white text-gray-950"}`}
          >
            <div className="min-w-0 flex-1 space-y-1">
              {item.title && <h2 className="text-sm font-semibold">{item.title}</h2>}
              {item.description && <div className="text-sm text-gray-600">{item.description}</div>}
              {item.action}
            </div>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(item.id)} className="rounded-md p-1 text-gray-500 hover:bg-black/5 hover:text-gray-900">
              <X className="h-4 w-4" />
            </button>
          </motion.section>
        ))}
      </AnimatePresence>
    </div>
  );
}
