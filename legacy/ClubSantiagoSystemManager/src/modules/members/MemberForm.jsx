import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import ImageUpload from '../../components/common/ImageUpload';

const MemberForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user: currentUser } = useAuth(); // Context user

    const [enableSystemAccess, setEnableSystemAccess] = useState(false);
    const [registrationDate, setRegistrationDate] = useState(null); // Track registration date
    const [formData, setFormData] = useState({
        rut: '',
        name1: '',
        name2: '',
        surname1: '',
        surname2: '',
        type: 'CLIENTE',
        role: 'USER',
        flag_country: 'CL',
        photo_url: '',
        credit_limit: 0
    });

    useEffect(() => {
        if (id) {
            fetchUser();
        }
    }, [id]);

    const fetchUser = async () => {
        try {
            const res = await fetch(`${API_URL}/users/${id}`);
            const user = await res.json();

            // Split name roughly for form (assuming basic format)
            const parts = user.full_name.split(' ');
            setFormData({
                rut: user.rut,
                name1: parts[0] || '',
                name2: parts.length > 2 ? parts[1] : '',
                surname1: parts.length > 2 ? parts[parts.length - 2] : (parts[1] || ''),
                surname2: parts.length > 1 ? parts[parts.length - 1] : '',
                type: user.type, // Should now include FUNDADOR
                role: user.role,
                flag_country: user.flag_country || 'CL',
                photo_url: user.photo_url || '',
                credit_limit: user.credit_limit || 0,
                incorporation_date: user.incorporation_date ? user.incorporation_date.split('T')[0] : ''
            });
            setEnableSystemAccess(user.role !== 'USER');
            // Assuming we have a created_at or similar field logic for registrationDate
        } catch (error) {
            console.error(error);
        }
    };

    // RUT Validator (Modulo 11)
    const validateRut = (rut) => {
        // Basic format check
        if (!/^[0-9]+-[0-9kK]{1}$/.test(rut)) return false;
        const split = rut.split('-');
        let num = split[0];
        let dv = split[1].toLowerCase();

        let m = 0, s = 1;
        for (; num; num = Math.floor(num / 10))
            s = (s + num % 10 * (9 - m++ % 6)) % 11;
        const expectedDv = s ? String(s - 1) : 'k';
        return dv === expectedDv;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageUpload = (url) => {
        setFormData({ ...formData, photo_url: url });
    };

    const getFullName = () => {
        return `${formData.name1} ${formData.name2} ${formData.surname1} ${formData.surname2}`.trim();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate RUT only on creation or if changed (logic simplified)
        if (!id && !validateRut(formData.rut)) {
            alert('RUT Inválido. Use formato 12345678-9');
            return;
        }

        const payload = {
            rut: formData.rut,
            full_name: getFullName(),
            type: formData.type,
            role: enableSystemAccess ? formData.role : 'USER',
            flag_country: formData.flag_country,
            photo_url: formData.photo_url,
            credit_limit: parseFloat(formData.credit_limit),
            password: formData.password,
            incorporation_date: formData.incorporation_date
        };

        try {
            const url = id ? `${API_URL}/users/${id}` : `${API_URL}/users`;
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                alert(id ? 'Usuario actualizado usuario con éxito' : 'Usuario creado con éxito');
                navigate('/members');
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Error de red');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', overflowY: 'auto', height: '100%', paddingBottom: '50px', boxSizing: 'border-box' }}>
            <h2>{id ? 'Editar Usuario' : 'Nuevo Registro'}</h2>

            <div style={{ marginBottom: '20px' }}>
                <ImageUpload
                    currentImage={formData.photo_url}
                    onUpload={handleImageUpload}
                />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                {/* Identificación */}
                <div style={groupStyle}>
                    <label>RUT / Pasaporte (Sin Puntos, con Guión)</label>
                    <input name="rut" value={formData.rut} onChange={handleChange} required placeholder="12345678-9" style={inputStyle} disabled={!!id} />
                </div>

                <div style={groupStyle}>
                    <label>Nacionalidad (Bandera ISO)</label>
                    <select name="flag_country" value={formData.flag_country} onChange={handleChange} style={inputStyle}>
                        <option value="CL">🇨🇱 Chile</option>
                        <option value="VE">🇻🇪 Venezuela</option>
                        <option value="CO">🇨🇴 Colombia</option>
                        <option value="PE">🇵🇪 Perú</option>
                        <option value="HT">🇭🇹 Haití</option>
                        <option value="AR">🇦🇷 Argentina</option>
                        <option value="JP">🇯🇵 Japón</option>
                        <option value="KR">🇰🇷 Corea</option>
                        <option value="CN">🇨🇳 China</option>
                    </select>
                </div>

                {/* Nombre Desglosado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                        <label>Primer Nombre</label>
                        <input name="name1" value={formData.name1} onChange={handleChange} required style={inputStyle} />
                    </div>
                    <div>
                        <label>Segundo Nombre</label>
                        <input name="name2" value={formData.name2} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label>Apellido Paterno</label>
                        <input name="surname1" value={formData.surname1} onChange={handleChange} required style={inputStyle} />
                    </div>
                    <div>
                        <label>Apellido Materno</label>
                        <input name="surname2" value={formData.surname2} onChange={handleChange} style={inputStyle} />
                    </div>
                </div>

                {/* Clasificación */}
                <div style={groupStyle}>
                    <label>Tipo de Cliente</label>
                    <select name="type" value={formData.type} onChange={handleChange} style={inputStyle}>
                        <option value="CLIENTE">Cliente (Uso de Infraestructura)</option>
                        <option value="SOCIO">Socio (Precios Especiales)</option>
                        <option value="FUNDADOR">Socio Fundador (Voto + Precios Especiales)</option>
                    </select>
                    {formData.type === 'SOCIO' && (
                        <small style={{ color: '#FFCE00', marginTop: '5px' }}>
                            ℹ Puede optar a Socio Fundador tras 1 año de antigüedad.
                        </small>
                    )}
                </div>

                {/* Crédito */}
                <div style={groupStyle}>
                    <label>Cupo de Crédito ($)</label>
                    <input
                        type="number"
                        name="credit_limit"
                        value={formData.credit_limit}
                        onChange={handleChange}
                        style={inputStyle}
                        min="0"
                    />
                    <small style={{ color: '#aaa' }}>Límite máximo de deuda permitida.</small>
                </div>

                {/* Incorporation Date */}
                <div style={groupStyle}>
                    <label>Fecha de Incorporación</label>
                    <input
                        type="date"
                        name="incorporation_date"
                        value={formData.incorporation_date || ''}
                        onChange={handleChange}
                        style={inputStyle}
                    />
                </div>

                <div style={groupStyle}>
                    {/* ONLY SHOW SYSTEM ACCESS OPTION IF CURRENT USER IS ADMIN */}
                    {currentUser?.role === 'ADMIN' && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', padding: '10px', backgroundColor: '#444', borderRadius: '4px' }}>
                                <input
                                    type="checkbox"
                                    id="enableAccess"
                                    checked={enableSystemAccess}
                                    onChange={(e) => setEnableSystemAccess(e.target.checked)}
                                    style={{ width: '20px', height: '20px' }}
                                />
                                <label htmlFor="enableAccess" style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                                    ⚠ Habilitar Acceso al Sistema (Cajeros/Admins)
                                </label>
                            </div>

                            {enableSystemAccess && (
                                <div style={{ ...groupStyle, paddingLeft: '20px', borderLeft: '2px solid var(--color-primary)' }}>
                                    <label style={{ color: 'var(--color-primary)' }}>Rol de Privilegios</label>
                                    <select name="role" value={formData.role} onChange={handleChange} style={inputStyle}>
                                        <option value="USER">Usuario Estándar (Sin Privilegios)</option>
                                        <option value="CAJERO">Cajero (Ventas y Mesas)</option>
                                        <option value="ADMIN">Administrador Total</option>
                                    </select>

                                    <label style={{ color: 'var(--color-primary)', marginTop: '10px' }}>Contraseña de Acceso</label>
                                    <input
                                        type="password"
                                        name="password"
                                        onChange={handleChange}
                                        placeholder={id ? "Dejar en blanco para mantener actual" : "Crear contraseña"}
                                        style={{ ...inputStyle, borderColor: 'var(--color-primary)' }}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <button type="submit" style={btnStyle}>{id ? 'Guardar Cambios' : 'Registrar Usuario'}</button>
            </form >
        </div >
    );
};

const groupStyle = { display: 'flex', flexDirection: 'column' };
const inputStyle = {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #555',
    backgroundColor: '#333', // Dark background
    color: '#fff', // White text
    fontSize: '1rem'
};
const btnStyle = { padding: '10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' };

export default MemberForm;
