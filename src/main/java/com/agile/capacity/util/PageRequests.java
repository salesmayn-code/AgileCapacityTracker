package com.agile.capacity.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/** Normalizes client pagination parameters into bounded Pageable instances. */
public final class PageRequests {
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private PageRequests() {}

    public static Pageable of(Integer page, Integer size) {
        int p = page == null || page < 0 ? 0 : page;
        int s = size == null || size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
        return PageRequest.of(p, s);
    }
}
