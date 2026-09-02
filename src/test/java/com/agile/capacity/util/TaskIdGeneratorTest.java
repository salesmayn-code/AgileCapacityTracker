package com.agile.capacity.util;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;

class TaskIdGeneratorTest {

    @Test
    void generatesPrefixedId() {
        TaskIdGenerator generator = new TaskIdGenerator();
        String id = (String) generator.generate(null, Mockito.mock(Object.class));

        assertThat(id).startsWith("GH-").hasSize(11); // "GH-" + 8 chars
    }

    @Test
    void generatesUniqueIds() {
        TaskIdGenerator generator = new TaskIdGenerator();

        String first = (String) generator.generate(null, new Object());
        String second = (String) generator.generate(null, new Object());

        assertThat(first).isNotEqualTo(second);
    }
}
