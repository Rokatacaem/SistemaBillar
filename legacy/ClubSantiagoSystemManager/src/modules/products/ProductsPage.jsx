import React, { useEffect, useState } from 'react';
import { API_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import ReturnExchangeModal from './ReturnExchangeModal';

const ProductsPage = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', price_socio: '', price_client: '', stock: 0, category: 'Bar', stock_control: true });

    // Stock Management State
    const [showStockModal, setShowStockModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [stockForm, setStockForm] = useState({ amount: '', type: 'PURCHASE', reference_doc: '', provider: '' });

    // Edit State
    const [editingId, setEditingId] = useState(null);

    // History State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [stockHistory, setStockHistory] = useState([]);



    // Return/Exchange State
    const [showReturnModal, setShowReturnModal] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/products`);
            const data = await res.json();
            setProducts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingId ? `${API_URL}/products/${editingId}` : `${API_URL}/products`;
            const method = editingId ? 'PUT' : 'POST';

            await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            setShowForm(false);
            setFormData({ name: '', price_socio: '', price_client: '', stock: 0, category: 'Bar', stock_control: true });
            setEditingId(null);
            fetchProducts();
        } catch (err) {
            alert('Error saving product');
        }
    };

    const handleEdit = (product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name,
            price_socio: product.price_socio,
            price_client: product.price_client,
            stock: product.stock,
            category: product.category,
            stock_control: product.stock_control !== undefined ? product.stock_control : true
        });
        setShowForm(true);
    };

    const handleAddStock = async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_URL}/products/${selectedProduct.id}/stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...stockForm, user_id: user.id })
            });
            setShowStockModal(false);
            setStockForm({ amount: '', type: 'PURCHASE', reference_doc: '', provider: '' });
            fetchProducts();
        } catch (err) {
            alert('Error adding stock');
        }
    };

    const handleDeleteProduct = async (e, id) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar producto permanentemente?')) return;
        try {
            const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('Producto eliminado');
                fetchProducts();
                if (editingId === id) { setEditingId(null); setShowForm(false); }
            } else {
                alert('Error al eliminar');
            }
        } catch (err) { console.error(err); }
    };

    const fetchHistory = async (prod) => {
        try {
            const res = await fetch(`${API_URL}/products/${prod.id}/stock`);
            const data = await res.json();
            setStockHistory(data);
            setSelectedProduct(prod);
            setShowHistoryModal(true);
        } catch (err) {
            console.error(err);
        }
    };

    const openStockModal = (prod) => {
        setSelectedProduct(prod);
        setStockForm({ amount: '', type: 'PURCHASE', reference_doc: '', provider: '' });
        setShowStockModal(true);
    };

    return (
        <div style={{ padding: '20px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: 'var(--color-primary)', margin: 0 }}>Inventario de Productos</h2>
                {(user?.role === 'ADMIN' || user?.role === 'SUPERUSER') && (
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', price_socio: '', price_client: '', stock: 0, category: 'Bar', stock_control: true });
                            setShowForm(true);
                        }}
                        className="btn-primary"
                        style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                    >
                        + Nuevo Producto
                    </button>
                )}
                <button
                    onClick={() => setShowReturnModal(true)}
                    className="btn-secondary"
                    style={{ fontSize: '0.9rem', padding: '8px 16px', marginLeft: '10px', background: '#FF9800', color: '#fff' }}
                    title="Gestionar Devoluciones y Cambios"
                >
                    🔄 Devolución / Cambio
                </button>
            </div>

            {
                showForm && (
                    <div style={{
                        backgroundColor: '#1E1E1E',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: '1px solid #333'
                    }}>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                            <div className="form-group">
                                <label>Nombre</label>
                                <input
                                    className="input-field"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Categoría</label>
                                <select
                                    className="input-field"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option>Bar</option>
                                    <option>Cocina</option>
                                    <option>Otros</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Stock</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={formData.stock}
                                    onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Precio Socio</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={formData.price_socio}
                                    onChange={e => setFormData({ ...formData, price_socio: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Precio Cliente</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={formData.price_client}
                                    onChange={e => setFormData({ ...formData, price_client: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.stock_control}
                                        onChange={e => setFormData({ ...formData, stock_control: e.target.checked })}
                                        style={{ marginRight: '10px', width: '20px', height: '20px' }}
                                    />
                                    Controlar Stock
                                </label>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Guardar</button>
                            </div>
                        </form>
                    </div>
                )
            }

            <div style={{ overflowX: 'auto', backgroundColor: '#1E1E1E', borderRadius: '8px', padding: '10px', height: 'calc(100vh - 150px)', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #333', color: '#888', position: 'sticky', top: 0, backgroundColor: '#1E1E1E', zIndex: 1 }}>
                            <th style={{ padding: '10px' }}>Nombre</th>
                            <th style={{ padding: '10px' }}>Categoría</th>
                            <th style={{ padding: '10px' }}>P. Socio</th>
                            <th style={{ padding: '10px' }}>P. Cliente</th>
                            <th style={{ padding: '10px' }}>Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #333' }}>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.name}</td>
                                <td style={{ padding: '10px' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '4px',
                                        backgroundColor: '#333', fontSize: '0.8rem'
                                    }}>
                                        {p.category}
                                    </span>
                                </td>
                                <td style={{ padding: '10px' }}>${parseInt(p.price_socio).toLocaleString('es-CL')}</td>
                                <td style={{ padding: '10px' }}>${parseInt(p.price_client).toLocaleString('es-CL')}</td>
                                <td style={{ padding: '10px', color: p.stock < 10 ? '#EF5350' : '#4CAF50' }}>{p.stock}</td>
                                <td style={{ padding: '10px' }}>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        {/* History Icon (Always visible) */}
                                        <button
                                            onClick={() => fetchHistory(p)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                            title="Ver Historial"
                                        >
                                            📜
                                        </button>

                                        {/* Add Stock (Cashier & Admin) */}
                                        <button
                                            onClick={() => openStockModal(p)}
                                            style={{
                                                background: '#4CAF50', color: 'white', border: 'none',
                                                borderRadius: '4px', padding: '4px 8px', cursor: 'pointer'
                                            }}
                                            title="Agregar Stock"
                                        >
                                            + Stock
                                        </button>

                                        {/* Edit/Delete (Admin Only) */}
                                        {(user?.role === 'ADMIN' || user?.role === 'SUPERUSER') && (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(p)}
                                                    style={{
                                                        background: '#2196F3', color: 'white', border: 'none',
                                                        borderRadius: '4px', padding: '4px 8px', cursor: 'pointer'
                                                    }}
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteProduct(e, p.id)}
                                                    style={{
                                                        background: '#F44336', color: 'white', border: 'none',
                                                        borderRadius: '4px', padding: '4px 8px', cursor: 'pointer'
                                                    }}
                                                    title="Eliminar"
                                                >
                                                    🗑️
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {products.length === 0 && !loading && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No hay productos registrados</div>
                )}
            </div>

            {/* STOCK MODAL */}
            {
                showStockModal && selectedProduct && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div style={{ backgroundColor: '#1E1E1E', padding: '20px', borderRadius: '8px', width: '400px', border: '1px solid #333' }}>
                            <h3 style={{ color: 'var(--color-primary)', marginTop: 0 }}>Agregar Stock: {selectedProduct.name}</h3>
                            <form onSubmit={handleAddStock} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label>Cantidad a Agregar</label>
                                    <input
                                        type="number" className="input-field"
                                        value={stockForm.amount}
                                        onChange={e => setStockForm({ ...stockForm, amount: e.target.value })}
                                        required min="1"
                                    />
                                </div>
                                <div>
                                    <label>Tipo de Movimiento</label>
                                    <select className="input-field" value={stockForm.type} onChange={e => setStockForm({ ...stockForm, type: e.target.value })}>
                                        <option value="PURCHASE">Compra (Factura/Boleta)</option>
                                        <option value="ADJUSTMENT">Ajuste de Inventario</option>
                                        <option value="RETURN">Devolución</option>
                                    </select>
                                </div>
                                <div>
                                    <label>N° Documento (Opcional)</label>
                                    <input
                                        className="input-field"
                                        placeholder="Ej: Factura 1234"
                                        value={stockForm.reference_doc}
                                        onChange={e => setStockForm({ ...stockForm, reference_doc: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label>Proveedor (Opcional)</label>
                                    <input
                                        className="input-field"
                                        placeholder="Ej: CCU, Coca-Cola"
                                        value={stockForm.provider}
                                        onChange={e => setStockForm({ ...stockForm, provider: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowStockModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* HISTORY MODAL */}
            {
                showHistoryModal && selectedProduct && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div style={{ backgroundColor: '#1E1E1E', padding: '20px', borderRadius: '8px', width: '600px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ color: 'var(--color-primary)', margin: 0 }}>Historial: {selectedProduct.name}</h3>
                                <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                                        <th style={{ textAlign: 'left', padding: '5px' }}>Fecha</th>
                                        <th style={{ textAlign: 'left', padding: '5px' }}>Tipo</th>
                                        <th style={{ textAlign: 'left', padding: '5px' }}>Cambio</th>
                                        <th style={{ textAlign: 'left', padding: '5px' }}>Stock Final</th>
                                        <th style={{ textAlign: 'left', padding: '5px' }}>Ref</th>
                                        <th style={{ textAlign: 'left', padding: '5px' }}>Usuario</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockHistory.map(h => (
                                        <tr key={h.id} style={{ borderBottom: '1px solid #222' }}>
                                            <td style={{ padding: '5px' }}>{new Date(h.created_at).toLocaleDateString()} {new Date(h.created_at).toLocaleTimeString().slice(0, 5)}</td>
                                            <td style={{ padding: '5px' }}>{h.type === 'PURCHASE' ? '🛒 Compra' : h.type === 'ADJUSTMENT' ? '🔧 Ajuste' : h.type}</td>
                                            <td style={{ padding: '5px', color: h.change_amount > 0 ? '#4CAF50' : '#EF5350' }}>{h.change_amount > 0 ? '+' : ''}{h.change_amount}</td>
                                            <td style={{ padding: '5px' }}>{h.new_stock}</td>
                                            <td style={{ padding: '5px', color: '#888' }}>{h.reference_doc || '-'}</td>
                                            <td style={{ padding: '5px' }}>{h.created_by_name || 'Sistema'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }


            {/* RETURN/EXCHANGE MODAL */}
            {
                showReturnModal && (
                    <ReturnExchangeModal
                        onClose={() => setShowReturnModal(false)}
                        products={products}
                        onSuccess={() => {
                            fetchProducts();
                            // Ideally also refresh User page or Sales if visible, but fetchProducts updates stock which is main goal here.
                        }}
                    />
                )
            }
        </div >
    );
};

export default ProductsPage;
