import React from "react";
import { Users } from "lucide-react";
import { formatShortDateFromDateOnly } from "../utils/dateFormatters";

const PALETTE = [
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-fuchsia-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
];

function getInitials(name) {
  const value = String(name || "").trim();
  if (!value) return "NA";

  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const DailyAttendanceSummary = ({
  items = [],
  selectedDate = null,
  compact = false,
  showLabel = true,
  selectedKey = null,
  onItemClick = null,
  className = "",
}) => {
  if (!selectedDate || !Array.isArray(items) || items.length === 0) {
    return null;
  }

  const total = items.reduce((sum, item) => sum + (Number(item?.count) || 0), 0);
  const formattedDate = formatShortDateFromDateOnly(selectedDate);
  const visibleItems = items.slice(0, compact ? 4 : items.length);
  const hiddenCount = compact && items.length > 4 ? items.length - 4 : 0;

  return (
    <div className={`min-w-0 ${className}`}>
      {showLabel && (
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
          <Users size={11} className="shrink-0" />
          <span className="truncate">
            Atendidos {formattedDate ? `- ${formattedDate}` : ""}
            {total > 0 ? ` · ${total}` : ""}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {visibleItems.map((item, index) => {
          const initials = getInitials(item?.name);
          const count = Number(item?.count) || 0;
          const color = PALETTE[index % PALETTE.length];
          const isSelected = selectedKey != null && String(selectedKey) === String(item?.key ?? "");
          const Wrapper = onItemClick ? "button" : "div";
          const wrapperProps = onItemClick
            ? {
                type: "button",
                onClick: () => onItemClick(item),
                "aria-pressed": isSelected,
                className:
                  "group flex min-w-0 flex-col items-center rounded-lg outline-none transition-transform active:scale-95",
              }
            : {
                className: "group flex min-w-0 flex-col items-center",
              };

          return (
            <Wrapper
              key={`${item?.name || "user"}-${index}`}
              title={`${item?.name || "Sin asignar"}: ${count} depósito${count === 1 ? "" : "s"}`}
              {...wrapperProps}
            >
              <div
                className={`relative flex items-center justify-center rounded-full bg-gradient-to-br ${color} ${
                  compact ? "h-8 w-8" : "h-11 w-11"
                } ${
                  isSelected ? "ring-2 ring-red-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900" : ""
                } text-[10px] font-extrabold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}
              >
                <span>{initials}</span>
                <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-gray-900 px-1 text-[9px] font-bold leading-none text-white dark:border-gray-900">
                  {count}
                </span>
              </div>

              {!compact && (
                <span className="mt-1 max-w-14 truncate text-[10px] text-gray-600 dark:text-gray-400">
                  {item?.name || "Sin asignar"}
                </span>
              )}
            </Wrapper>
          );
        })}

        {hiddenCount > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-[10px] font-bold text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyAttendanceSummary;
