import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"
import type { ReactNode } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toastSuccess(message: ReactNode) {
  return toast.success(message, {
    style: {
      "--normal-bg": '#161619',
      "--normal-text": '#04f9d2',
      "--normal-border": '#33363a',
    } as React.CSSProperties,
  })
}

export function toastError(message: ReactNode) {
  return toast.error(message, {
    duration: 2000,
    style: {
      "--normal-bg": '#EFB90B',
      "--normal-text": '#000000',
      "--normal-border": '#EFB90B',
    } as React.CSSProperties,
  })
}