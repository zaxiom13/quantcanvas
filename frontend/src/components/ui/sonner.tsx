"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ position = "top-center", ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={position}
      duration={3000}
      closeButton={true}
      richColors={true}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-offBlack group-[.toaster]:border-2 group-[.toaster]:border-offBlack16 group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg group-[.toaster]:font-medium",
          description: "group-[.toast]:text-offBlack/70",
          actionButton:
            "group-[.toast]:bg-blue group-[.toast]:text-white group-[.toast]:hover:bg-blue/90",
          cancelButton:
            "group-[.toast]:bg-fadedBlue8 group-[.toast]:text-blue group-[.toast]:hover:bg-fadedBlue16",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
