import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernDatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  onClose: () => void;
  minYear?: number;
  maxYear?: number;
}

export function ModernDatePicker({ 
  value, 
  onChange, 
  onClose, 
  minYear = 1924, 
  maxYear = 2006 
}: ModernDatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value + 'T00:00:00') : null
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (value) {
      return new Date(value + 'T00:00:00');
    }
    return new Date(1990, 0, 1); // Default to January 1990
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = [
    { short: 'S', full: 'Sunday' },
    { short: 'M', full: 'Monday' },
    { short: 'T', full: 'Tuesday' },
    { short: 'W', full: 'Wednesday' },
    { short: 'T', full: 'Thursday' },
    { short: 'F', full: 'Friday' },
    { short: 'S', full: 'Saturday' }
  ];

  const formatSelectedDate = (date: Date | null) => {
    if (!date) return 'Select Date';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const isDateInCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear();
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  const isDateDisabled = (date: Date) => {
    const year = date.getFullYear();
    return year < minYear || year > maxYear || date > new Date();
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    setSelectedDate(date);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const handleOk = () => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    }
    onClose();
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="bg-purple-600 text-white p-4 rounded-t-lg">
          <div className="text-sm font-medium opacity-90 mb-1">SELECT DATE</div>
          <div className="flex items-center justify-between">
            <div className="text-xl font-medium">
              {formatSelectedDate(selectedDate)}
            </div>
            <Edit className="w-5 h-5 opacity-75" />
          </div>
        </div>

        {/* Calendar */}
        <div className="p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              className="p-1"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-medium">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="p-1"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day, index) => (
              <div key={index} className="text-center text-sm font-medium text-gray-500 py-2">
                {day.short}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => (
              <button
                key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                onClick={() => handleDateClick(date)}
                disabled={isDateDisabled(date)}
                className={cn(
                  "aspect-square flex items-center justify-center text-sm rounded-full hover:bg-gray-100 transition-colors",
                  !isDateInCurrentMonth(date) && "text-gray-300",
                  isDateSelected(date) && "bg-purple-600 text-white hover:bg-purple-700",
                  isDateDisabled(date) && "text-gray-300 cursor-not-allowed hover:bg-transparent",
                  isDateInCurrentMonth(date) && !isDateSelected(date) && !isDateDisabled(date) && "text-gray-900"
                )}
              >
                {date.getDate()}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" onClick={onClose}>
            CANCEL
          </Button>
          <Button 
            onClick={handleOk}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={!selectedDate}
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}