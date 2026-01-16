"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-white text-black hover:bg-zinc-200",
        secondary:
          "border-transparent bg-zinc-800 text-white hover:bg-zinc-700",
        destructive:
          "border-transparent bg-amber-900/50 text-amber-400 hover:bg-amber-900/70",
        outline: "border-zinc-700 text-zinc-300 bg-transparent",
        success:
          "border-transparent bg-green-900/50 text-green-400 hover:bg-green-900/70",
        warning:
          "border-transparent bg-yellow-900/50 text-yellow-400 hover:bg-yellow-900/70",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
