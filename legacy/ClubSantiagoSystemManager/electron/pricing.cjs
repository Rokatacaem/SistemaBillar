/**
 * Calculates the price for a product/service based on user status.
 * @param {Object} product - { price_socio, price_client }
 * @param {Object} user - { type, debt_status }
 * @returns {Number} Final Price
 */
function calculatePrice(product, user) {
    if (!product) return 0;
    if (!user) return product.price_client; // Default to client price if no user

    // Rule: SOCIO con MOROSIDAD paga como CLIENTE
    if (user.type === 'SOCIO') {
        if (user.debt_status) {
            return product.price_client; // Penalizado
        }
        return product.price_socio; // Precio Preferencial
    }

    // Default: CLIENTE
    return product.price_client;
}

module.exports = { calculatePrice };
