import * as React from "react"
import { CircleX } from "lucide-react"

import { cn } from "~/lib/utils"

type SelectValueType = string | undefined

type SelectContextValue = {
  open: boolean
  setOpen: (next: boolean) => void
  selectedValue: SelectValueType
  setSelectedValue: (value: SelectValueType) => void
  registerItem: (value: string, label: string) => () => void
  getItemLabel: (value: string) => string
  highlightedValue: string | null
  setHighlightedValue: (value: string | null) => void
  triggerRef: React.MutableRefObject<HTMLDivElement | null>
  disabled: boolean
  menuStyles: React.CSSProperties
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext(component: string) {
  const context = React.useContext<SelectContextValue | null>(SelectContext)

  if (!context) {
    throw new Error(`${component} must be used within a Select`)
  }

  return context
}

type SelectProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: SelectValueType) => void
  disabled?: boolean
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>

function Select(selectProps: SelectProps) {
  const {
    value: valueProp,
    defaultValue,
    onValueChange,
    disabled = false,
    children,
    className,
    ...props
  } = selectProps
  const isControlled = Object.prototype.hasOwnProperty.call(selectProps, "value")
  const [internalValue, setInternalValue] = React.useState<SelectValueType>(
    defaultValue
  )
  const [open, setOpen] = React.useState(false)
  const selectedValue = isControlled ? valueProp : internalValue

  const setSelectedValue = React.useCallback(
    (next: SelectValueType) => {
      if (!isControlled) {
        setInternalValue(next)
      }
      onValueChange?.(next)
    },
    [isControlled, onValueChange]
  )

  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const triggerRef = React.useRef<HTMLDivElement | null>(null)
  const itemsRef = React.useRef<Map<string, string>>(new Map())
  const [highlightedValue, setHighlightedValue] = React.useState<string | null>(
    null
  )
  const [menuStyles, setMenuStyles] = React.useState<React.CSSProperties>({})

  const registerItem = React.useCallback((itemValue: string, label: string) => {
    itemsRef.current.set(itemValue, label)
    return () => {
      itemsRef.current.delete(itemValue)
    }
  }, [])

  const getItemLabel = React.useCallback((itemValue: string) => {
    return itemsRef.current.get(itemValue) ?? itemValue
  }, [])

  React.useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) {
        return
      }

      const target = event.target as Node

      if (containerRef.current.contains(target)) {
        return
      }

      setOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  React.useEffect(() => {
    if (!open || !triggerRef.current) {
      return
    }

    const { offsetWidth } = triggerRef.current
    setMenuStyles({ minWidth: offsetWidth })
    setHighlightedValue(selectedValue ?? null)
  }, [open, selectedValue])

  const contextValue = React.useMemo<SelectContextValue>(
    () => ({
      open,
      setOpen,
      selectedValue,
      setSelectedValue,
      registerItem,
      getItemLabel,
      highlightedValue,
      setHighlightedValue,
      triggerRef,
      disabled,
      menuStyles,
    }),
    [
      disabled,
      getItemLabel,
      highlightedValue,
      menuStyles,
      open,
      registerItem,
      selectedValue,
      setSelectedValue,
    ]
  )

  return (
    <SelectContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={cn("relative inline-flex flex-col", className)}
        {...props}
      >
        {children}
      </div>
    </SelectContext.Provider>
  )
}

type SelectTriggerProps = {
  size?: "sm" | "default"
  disabled?: boolean
} & React.HTMLAttributes<HTMLDivElement>

function SelectTrigger({
  className,
  size = "default",
  disabled: triggerDisabled,
  children,
  ...props
}: SelectTriggerProps) {
  const {
    open,
    setOpen,
    selectedValue,
    triggerRef,
    disabled: contextDisabled,
  } = useSelectContext("SelectTrigger")

  const isDisabled = contextDisabled || triggerDisabled

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isDisabled) {
      return
    }

    if (event.key === " " || event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault()
      setOpen(true)
    }
  }

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDisabled) {
      return
    }

    setOpen(!open)
  }

  return (
    <div
      ref={triggerRef}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-disabled={isDisabled}
      data-slot="select-trigger"
      data-size={size}
      data-open={open ? "" : undefined}
      data-disabled={isDisabled ? "" : undefined}
      data-has-value={selectedValue ? "" : undefined}
      className={cn(
        "relative flex w-fit items-center gap-2 rounded-md border bg-transparent px-3 py-2 pr-9 text-sm outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-hubble-primary/60",
        size === "sm" ? "h-8" : "h-9",
        isDisabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-hubble-primary/60 data-[has-value]:hover:border-hubble-primary",
        className
      )}
      tabIndex={isDisabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
      <svg
        data-slot="select-icon"
        aria-hidden="true"
        viewBox="0 0 10 6"
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-current transition-transform duration-150 ease-out",
          open ? "rotate-180" : "rotate-0"
        )}
        fill="none"
      >
        <path
          d="M1 1.5 5 4.5 9 1.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

type SelectValueProps = {
  placeholder?: string
} & React.HTMLAttributes<HTMLSpanElement>

type SelectClearButtonProps = {
  hideWhenEmpty?: boolean
  disabled?: boolean
} & React.HTMLAttributes<HTMLDivElement>

function SelectClearButton({
  className,
  hideWhenEmpty = true,
  children,
  onClick,
  disabled: clearDisabled,
  ...props
}: SelectClearButtonProps) {
  const {
    selectedValue,
    setSelectedValue,
    setOpen,
    disabled: contextDisabled,
  } = useSelectContext("SelectClearButton")

  const isDisabled = contextDisabled || clearDisabled

  if (hideWhenEmpty && (selectedValue === undefined || selectedValue === null)) {
    return null
  }

  const renderedChildren =
    children ?? <CircleX className="h-4 w-4" aria-hidden="true" />;

  return (
    <div
      data-slot="select-clear"
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full text-hubble-tertiary transition-colors hover:text-hubble-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hubble-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
        isDisabled && "cursor-not-allowed opacity-50",
        className
      )}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      aria-label="Clear selection"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()

        if (isDisabled) {
          return
        }

        setSelectedValue(undefined)
        setOpen(false)
        onClick?.(event)
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return
        }

        event.preventDefault()
        event.stopPropagation()

        if (isDisabled) {
          return
        }

        setSelectedValue(undefined)
        setOpen(false)
        onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>)
      }}
      {...props}
    >
      {renderedChildren}
    </div>
  )
}

function SelectValue({
  placeholder,
  className,
  children,
  ...props
}: SelectValueProps) {
  const { selectedValue, getItemLabel } = useSelectContext("SelectValue")
  const displayValue =
    selectedValue !== undefined && selectedValue !== null
      ? getItemLabel(selectedValue)
      : null

  return (
    <span
      data-slot="select-value"
      data-placeholder={displayValue ? undefined : ""}
      className={cn("flex-1 truncate text-left", className)}
      {...props}
    >
      {displayValue ?? placeholder ?? children ?? ""}
    </span>
  )
}

type SelectContentProps = React.HTMLAttributes<HTMLDivElement>

function SelectContent({
  className,
  style,
  children,
  ...props
}: SelectContentProps) {
  const { open, menuStyles } = useSelectContext("SelectContent")
  const contentRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) {
      return
    }

    const node = contentRef.current

    if (!node) {
      return
    }

    node.style.opacity = "0"
    node.style.transform = "scale(0.95) translateY(-4px)"
    node.style.transition = "opacity 150ms ease, transform 150ms ease"

    const raf = requestAnimationFrame(() => {
      node.style.opacity = "1"
      node.style.transform = "scale(1) translateY(0)"
    })

    return () => cancelAnimationFrame(raf)
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div
      ref={contentRef}
      data-slot="select-content"
      role="listbox"
      className={cn(
        "absolute left-0 top-full z-50 mt-2 max-h-60 overflow-auto rounded-md border bg-hubble-background-secondary/95 py-1 shadow-lg backdrop-blur-sm focus:outline-none",
        className
      )}
      style={{
        opacity: 0,
        transform: "scale(0.95) translateY(-4px)",
        ...menuStyles,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

type SelectGroupProps = React.HTMLAttributes<HTMLDivElement>

function SelectGroup({ className, children, ...props }: SelectGroupProps) {
  return (
    <div
      role="group"
      data-slot="select-group"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      {children}
    </div>
  )
}

type SelectLabelProps = React.HTMLAttributes<HTMLDivElement>

function SelectLabel({ className, ...props }: SelectLabelProps) {
  return (
    <div
      data-slot="select-label"
      className={cn("px-3 pb-1 text-xs uppercase tracking-wide text-hubble-secondary", className)}
      {...props}
    />
  )
}

type SelectItemProps = {
  value: string
  label?: string
  disabled?: boolean
} & Omit<React.HTMLAttributes<HTMLDivElement>, "value">

function SelectItem({
  value,
  label,
  className,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  disabled: itemDisabled = false,
  ...props
}: SelectItemProps) {
  const {
    selectedValue,
    setSelectedValue,
    setOpen,
    registerItem,
    highlightedValue,
    setHighlightedValue,
    disabled: contextDisabled,
  } = useSelectContext("SelectItem")

  const derivedLabel = React.useMemo(() => {
    if (label) {
      return label
    }

    if (typeof children === "string" || typeof children === "number") {
      return String(children)
    }

    return value
  }, [children, label, value])

  React.useEffect(() => registerItem(value, derivedLabel), [
    derivedLabel,
    registerItem,
    value,
  ])

  const isSelected = selectedValue === value
  const isHighlighted = highlightedValue === value
  const disabled = contextDisabled || itemDisabled

  const handleSelect = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) {
      event.preventDefault()
      return
    }

    setSelectedValue(value)
    setOpen(false)
    onClick?.(event)
  }

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      data-slot="select-item"
      data-state={isSelected ? "checked" : undefined}
      data-highlighted={isHighlighted ? "" : undefined}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors focus:outline-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className
      )}
      tabIndex={disabled ? -1 : 0}
      onMouseDown={(event) => {
        if (disabled) {
          event.preventDefault()
        }
      }}
      onClick={handleSelect}
      onMouseEnter={(event) => {
        setHighlightedValue(value)
        onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        setHighlightedValue(null)
        onMouseLeave?.(event)
      }}
      onFocus={() => setHighlightedValue(value)}
      onBlur={() => setHighlightedValue(null)}
      onKeyDown={(event) => {
        if (disabled) {
          return
        }

        if (event.key !== "Enter" && event.key !== " ") {
          return
        }

        event.preventDefault()
        setSelectedValue(value)
        setOpen(false)
        onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>)
      }}
      {...props}
    >
      <span className="flex-1 truncate">{children ?? derivedLabel}</span>
    </div>
  )
}

type SelectSeparatorProps = React.HTMLAttributes<HTMLDivElement>

function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
  return (
    <div
      data-slot="select-separator"
      className={cn("my-1 h-px bg-hubble-background", className)}
      {...props}
    />
  )
}

type ScrollButtonProps = {
  disabled?: boolean
} & React.HTMLAttributes<HTMLDivElement>

function SelectScrollUpButton({ className, ...props }: ScrollButtonProps) {
  return (
    <div
      data-slot="select-scroll-up-button"
      className={cn(
        "flex w-full items-center justify-center px-3 py-1 text-xs text-hubble-secondary",
        className
      )}
      aria-disabled="true"
      {...props}
    >
      ▲
    </div>
  )
}

function SelectScrollDownButton({ className, ...props }: ScrollButtonProps) {
  return (
    <div
      data-slot="select-scroll-down-button"
      className={cn(
        "flex w-full items-center justify-center px-3 py-1 text-xs text-hubble-secondary",
        className
      )}
      aria-disabled="true"
      {...props}
    >
      ▼
    </div>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectClearButton,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
