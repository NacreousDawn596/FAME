package ma.ensam.fame.factory;

/**
 * Generic factory contract: builds a product ({@code T}) from a creation
 * context ({@code C}). Keeps object construction centralized and decoupled
 * from services that persist or orchestrate them.
 *
 * @param <T> the product type
 * @param <C> the creation context type
 */
@FunctionalInterface
public interface Factory<T, C> {
    T create(C context);
}
