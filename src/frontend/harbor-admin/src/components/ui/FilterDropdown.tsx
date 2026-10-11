import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { FiChevronDown } from "react-icons/fi";
import type { IconType } from "react-icons";

export interface FilterOption {
  value: string;
  label: string;
  icon?: IconType | React.ElementType;
  iconColor?: string;
}

interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  align?: "left" | "right";
  icon?: React.ReactNode;
  className?: string;
  footerSlot?: React.ReactNode;
  testId?: string;
}

const FilterDropdown = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  align = "left",
  icon,
  className,
  footerSlot,
  testId,
}: FilterDropdownProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div ref={containerRef} className="relative inline-block text-left z-[100]">
      <motion.div animate={open ? "open" : "closed"} className="relative">
        <button
          onClick={() => setOpen((pv) => !pv)}
          data-testid={testId}
          className={className || "flex items-center justify-between gap-2 h-8 px-3 text-sm border border-gray-300 dark:border-[#525252] bg-white dark:bg-[#0b1221] text-gray-700 dark:text-[#c9c9c9] rounded-md hover:bg-gray-50 dark:hover:bg-[#111c33] transition-colors min-w-[140px]"}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
            <span className="font-medium text-sm whitespace-nowrap truncate">{displayLabel}</span>
          </div>
          <motion.span variants={iconVariants} className="text-gray-400 shrink-0">
            <FiChevronDown />
          </motion.span>
        </button>

        <motion.ul
          data-testid={testId ? `${testId}-options` : undefined}
          initial={wrapperVariants.closed}
          variants={wrapperVariants}
          style={{ 
            originY: "top", 
            ...(align === "left" ? { left: 0 } : { right: 0 }) 
          }}
          className="flex flex-col gap-1 p-1.5 rounded-sm bg-white dark:bg-[#0b1221] border border-gray-300 dark:border-[#525252] absolute top-[120%] w-full overflow-hidden z-[100] shadow-lg shadow-black/5 dark:shadow-black/20"
        >
          {options.map((option) => (
            <Option
              key={option.value}
              option={option}
              isSelected={value === option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            />
          ))}
          {footerSlot && (
            <motion.div variants={itemVariants} className="pt-1 mt-1 border-t border-gray-300 dark:border-[#525252]">
              {footerSlot}
            </motion.div>
          )}
        </motion.ul>
      </motion.div>
    </div>
  );
};

const Option = ({
  option,
  isSelected,
  onClick,
}: {
  option: FilterOption;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const Icon = option.icon;

  return (
    <motion.li
      variants={itemVariants}
      onClick={onClick}
      className={`flex items-center gap-2 w-full p-2 text-sm font-medium whitespace-nowrap rounded-sm transition-colors cursor-pointer ${
        isSelected
          ? "bg-blue-100/50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400"
          : "text-gray-700 dark:text-[#c9c9c9] hover:bg-blue-50/50 dark:hover:bg-[#111c33]"
      }`}
    >
      {Icon && (
        <motion.span variants={actionIconVariants} className={option.iconColor || "text-gray-400 dark:text-gray-500 shrink-0"}>
          <Icon className="w-3.5 h-3.5" />
        </motion.span>
      )}
      <span className="truncate">{option.label}</span>
    </motion.li>
  );
};

export default FilterDropdown;

const wrapperVariants = {
  open: {
    scaleY: 1,
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.05,
      duration: 0.2
    },
  },
  closed: {
    scaleY: 0,
    opacity: 0,
    transition: {
      when: "afterChildren",
      staggerChildren: 0.05,
      duration: 0.2
    },
  },
};

const iconVariants = {
  open: { rotate: 180 },
  closed: { rotate: 0 },
};

const itemVariants = {
  open: {
    opacity: 1,
    y: 0,
    transition: {
      when: "beforeChildren",
      duration: 0.2
    },
  },
  closed: {
    opacity: 0,
    y: -10,
    transition: {
      when: "afterChildren",
      duration: 0.2
    },
  },
};

const actionIconVariants = {
  open: { scale: 1, y: 0 },
  closed: { scale: 0, y: -7 },
};
