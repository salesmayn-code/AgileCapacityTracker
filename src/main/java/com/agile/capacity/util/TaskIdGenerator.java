package com.agile.capacity.util;

import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.id.IdentifierGenerator;
import java.io.Serializable;
import java.util.UUID;

public class TaskIdGenerator implements IdentifierGenerator {
    @Override
    public Serializable generate(SharedSessionContractImplementor session, Object object) {
        return "GH-" + UUID.randomUUID().toString().substring(0, 8); // Example: GH-3f4a7b2
    }
}