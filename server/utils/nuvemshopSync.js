'use strict';

const nuvemshopService = require('../services/nuvemshopService');
const { encrypt } = require('./encryption');

/**
 * Converte o valor de um pedido Nuvemshop para float em reais.
 */
function parseOrderValue(total) {
  const v = parseFloat(total);
  return isNaN(v) ? 0 : v;
}

/**
 * Extrai o primeiro preço de venda de um produto Nuvemshop.
 */
function parseProductPrice(product) {
  if (product.variants && product.variants.length > 0) {
    return parseFloat(product.variants[0].price || 0);
  }
  return 0;
}

/**
 * Extrai o estoque total de um produto (soma das variantes).
 */
function parseProductStock(product) {
  if (!product.variants || product.variants.length === 0) return 0;
  return product.variants.reduce((sum, v) => {
    const qty = parseInt(v.stock, 10);
    return sum + (isNaN(qty) ? 0 : qty);
  }, 0);
}

/**
 * Sincroniza pedidos pagos da Nuvemshop como transações de receita no ALYA.
 * Filtra por payment_status diretamente na API (server-side) para economizar rate limit.
 *
 * @param {object} db - Instância do Database
 * @param {string} userId - ID do usuário no ALYA
 * @param {string} token - Access token Nuvemshop (descriptografado)
 * @param {string} storeId - ID da loja Nuvemshop
 * @param {Date|null} since - Buscar apenas pedidos atualizados após esta data
 * @returns {{ imported: number, skipped: number, errors: number }}
 */
async function syncOrders(db, userId, token, storeId, since) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Busca pedidos pagos e autorizados diretamente via query param (filtragem server-side)
  const [paidOrders, authorizedOrders] = await Promise.all([
    nuvemshopService.getAllOrders(token, storeId, since, 'paid'),
    nuvemshopService.getAllOrders(token, storeId, since, 'authorized'),
  ]);

  // Deduplica por ID (improvável, mas seguro)
  const seen = new Set();
  const allPaidOrders = [...paidOrders, ...authorizedOrders].filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });

  for (const order of allPaidOrders) {
    try {
      const existing = await db.getSyncMap(userId, 'order', order.id);
      if (existing) {
        skipped++;
        continue;
      }

      const orderDate = order.paid_at || order.created_at || new Date().toISOString();

      const transaction = await db.saveTransaction({
        date: orderDate.split('T')[0],
        description: `Pedido #${order.number} - Nuvemshop`,
        value: parseOrderValue(order.total),
        type: 'Receita',
        category: 'Venda Online',
      });

      await db.saveSyncMap(userId, 'order', order.id, transaction.id);
      imported++;
    } catch (err) {
      console.error(`[NuvemshopSync] Erro ao importar pedido ${order.id}:`, err.message);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

/**
 * Sincroniza produtos da Nuvemshop com o cadastro de produtos do ALYA.
 *
 * @param {object} db - Instância do Database
 * @param {string} userId - ID do usuário no ALYA
 * @param {string} token - Access token Nuvemshop (descriptografado)
 * @param {string} storeId - ID da loja Nuvemshop
 * @param {Date|null} since - Buscar apenas produtos atualizados após esta data
 * @returns {{ imported: number, updated: number, skipped: number, errors: number }}
 */
async function syncProducts(db, userId, token, storeId, since) {
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const products = await nuvemshopService.getAllProducts(token, storeId, since);

  for (const product of products) {
    try {
      const price = parseProductPrice(product);
      const stock = parseProductStock(product);

      // Nome do produto (API retorna objeto multilíngue: { pt: "...", es: "..." })
      const name = typeof product.name === 'object'
        ? (product.name.pt || product.name.es || Object.values(product.name)[0] || 'Sem nome')
        : (product.name || 'Sem nome');

      const existing = await db.getSyncMap(userId, 'product', product.id);

      if (existing) {
        await db.updateProduct(existing.localId, { price, stock });
        updated++;
      } else {
        const created = await db.saveProduct({
          name,
          category: 'Nuvemshop',
          price,
          cost: 0,
          stock,
          sold: 0,
        });
        await db.saveSyncMap(userId, 'product', product.id, created.id);
        imported++;
      }
    } catch (err) {
      console.error(`[NuvemshopSync] Erro ao sincronizar produto ${product.id}:`, err.message);
      errors++;
    }
  }

  return { imported, updated, skipped, errors };
}

/**
 * Sincroniza clientes da Nuvemshop com o cadastro de clientes do ALYA.
 * Dados sensíveis (email, phone) são criptografados com AES-256-GCM.
 *
 * @param {object} db - Instância do Database
 * @param {string} userId - ID do usuário no ALYA
 * @param {string} token - Access token Nuvemshop (descriptografado)
 * @param {string} storeId - ID da loja Nuvemshop
 * @param {Date|null} since - Buscar apenas clientes atualizados após esta data
 * @returns {{ imported: number, updated: number, errors: number }}
 */
async function syncCustomers(db, userId, token, storeId, since) {
  let imported = 0;
  let updated = 0;
  let errors = 0;

  const customers = await nuvemshopService.getAllCustomers(token, storeId, since);

  for (const customer of customers) {
    try {
      const existing = await db.getSyncMap(userId, 'customer', customer.id);

      const encryptedEmail = customer.email ? encrypt(customer.email) : null;
      const encryptedPhone = customer.phone ? encrypt(customer.phone) : null;

      if (existing) {
        await db.updateClient(existing.localId, {
          name: customer.name || '',
          email: encryptedEmail,
          phone: encryptedPhone,
        });
        updated++;
      } else {
        const created = await db.saveClient({
          name: customer.name || '',
          email: encryptedEmail,
          phone: encryptedPhone,
          address: null,
          cpf: null,
          cnpj: null,
        });
        await db.saveSyncMap(userId, 'customer', customer.id, created.id);
        imported++;
      }
    } catch (err) {
      console.error(`[NuvemshopSync] Erro ao sincronizar cliente ${customer.id}:`, err.message);
      errors++;
    }
  }

  return { imported, updated, errors };
}

module.exports = { syncOrders, syncProducts, syncCustomers };
