package com.agile.capacity.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class SprintLengthCalculatorTest {

    @Test
    void countsWeekdaysInclusiveFullWeeks() {
        // 2026-09-07 (Mon) .. 2026-09-18 (Fri): two full working weeks = 10 weekdays
        assertThat(SprintLengthCalculator.weekdayCount(
                LocalDate.parse("2026-09-07"), LocalDate.parse("2026-09-18"))).isEqualTo(10);
    }

    @Test
    void countsWeekdaysInclusivePartialWeek() {
        // 2026-09-01 (Tue) .. 2026-09-04 (Fri): Tue/Wed/Thu/Fri = 4
        assertThat(SprintLengthCalculator.weekdayCount(
                LocalDate.parse("2026-09-01"), LocalDate.parse("2026-09-04"))).isEqualTo(4);
    }

    @Test
    void singleWeekdayIsOne() {
        assertThat(SprintLengthCalculator.weekdayCount(
                LocalDate.parse("2026-09-03"), LocalDate.parse("2026-09-03"))).isEqualTo(1); // Thursday
    }

    @Test
    void weekendOnlySpanCountsZero() {
        // 2026-09-05 (Sat) .. 2026-09-06 (Sun)
        assertThat(SprintLengthCalculator.weekdayCount(
                LocalDate.parse("2026-09-05"), LocalDate.parse("2026-09-06"))).isZero();
    }

    @Test
    void boundariesLandingOnWeekendsAreExcluded() {
        // 2026-09-05 (Sat) .. 2026-09-07 (Mon): only Monday counts
        assertThat(SprintLengthCalculator.weekdayCount(
                LocalDate.parse("2026-09-05"), LocalDate.parse("2026-09-07"))).isEqualTo(1);
        // 2026-09-04 (Fri) .. 2026-09-06 (Sun): only Friday counts
        assertThat(SprintLengthCalculator.weekdayCount(
                LocalDate.parse("2026-09-04"), LocalDate.parse("2026-09-06"))).isEqualTo(1);
    }

    @Test
    void nullBoundsFallBackTo10() {
        assertThat(SprintLengthCalculator.weekdayCount(null, LocalDate.parse("2026-09-04")))
                .isEqualTo(SprintLengthCalculator.FALLBACK_SPRINT_DAYS);
        assertThat(SprintLengthCalculator.weekdayCount(LocalDate.parse("2026-09-01"), null))
                .isEqualTo(SprintLengthCalculator.FALLBACK_SPRINT_DAYS);
        assertThat(SprintLengthCalculator.weekdayCount(null, null))
                .isEqualTo(SprintLengthCalculator.FALLBACK_SPRINT_DAYS);
    }

    @Test
    void reversedDatesFallBackTo10() {
        // Reversed spans are rejected at sprint save (400) and must never yield negatives here
        assertThat(SprintLengthCalculator.weekdayCount(
                LocalDate.parse("2026-09-14"), LocalDate.parse("2026-09-01")))
                .isEqualTo(SprintLengthCalculator.FALLBACK_SPRINT_DAYS);
    }

    @Test
    void isActiveMatchesInclusiveRange() {
        LocalDate start = LocalDate.parse("2026-09-01");
        LocalDate end = LocalDate.parse("2026-09-14");
        LocalDate today = LocalDate.parse("2026-09-07");
        assertThat(SprintLengthCalculator.isActive(start, end, today)).isTrue();
        assertThat(SprintLengthCalculator.isActive(start, end, start)).isTrue();  // inclusive start
        assertThat(SprintLengthCalculator.isActive(start, end, end)).isTrue();    // inclusive end
        assertThat(SprintLengthCalculator.isActive(start, end, start.minusDays(1))).isFalse();
        assertThat(SprintLengthCalculator.isActive(start, end, end.plusDays(1))).isFalse();
    }

    @Test
    void isActiveIsFalseForNullBounds() {
        assertThat(SprintLengthCalculator.isActive(null, LocalDate.parse("2026-09-14"),
                LocalDate.parse("2026-09-07"))).isFalse();
        assertThat(SprintLengthCalculator.isActive(LocalDate.parse("2026-09-01"), null,
                LocalDate.parse("2026-09-07"))).isFalse();
        assertThat(SprintLengthCalculator.isActive(null, null, LocalDate.parse("2026-09-07"))).isFalse();
    }
}
