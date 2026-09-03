package com.agile.capacity.util;

import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * Phase 9 capacity math: sprint length = count of weekdays (Mon-Fri) between
 * start and end dates, inclusive. Pure functions, unit-tested in isolation.
 */
public final class SprintLengthCalculator {

    /** Fallback when no dated sprint is active (documented, mirrors the old 10-day assumption). */
    public static final int FALLBACK_SPRINT_DAYS = 10;

    private SprintLengthCalculator() {}

    /**
     * Weekdays (Mon-Fri) between start and end, inclusive. Null-safe: any null
     * bound means "no sprint length" and yields the fallback.
     */
    public static int weekdayCount(LocalDate start, LocalDate end) {
        if (start == null || end == null || end.isBefore(start)) {
            return FALLBACK_SPRINT_DAYS;
        }
        int weekdays = 0;
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            DayOfWeek dow = day.getDayOfWeek();
            if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
                weekdays++;
            }
        }
        return weekdays;
    }

    /** The sprint whose date range contains today (start <= today <= end); null when none does. */
    public static boolean isActive(LocalDate start, LocalDate end, LocalDate today) {
        return start != null && end != null && !today.isBefore(start) && !today.isAfter(end);
    }
}
