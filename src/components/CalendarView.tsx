"use client";

import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";

interface CalendarEvent {
    id: string;
    date: Date;
    title: string;
    color?: string;
    data?: unknown;
}

interface CalendarViewProps {
    events: CalendarEvent[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onEventClick?: (event: CalendarEvent) => void;
    isLoading?: boolean;
}

export function CalendarView({ events, currentDate, onDateChange, onEventClick, isLoading }: CalendarViewProps) {
    const nextMonth = () => onDateChange(addMonths(currentDate, 1));
    const prevMonth = () => onDateChange(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {format(currentDate, "MMMM yyyy", { locale: tr })}
                </h2>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center">
                {weekDays.map((day) => (
                    <div key={day} className="py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr h-auto"> {/* Removed fixed h-screen-something, let it grow */}
                {calendarDays.map((day, dayIdx) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const dayEvents = events.filter((e) => isSameDay(e.date, day));

                    return (
                        <div
                            key={day.toString()}
                            className={`min-h-[120px] bg-white dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 p-2 ${!isCurrentMonth ? "bg-gray-50 dark:bg-gray-900 text-gray-400" : ""
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <span
                                    className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isSameDay(day, new Date())
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-700 dark:text-gray-200"
                                        }`}
                                >
                                    {format(day, "d")}
                                </span>
                            </div>
                            <div className="mt-2 space-y-1">
                                {dayEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        onClick={() => onEventClick && onEventClick(event)}
                                        className={`px-2 py-1 text-xs rounded cursor-pointer truncate font-medium border-l-2 shadow-sm transition-all hover:opacity-80
                                            ${event.color === 'green' ? 'bg-green-50 text-green-700 border-green-500' :
                                                event.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-500' :
                                                    event.color === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-500' :
                                                        'bg-gray-100 text-gray-700 border-gray-500'}
                                        `}
                                        title={event.title}
                                    >
                                        {event.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            {isLoading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            )}
        </div>
    );
}
