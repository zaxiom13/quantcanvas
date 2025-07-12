import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const awningVariants = cva(
  "relative overflow-hidden transition-all duration-500 ease-in-out",
  {
    variants: {
      variant: {
        default: "bg-blue",
        green: "bg-green",
        gold: "bg-gold",
        red: "bg-red",
        purple: "bg-purple",
        classic: "bg-gradient-to-b from-red to-offWhite",
        striped: "bg-gradient-to-r from-blue via-offWhite to-blue",
      },
      size: {
        sm: "w-64",
        md: "w-80",
        lg: "w-96",
        xl: "w-[32rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface AwningProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof awningVariants> {
  isOpen?: boolean
  onToggle?: () => void
  children?: React.ReactNode
  showToggle?: boolean
}

const Awning = React.forwardRef<HTMLDivElement, AwningProps>(
  ({ 
    className, 
    variant, 
    size, 
    isOpen = false, 
    onToggle, 
    children, 
    showToggle = true,
    ...props 
  }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(isOpen)
    
    const handleToggle = () => {
      if (onToggle) {
        onToggle()
      } else {
        setInternalOpen(!internalOpen)
      }
    }
    
    const currentOpen = onToggle ? isOpen : internalOpen
    
    return (
      <div className={cn("relative", className)} ref={ref} {...props}>
        {/* Awning Structure */}
        <div className={cn(awningVariants({ variant, size }))}>
          {/* Top Frame */}
          <div className="h-4 bg-offBlack border-2 border-offBlack rounded-t-lg relative">
            {/* Mounting brackets */}
            <div className="absolute -top-1 left-2 w-2 h-6 bg-offBlack rounded-sm"></div>
            <div className="absolute -top-1 right-2 w-2 h-6 bg-offBlack rounded-sm"></div>
            
            {/* Toggle mechanism (visible handle) */}
            {showToggle && (
              <button
                onClick={handleToggle}
                className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-offBlack rounded-full border-2 border-offWhite hover:bg-blue transition-colors duration-200 flex items-center justify-center"
                aria-label={currentOpen ? "Close awning" : "Open awning"}
              >
                <div className={cn(
                  "w-2 h-2 bg-offWhite rounded-full transition-transform duration-300",
                  currentOpen ? "rotate-180" : ""
                )}></div>
              </button>
            )}
          </div>
          
          {/* Awning Canvas */}
          <div 
            className={cn(
              "transition-all duration-500 ease-in-out overflow-hidden",
              currentOpen ? "h-32 opacity-100" : "h-0 opacity-0"
            )}
          >
            <div className="h-full relative">
              {/* Canvas with pattern */}
              <div className="h-full w-full relative">
                {/* Main canvas */}
                <div className="h-full w-full"></div>
                
                {/* Scalloped edge */}
                <div className="absolute bottom-0 left-0 right-0 h-4 overflow-hidden">
                  <div className="flex h-full">
                    {Array.from({ length: 12 }, (_, i) => (
                      <div 
                        key={i}
                        className="flex-1 h-full bg-offWhite rounded-b-full border-l border-offBlack16"
                      ></div>
                    ))}
                  </div>
                </div>
                
                {/* Support arms */}
                <div className="absolute left-4 top-0 bottom-4 w-1 bg-offBlack opacity-60"></div>
                <div className="absolute right-4 top-0 bottom-4 w-1 bg-offBlack opacity-60"></div>
              </div>
              
              {/* Content area */}
              {children && (
                <div className="absolute inset-4 flex items-center justify-center">
                  <div className="text-center">
                    {children}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Shadow when open */}
          {currentOpen && (
            <div 
              className="absolute top-full left-0 right-0 h-8 bg-gradient-to-b from-offBlack/20 to-transparent pointer-events-none"
              style={{
                clipPath: "polygon(0 0, 100% 0, 95% 100%, 5% 100%)"
              }}
            ></div>
          )}
        </div>
        
        {/* Manual toggle button (alternative) */}
        {showToggle && (
          <div className="mt-4 text-center">
            <button
              onClick={handleToggle}
              className="text-sm text-blue hover:text-blue/80 transition-colors duration-200"
            >
              {currentOpen ? "▲ Close Awning" : "▼ Open Awning"}
            </button>
          </div>
        )}
      </div>
    )
  }
)

Awning.displayName = "Awning"

export { Awning, awningVariants } 