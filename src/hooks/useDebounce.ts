"use client";

import { useEffect, useState } from "react";

/**
 * Returns a debounced version of the provided value.
 *
 * @param value - Any value that needs debouncing.
 * @param delay - Delay in milliseconds before updating the debounced value.
 */
export function useDebounce<T>(value: T, delay = 300): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;
