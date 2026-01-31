import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-figma-2xs',
        'text-figma-xs',
        'text-figma-sm',
        'text-figma-base',
        'text-figma-md',
        'text-figma-lg',
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
