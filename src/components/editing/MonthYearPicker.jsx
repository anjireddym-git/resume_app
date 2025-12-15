import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { parseDate, toStorageFormat, getMonthOptions, getYearRange, isPresent } from '../../lib/dateUtils';

const MonthYearPicker = ({ 
  value, 
  onChange, 
  placeholder = 'Select date',
  showPresent = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isPresentChecked, setIsPresentChecked] = useState(false);
  const containerRef = useRef(null);

  const months = getMonthOptions();
  const years = getYearRange(1970);

  // Parse initial value
  useEffect(() => {
    if (isPresent(value)) {
      setIsPresentChecked(true);
    } else {
      setIsPresentChecked(false);
      const parsed = parseDate(value);
      if (parsed) {
        setSelectedMonth(parsed.month);
        setSelectedYear(parsed.year);
      }
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = () => {
    if (isPresentChecked) {
      onChange('Present');
    } else {
      const month = String(selectedMonth + 1).padStart(2, '0');
      onChange(`${selectedYear}-${month}`);
    }
    setIsOpen(false);
  };

  const handlePresentToggle = (checked) => {
    setIsPresentChecked(checked);
    if (checked) {
      onChange('Present');
      setIsOpen(false);
    }
  };

  // Display value
  const displayValue = () => {
    if (!value) return placeholder;
    if (isPresent(value)) return 'Present';
    const parsed = parseDate(value);
    if (parsed) {
      return `${months[parsed.month]?.label || ''} ${parsed.year}`;
    }
    return value;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-sm border border-neutral-200 rounded-lg hover:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white"
      >
        <span className={value ? 'text-neutral-700' : 'text-neutral-400'}>
          {displayValue()}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg p-3">
          {/* Present Checkbox */}
          {showPresent && (
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPresentChecked}
                onChange={(e) => handlePresentToggle(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
              />
              <span className="text-sm text-neutral-700">Present / Current</span>
            </label>
          )}

          {!isPresentChecked && (
            <>
              {/* Month/Year Selectors */}
              <div className="flex gap-2 mb-3">
                {/* Month */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="flex-1 px-2 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                {/* Year */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-24 px-2 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Apply Button */}
              <button
                type="button"
                onClick={handleApply}
                className="w-full px-3 py-1.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800"
              >
                Apply
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthYearPicker;
