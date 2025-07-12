import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = React.forwardRef<
  React.ElementRef<typeof PanelGroup>,
  React.ComponentPropsWithoutRef<typeof PanelGroup>
>(({ className, ...props }, ref) => (
  <PanelGroup
    ref={ref}
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
))
ResizablePanelGroup.displayName = "ResizablePanelGroup"

const ResizablePanel = Panel

const resizeHandleVariants = cva(
  cn(
    "relative flex w-px items-center justify-center bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 focus-visible:ring-offset-1 dark:focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-950"
  ),
  {
    variants: {
      withHandle: {
        true: "bg-slate-200 MuiBox-root css-70qvj9 dark:bg-slate-800",
      },
      direction: {
        vertical: "h-px w-full flex-col after:left-0 after:h-1 after:w-full",
        horizontal: "",
      },
    },
  }
)

const ResizableHandle = React.forwardRef<
  React.ElementRef<typeof PanelResizeHandle>,
  React.ComponentPropsWithoutRef<typeof PanelResizeHandle> &
    VariantProps<typeof resizeHandleVariants>
>(({ className, withHandle, ...props }, ref) => (
  <PanelResizeHandle
    ref={ref}
    className={cn(resizeHandleVariants({ withHandle }), className)}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-slate-200 dark:border-slate-800 dark:bg-slate-800">
        <div className="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-1f4bhdn" />
      </div>
    )}
  </PanelResizeHandle>
))
ResizableHandle.displayName = "ResizableHandle"

export { ResizablePanelGroup, ResizablePanel, ResizableHandle } 