package com.agile.capacity.config;

import org.junit.jupiter.api.Test;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Phase 11: sliding-window rate limit math in isolation. */
class RateLimitFilterTest {

    @Test
    void allowsUpToLimitThenBlocks() {
        Map<String, Deque<Long>> windows = new HashMap<>();
        assertThat(RateLimitFilter.tryAcquire(windows, "ip-1", 3)).isTrue();
        assertThat(RateLimitFilter.tryAcquire(windows, "ip-1", 3)).isTrue();
        assertThat(RateLimitFilter.tryAcquire(windows, "ip-1", 3)).isTrue();
        // 4th within the window -> blocked
        assertThat(RateLimitFilter.tryAcquire(windows, "ip-1", 3)).isFalse();
    }

    @Test
    void tracksKeysIndependently() {
        Map<String, Deque<Long>> windows = new HashMap<>();
        assertThat(RateLimitFilter.tryAcquire(windows, "ip-1", 1)).isTrue();
        assertThat(RateLimitFilter.tryAcquire(windows, "ip-1", 1)).isFalse();
        // different key unaffected
        assertThat(RateLimitFilter.tryAcquire(windows, "ip-2", 1)).isTrue();
    }

    @Test
    void windowSlidesOpenAgainAfterExpiry() {
        Map<String, Deque<Long>> windows = new HashMap<>();
        // pre-load a window fully consumed 61s ago (expired entries)
        Deque<Long> stale = new ArrayDeque<>();
        long old = System.currentTimeMillis() - 61_000L;
        stale.add(old);
        stale.add(old);
        windows.put("ip-1", stale);

        // expired hits are evicted -> the new request passes
        assertThat(RateLimitFilter.tryAcquire(windows, "ip-1", 2)).isTrue();
        // the fresh hit (plus nothing else) fills the window at limit 2
        assertThat(RateLimitFilter.tryAcquire(windows, "ip-1", 2)).isTrue();
        // third hit within the same window -> blocked
        assertThat(RateLimitFilter.tryAcquire(windows, "ip-1", 2)).isFalse();
    }
}
