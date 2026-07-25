import * as React from "react"
import { cn } from "@/lib/utils"

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-heading font-semibold tracking-wider text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 uppercase",
        className
      )}
      {...props}
    />
  )
)
Label.displayName = "Label"

export { Label }
