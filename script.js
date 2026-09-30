import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfigTienda = {
    apiKey: "AIzaSyCOzTgyw5GqN9OeGvot45rqXAcjs5w848M",
    authDomain: "pc-recarga-77d05.firebaseapp.com",
    projectId: "pc-recarga-77d05",
    storageBucket: "pc-recarga-77d05.firebasestorage.app",
    messagingSenderId: "381158278092",
    appId: "1:381158278092:web:a4abad0bae8ad046e11369",
    measurementId: "G-3G3GLFY81L"
};

const appTienda = initializeApp(firebaseConfigTienda, "appTienda");
const dbTienda = getFirestore(appTienda);

// Estructura de productos y precios
const productosTienda = {
    'Free Fire': [
        { nombre: '110 Diamantes', precio: 1.00, puntos: 10 },
        { nombre: '341 Diamantes', precio: 3.00, puntos: 35 },
        { nombre: '572 Diamantes', precio: 5.00, puntos: 60 },
        { nombre: '1160 Diamantes', precio: 10.00, puntos: 130 },
        { nombre: 'Pase de Élite / Booyah', precio: 2.50, puntos: 25 }
    ],
    'Mobile Legends': [
        { nombre: '86 Diamantes', precio: 1.80, puntos: 15 },
        { nombre: '172 Diamantes', precio: 3.50, puntos: 35 },
        { nombre: '257 Diamantes', precio: 5.20, puntos: 55 },
        { nombre: '706 Diamantes', precio: 14.00, puntos: 150 }
    ],
    'Roblox': [
        { nombre: '400 Robux', precio: 5.00, puntos: 50 },
        { nombre: '800 Robux', precio: 10.00, puntos: 110 },
        { nombre: '1700 Robux', precio: 20.00, puntos: 230 }
    ],
    'Netflix': [
        { nombre: 'Cuenta Completa 1 Mes', precio: 8.50, puntos: 90 },
        { nombre: 'Pantalla Extra 1 Mes', precio: 3.00, puntos: 30 }
    ],
    'Spotify': [
        { nombre: 'Individual 1 Mes', precio: 4.00, puntos: 40 },
        { nombre: 'Familiar 2 Meses', precio: 7.50, puntos: 80 }
    ],
    'Disney+': [
        { nombre: 'Estándar 1 Mes', precio: 5.99, puntos: 60 },
        { nombre: 'Premium 1 Mes', precio: 8.99, puntos: 95 }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    // Vincular botones de recarga principales
    document.querySelectorAll('.card').forEach(card => {
        const tituloElement = card.querySelector('h3');
        const botonRecargar = card.querySelector('button');
        
        if (tituloElement && botonRecargar) {
            const nombreProd = tituloElement.textContent.trim();
            if (productosTienda[nombreProd]) {
                botonRecargar.addEventListener('click', () => {
                    window.abrirModal(nombreProd, productosTienda[nombreProd]);
                });
            }
        }
    });

    // Cerrar modal con la 'X'
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('modalCompra').style.display = 'none';
        });
    }

    // Cambiar dinámicamente el resumen al modificar la opción
    const opcionSelect = document.getElementById('opcionSelect');
    if (opcionSelect) {
        opcionSelect.addEventListener('change', window.actualizarResumen);
    }

    // Cambiar campos de pago según el método seleccionado
    const metodoPagoSelect = document.getElementById('metodoPagoSelect');
    if (metodoPagoSelect) {
        metodoPagoSelect.addEventListener('change', (e) => {
            const metodo = e.target.value;
            const contenedorTarjeta = document.getElementById('camposTarjetaContainer');
            
            if (metodo === 'Tarjeta') {
                contenedorTarjeta.innerHTML = `
                    <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin-top: 10px; border: 1px solid #cbd5e1;">
                        <label style="font-size: 0.85rem; font-weight: bold; color: #334155;">Número de Tarjeta:</label>
                        <input type="text" placeholder="1234 5678 9012 3456" maxlength="19" required style="width: 100%; padding: 8px; margin-top: 4px; margin-bottom: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; font-size: 0.85rem;">
                        
                        <div style="display: flex; gap: 10px;">
                            <div style="flex: 1;">
                                <label style="font-size: 0.85rem; font-weight: bold; color: #334155;">Expiración:</label>
                                <input type="text" placeholder="MM/AA" maxlength="5" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; font-size: 0.85rem;">
                            </div>
                            <div style="flex: 1;">
                                <label style="font-size: 0.85rem; font-weight: bold; color: #334155;">CVV:</label>
                                <input type="password" placeholder="123" maxlength="4" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; font-size: 0.85rem;">
                            </div>
                        </div>
                    </div>
                `;
            } else if (metodo === 'Transferencia') {
                contenedorTarjeta.innerHTML = `
                    <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin-top: 10px; border: 1px solid #cbd5e1; font-size: 0.85rem; color: #334155;">
                        <p style="margin: 0 0 5px 0; font-weight: bold;">Datos Bancarios (Banco Pichincha):</p>
                        <p style="margin: 0 0 3px 0;">Cuenta Ahorros: <b>2201938475</b></p>
                        <p style="margin: 0 0 3px 0;">Titular: Nexus Gaming S.A.</p>
                        <p style="margin: 0;">CI / RUC: 1792837465001</p>
                        <p style="margin: 8px 0 0 0; color: #0284c7; font-size: 0.8rem;">Sube o reporta tu comprobante al soporte tras finalizar.</p>
                    </div>
                `;
            } else {
                contenedorTarjeta.innerHTML = '';
            }
        });
    }

    // Manejar envío del formulario de compra
    const formRecarga = document.getElementById('formRecarga');
    if (formRecarga) {
        formRecarga.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('emailInput').value.trim();
            const opcionSelectElement = document.getElementById('opcionSelect');
            const precioSeleccionado = parseFloat(opcionSelectElement.value);
            const textoOpcion = opcionSelectElement.options[opcionSelectElement.selectedIndex].text;
            const tituloModal = document.getElementById('modalTitulo').textContent;
            const metodoPago = document.getElementById('metodoPagoSelect').value;

            if (!metodoPago) {
                alert("Por favor selecciona un método de pago.");
                return;
            }

            const botonSubmit = document.getElementById('btnSubmitForm');
            botonSubmit.disabled = true;
            botonSubmit.textContent = "Procesando pago...";

            // Calcular puntos basados en el catálogo
            let puntosGanados = 10;
            for (const categoria in productosTienda) {
                const matchEncontrado = productosTienda[categoria].find(p => p.precio === precioSeleccionado);
                if (matchEncontrado) {
                    puntosGanados = matchEncontrado.puntos;
                    break;
                }
            }

            try {
                // 1. Guardar Transacción
                await addDoc(collection(dbTienda, "transacciones"), {
                    userEmail: email,
                    title: tituloModal + " - " + textoOpcion,
                    amount: precioSeleccionado + (precioSeleccionado * 0.20), // Incluyendo comisión fija mostrada
                    puntosGenerados: puntosGanados,
                    metodoPago: metodoPago,
                    date: new Date().toLocaleString()
                });

                // 2. Acumular Puntos al usuario
                const userRef = doc(dbTienda, "usuarios_tienda", email);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    await updateDoc(userRef, {
                        puntos: increment(puntosGanados)
                    });
                } else {
                    await setDoc(userRef, {
                        email: email,
                        puntos: puntosGanados
                    });
                }

                // 3. Si es Free Fire, registrar automáticamente el ID y el nombre verificado
                const userInputFF = document.getElementById('userInput');
                const hiddenNombreFF = document.getElementById('nombreJugadorInput');
                if (userInputFF && tituloModal.includes('Free Fire')) {
                    const idVal = userInputFF.value.trim();
                    const nombreVal = hiddenNombreFF ? hiddenNombreFF.value : "Jugador Nuevo FF";
                    if (idVal) {
                        await setDoc(doc(dbTienda, "jugadores_verificados", idVal), {
                            idFreeFire: idVal,
                            nombreJugador: nombreVal,
                            actualizadoEn: new Date().toLocaleString()
                        }, { merge: true });
                    }
                }

                alert(`¡Compra y pago procesados con éxito!\nHas acumulado +${puntosGanados} puntos en tu cuenta.`);
                document.getElementById('modalCompra').style.display = 'none';
                formRecarga.reset();

            } catch (error) {
                console.error("Error al procesar la compra:", error);
                alert("Hubo un error al procesar tu transacción. Inténtalo de nuevo.");
            } finally {
                botonSubmit.disabled = false;
                botonSubmit.textContent = "Proceder al Pago";
            }
        });
    }
});

window.abrirModal = function(nombreProducto, opciones) {
    const modal = document.getElementById('modalCompra');
    const modalTitulo = document.getElementById('modalTitulo');
    const opcionSelect = document.getElementById('opcionSelect');
    const camposIdContainer = document.getElementById('camposIdContainer');
    const metodoPagoSelect = document.getElementById('metodoPagoSelect');
    const camposTarjetaContainer = document.getElementById('camposTarjetaContainer');
    const boton = document.getElementById('btnSubmitForm');

    if (boton) {
        boton.disabled = false;
        boton.textContent = "Proceder al Pago";
    }

    const accion = ['Netflix', 'Spotify', 'Disney+'].includes(nombreProducto) ? 'Comprar' : 'Recargar';
    modalTitulo.textContent = `${accion} ${nombreProducto}`;
    
    opcionSelect.innerHTML = '';
    opciones.forEach(opcion => {
        const opt = document.createElement('option');
        opt.value = opcion.precio;
        opt.textContent = `${opcion.nombre} - $${opcion.precio.toFixed(2)}`;
        opcionSelect.appendChild(opt);
    });

    metodoPagoSelect.value = "";
    camposTarjetaContainer.innerHTML = "";
    camposIdContainer.innerHTML = '';
    
    // DINÁMICO CON BOTÓN DE VERIFICACIÓN PARA FREE FIRE
    if (nombreProducto === 'Free Fire') {
        camposIdContainer.innerHTML = `
            <label for="emailInput">Correo Electrónico (Para acumular tus puntos):</label>
            <input type="email" id="emailInput" placeholder="tucorreo@email.com" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; margin-bottom: 12px; background: #f8fafc; color: #000;">

            <label for="userInput">ID de Free Fire:</label>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="text" id="userInput" placeholder="Ej: 123456789" required style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; background: #f8fafc; color: #000;">
                <button type="button" onclick="verificarIdFreeFire()" style="background: #38bdf8; color: #000; border: none; padding: 0 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">Verificar</button>
            </div>
            
            <!-- Visor de estado o apodo -->
            <div id="resultadoNombreFF" style="margin-bottom: 12px; font-size: 0.9rem; font-weight: bold; min-height: 20px;"></div>
        `;
    } else if (nombreProducto === 'Mobile Legends') {
        camposIdContainer.innerHTML = `
            <label for="emailInput">Correo Electrónico (Para acumular tus puntos):</label>
            <input type="email" id="emailInput" placeholder="tucorreo@email.com" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; margin-bottom: 12px; background: #f8fafc; color: #000;">

            <label for="userIdInput">ID de Usuario:</label>
            <input type="text" id="userIdInput" placeholder="Ej: 12345678" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; margin-bottom: 12px; background: #f8fafc; color: #000;">

            <label for="zoneIdInput">ID de Zona (4 dígitos):</label>
            <input type="text" id="zoneIdInput" placeholder="Ej: 1234" maxlength="4" pattern="\\d{4}" title="Debe ser exactamente de 4 dígitos" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; background: #f8fafc; color: #000;">
        `;
    } else if (['Roblox', 'Netflix', 'Spotify', 'Disney+'].includes(nombreProducto)) {
        camposIdContainer.innerHTML = `
            <label for="emailInput">Correo Electrónico (Para acumular tus puntos y envío):</label>
            <input type="email" id="emailInput" placeholder="tucorreo@email.com" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; margin-bottom: 12px; background: #f8fafc; color: #000;">

            <label for="phoneInput">Número de Teléfono:</label>
            <input type="tel" id="phoneInput" placeholder="Ej: +593999999999" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; background: #f8fafc; color: #000;">
        `;
    } else {
        camposIdContainer.innerHTML = `
            <label for="emailInput">Correo Electrónico (Para acumular tus puntos):</label>
            <input type="email" id="emailInput" placeholder="tucorreo@email.com" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; margin-bottom: 12px; background: #f8fafc; color: #000;">

            <label for="userInput">ID de Cuenta de Juego:</label>
            <input type="text" id="userInput" placeholder="Ingresa tu ID de jugador" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; background: #f8fafc; color: #000;">
        `;
    }

    modal.style.display = 'flex';
    window.actualizarResumen();
}

window.verificarIdFreeFire = async function() {
    const idInput = document.getElementById('userInput').value.trim();
    const contenedorNombre = document.getElementById('resultadoNombreFF');

    if (!idInput) {
        contenedorNombre.textContent = "⚠ Por favor ingresa un ID primero.";
        contenedorNombre.style.color = "#fbbf24";
        return;
    }

    contenedorNombre.textContent = "🔍 Buscando ID...";
    contenedorNombre.style.color = "#94a3b8";

    try {
        const docRef = doc(dbTienda, "jugadores_verificados", idInput);
        const docSnap = await getDoc(docRef);

        let hiddenNombre = document.getElementById('nombreJugadorInput');
        if (!hiddenNombre) {
            hiddenNombre = document.createElement('input');
            hiddenNombre.type = 'hidden';
            hiddenNombre.id = 'nombreJugadorInput';
            document.getElementById('formRecarga').appendChild(hiddenNombre);
        }

        if (docSnap.exists()) {
            const data = docSnap.data();
            contenedorNombre.innerHTML = `✅ Apodo: <span style="color: #38bdf8;">${data.nombreJugador}</span>`;
            contenedorNombre.style.color = "#22c55e";
            hiddenNombre.value = data.nombreJugador;
        } else {
            contenedorNombre.textContent = "ℹ️ Después de la compra se verificará el ID.";
            contenedorNombre.style.color = "#fbbf24";
            hiddenNombre.value = "Jugador Nuevo FF";
        }
    } catch (e) {
        console.error("Error al verificar ID:", e);
        contenedorNombre.textContent = "ℹ️ Después de la compra se verificará el ID.";
        contenedorNombre.style.color = "#fbbf24";
    }
}

window.actualizarResumen = function() {
    const opcionSelect = document.getElementById('opcionSelect');
    if (!opcionSelect || opcionSelect.selectedIndex === -1) return;

    const precioBase = parseFloat(opcionSelect.value);
    const comision = 0.20; // Tarifa fija de servicio
    const total = precioBase + comision;

    // Actualizar textos informativos en el modal si existen
    const spans = document.querySelectorAll('#modalCompra p');
    spans.forEach(p => {
        if (p.textContent.includes('Precio del producto:')) {
            p.innerHTML = `Precio del producto: <b>$${precioBase.toFixed(2)}</b>`;
        }
        if (p.textContent.includes('Comisión por servicio:')) {
            p.innerHTML = `Comisión por servicio: <b>$${comision.toFixed(2)}</b>`;
        }
        if (p.textContent.includes('Total a pagar:')) {
            p.innerHTML = `Total a pagar: <b style="color: #38bdf8;">$${total.toFixed(2)}</b>`;
        }
    });
}