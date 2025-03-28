import { ToastActionElement, type ToastType, useToast as useToastPrimitive, toast } from "./use-toast-primitive"

export type {
  ToastActionElement,
}

type ToastProps = Omit<ToastType, "id"> & {
  onOpenChange?: (open: boolean) => void
}

export function useToast() {
  const { toast: toastPrimitive, dismiss, ...props } = useToastPrimitive()
  
  return {
    toast: ({ ...props }: ToastProps) => {
      return toast({
        ...props,
      })
    },
    dismiss: (toastId?: string) => dismiss(toastId),
    toasts: props.toasts,
  }
}