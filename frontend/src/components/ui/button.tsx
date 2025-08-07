import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-tight transition-[color,background,transform,shadow,border] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-500/60 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[#142532] to-[#0f1c26] text-[#e5eef2] border border-white/12 shadow-sm hover:from-[#173140] hover:to-[#11202b] hover:border-neon-500/40 hover:shadow-[0_8px_24px_-8px_rgba(57,255,20,0.25)]",
        destructive:
          "bg-gradient-to-b from-[#3a1313] to-[#2a0f0f] text-[#ffd6d6] border border-white/12 hover:border-red/60 hover:shadow-[0_8px_24px_-8px_rgba(217,41,22,0.35)]",
        outline:
          "border border-white/20 bg-white/0 text-[#e5eef2] hover:bg-white/5 hover:border-neon-500/40",
        secondary:
          "bg-white/6 text-[#e5eef2] border border-white/14 hover:bg-white/10 hover:border-white/30",
        ghost: "text-[#e5eef2] hover:bg-white/5",
        link: "text-blue underline-offset-4 hover:underline font-medium",
        success:
          "bg-gradient-to-b from-[#133a1a] to-[#0f2d15] text-neon-500 border border-white/12 hover:border-neon-500/60",
        warning:
          "bg-gradient-to-b from-[#3a2d13] to-[#2a210f] text-gold border border-white/12 hover:border-gold/60",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-sm",
        lg: "h-11 rounded-lg px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
