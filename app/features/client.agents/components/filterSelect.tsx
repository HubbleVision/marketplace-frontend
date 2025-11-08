import { cn } from "~/lib/utils";
import {
  Select,
  SelectClearButton,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type SelectOption = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  placeholder?: string;
  label?: string;
  labelClassName?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  isLoading?: boolean;
  loadingPlaceholder?: string;
  emptyStateLabel?: string;
  disabled?: boolean;
};

export default function FilterSelect({
  options,
  value,
  onValueChange,
  placeholder = "Network",
  label = "Label",
  labelClassName,
  className,
  triggerClassName,
  contentClassName,
  isLoading = false,
  loadingPlaceholder = "Loading...",
  emptyStateLabel = "No options available",
  disabled = false,
}: FilterSelectProps) {
  const isDisabled = disabled || isLoading;

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      className={className}
      disabled={isDisabled}
    >
      <SelectTrigger
        className={cn(
          "w-[140px] border border-white/5 bg-hubble-background-secondary text-white data-[placeholder]:text-white focus:border-transparent focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus:ring-0 pr-12",
          value &&
            "border-hubble-primary bg-black text-hubble-primary focus-visible:border-hubble-primary",
          triggerClassName
        )}
      >
        <SelectValue
          placeholder={isLoading ? loadingPlaceholder : placeholder}
        />
        <SelectClearButton
          className="absolute right-8 top-1/2 -translate-y-1/2"
          disabled={isDisabled}
        />
      </SelectTrigger>
      <SelectContent
        className={cn(
          "border-0 bg-hubble-background-secondary text-white focus-visible:ring-0 focus:ring-0 **:data-[slot=select-scroll-up-button]:text-white **:data-[slot=select-scroll-down-button]:text-white",
          contentClassName
        )}
      >
        <SelectGroup>
          {label && (
            <SelectLabel
              className={cn("text-hubble-secondary", labelClassName)}
            >
              {label}
            </SelectLabel>
          )}
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-hubble-secondary">
              {loadingPlaceholder}
            </div>
          ) : options.length > 0 ? (
            options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-white data-[highlighted]:bg-hubble-background data-[highlighted]:text-hubble-primary data-[state=checked]:bg-hubble-background data-[state=checked]:text-hubble-primary"
              >
                {option.label}
              </SelectItem>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-hubble-secondary">
              {emptyStateLabel}
            </div>
          )}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
