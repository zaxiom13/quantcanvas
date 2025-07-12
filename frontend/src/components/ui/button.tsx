import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-blue text-white hover:bg-blue/90 shadow-sm hover:shadow-md",
        destructive:
          "bg-red text-white hover:bg-red/90 shadow-sm hover:shadow-md",
        outline:
          "border-2 border-offBlack16 bg-offWhite text-offBlack hover:bg-fadedBlue8 hover:border-blue",
        secondary:
          "bg-fadedBlue8 text-blue hover:bg-fadedBlue16 border border-blue/20",
        ghost: "text-offBlack hover:bg-fadedBlue8 hover:text-blue",
        link: "text-blue underline-offset-4 hover:underline font-medium",
        success: "bg-green text-white hover:bg-green/90 shadow-sm hover:shadow-md",
        warning: "bg-gold text-offBlack hover:bg-gold/90 shadow-sm hover:shadow-md",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-sm",
        lg: "h-12 rounded-lg px-6 text-lg",
        icon: "h-10 w-10",
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
