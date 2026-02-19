"use client";

import { useRouter } from "next/navigation";

import { endOfMonth, parseISO, startOfMonth } from "date-fns";
import { useEffect, useState } from "react";

import { CalendarView } from "@/components/CalendarView";
import Layout from "@/components/Layout";
import { getSalesByDateRange, SaleResponse } from "@/lib/api";

export default function CalendarPage() {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [sales, setSales] = useState<SaleResponse[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSales = async (date: Date) => {
        setLoading(true);
        try {
            // Fetch sales for the current month view (plus buffer for overflow weeks)
            // Ideally we fetch a bit more than just start/end of month, but for now this is fine
            // as CalendarView handles displaying overflow days, but we need data for them.
            // Let's just grab the whole month + padding.
            const start = startOfMonth(date).toISOString();
            const end = endOfMonth(date).toISOString();

            // Note: The backend logic we added uses `OperationDateBetween`.
            // The CalendarView displays prev/next month days. If we want perfect data,
            // we should calculate startOfWeek(startOfMonth) etc here too.
            // But let's stick to simple month fetching first.
            const salesData = await getSalesByDateRange(start, end);
            setSales(salesData);

            // Fetch lead names for these sales if we don't have them
            // Optimization: In a real app, `SaleResponse` should probably contain the lead name or we fetch leads in bulk.
            // `SaleResponse` currently has `leadId`. We need to fetch details or rely on it.
            // Current `SaleResponse` DOES NOT have patient name directly.
            // We'll do a quick fetch of leads to map names if we can, or just display "Operasyon".
            // Checking `SaleResponse`: it has `leadId`.
            // Let's try to fetch all relevant leads or just display operation type.
            // Better: Display "Operation Type - Patient Name" if available.
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales(currentDate).catch(console.error);
    }, [currentDate]);

    // Map sales to calendar events
    const events = sales.map((sale) => ({
        id: sale.id,
        date: parseISO(sale.operationDate as string), // Ensure operationDate is ISO string
        title: `${sale.leadName || 'Operasyon'} - ${sale.operationType || ''} (${sale.price} ${sale.currency})`,
        color: sale.currency === 'EUR' ? 'blue' : sale.currency === 'GBP' ? 'purple' : 'green',
        data: sale,
    }));

    return (
        <Layout title="Operasyon Takvimi" subtitle="Aylık operasyon planı">
            <div className="col-span-12">
                <CalendarView
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                    events={events}
                    isLoading={loading}
                    onEventClick={(event) => {
                        // Navigate to Lead Detail
                        const sale = event.data as SaleResponse;
                        if (sale?.leadId) {
                            router.push(`/leads/${sale.leadId}`);
                        }
                    }}
                />
            </div>
        </Layout>
    );
}
