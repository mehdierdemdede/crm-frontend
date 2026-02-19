"use client";

import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths, isToday } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import React from "react";

import { Button } from "./Button";
import { Card } from "./Card";

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
    const goToToday = () => onDateChange(new Date());

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
        <Card className="h-full flex flex-col shadow-md border-0 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 capitalize flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-blue-600" />
                        {format(currentDate, "MMMM yyyy", { locale: tr })}
                    </h2>
                    <Button variant="outline" size="sm" onClick={goToToday} className="hidden sm:flex ml-2">
                        Bugün
                    </Button>
                </div>

                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 p-1 rounded-lg">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 shadow-sm transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 shadow-sm transition-all"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                {weekDays.map((day) => (
                    <div key={day} className="py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-gray-100 dark:bg-gray-700 gap-[1px]">
                {calendarDays.map((day) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const dayEvents = events.filter((e) => isSameDay(e.date, day));
                    const isTodayDate = isToday(day);

                    return (
                        <div
                            key={day.toString()}
                            className={`min-h-[140px] bg-white dark:bg-gray-800 p-3 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/80 flex flex-col relative group
                                ${!isCurrentMonth ? "bg-gray-50/30 dark:bg-gray-900/30 text-gray-400" : ""}
                            `}
                        >
                            {/* Day Number */}
                            <div className="flex justify-between items-start mb-2">
                                <span
                                    className={`text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full transition-all
                                        ${isTodayDate
                                            ? "bg-blue-600 text-white shadow-md scale-110"
                                            : "text-gray-700 dark:text-gray-300 group-hover:bg-gray-100 dark:group-hover:bg-gray-700"
                                        }`}
                                >
                                    {format(day, "d")}
                                </span>
                                {dayEvents.length > 0 && (
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                                        {dayEvents.length}
                                    </span>
                                )}
                            </div>

                            {/* Events List */}
                            <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-[100px] scrollbar-hide">
                                {dayEvents.map((event) => {
                                    // Dynamic color class mapping
                                    let colorClass = "bg-gray-100 text-gray-700 border-l-4 border-gray-500 hover:bg-gray-200";
                                    if (event.color === 'blue') colorClass = "bg-blue-50 text-blue-700 border-l-4 border-blue-500 hover:bg-blue-100";
                                    if (event.color === 'green') colorClass = "bg-green-50 text-green-700 border-l-4 border-green-500 hover:bg-green-100";
                                    if (event.color === 'purple') colorClass = "bg-purple-50 text-purple-700 border-l-4 border-purple-500 hover:bg-purple-100";

                                    return (
                                        <div
                                            key={event.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onEventClick) onEventClick(event);
                                            }}
                                            className={`px-2 py-1.5 text-xs rounded-r-md cursor-pointer font-medium shadow-sm transition-all hover:translate-x-0.5
                                                ${colorClass}
                                            `}
                                            title={event.title}
                                        >
                                            <div className="truncate">{event.title}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all">
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Yükleniyor...</span>
                    </div>
                </div>
            )}
        </Card>
    );
}
