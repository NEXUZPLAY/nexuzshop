import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    getDoc, 
    updateDoc, 
    setDoc,
    addDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1. Configuración de Firebase del Banco Pedro Carbo (Para validar y descontar saldo)
const bancoConfig = {
    apiKey: "AIzaSyAAQ4f1wD8W3WOoZANRO5KvOJW2gfP_wwE",
    authDomain: "bancomovil-421ff.firebaseapp.com",
    projectId: "bancomovil-421ff",
    storageBucket: "bancomovil-421ff.firebasestorage.app",
    messagingSenderId: "280973267975",
    appId: "1:280973267975:web:5b95146da0f64ef0e346a2",
    measurementId: "G-WMWQE7BCQ9"
};

const appBanco = initializeApp(bancoConfig, "bancoApp");
const dbBanco = getFirestore(appBanco);

// 2. Tu propia configuración de Firebase (Para registrar pedidos y puntos de tu tienda)
const miFirebaseConfig = {
    apiKey: "AIzaSyCOzTgyw5GqN9OeGvot45rqXAcjs5w848M",
    authDomain: "pc-recarga-77d05.firebaseapp.com",
    projectId: "pc-recarga-77d05",
    storageBucket: "pc-recarga-77d05.firebasestorage.app",
    messagingSenderId: "381158278092",
    appId: "1:381158278092:web:a4abad0bae8ad046e11369",
    measurementId: "G-3G3GLFY81L"
};

const appMiTienda = initializeApp(miFirebaseConfig, "tiendaApp");
const dbTienda = getFirestore(appMiTienda);

document.addEventListener('DOMContentLoaded', () => {
    // Filtrado de productos en la tienda
    const filterButtons = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.card');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            cards.forEach(card => {
                if (filter === 'all' || card.getAttribute('data-category') === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // Manejo del formulario de recarga / compra
    const formRecarga = document.getElementById('formRecarga');
    if (formRecarga) {
        formRecarga.addEventListener('submit', async (e) => {
            e.preventDefault();

            const metodoPago = document.getElementById('metodoPagoSelect').value;

            // BLOQUEAR MÉTODOS DE PAGO DESACTIVADOS
            if (metodoPago === 'Transferencia Bancaria' || metodoPago === 'Persona Física') {
                alert("Este método de pago se encuentra temporalmente deshabilitado.");
                return;
            }

            const producto = document.getElementById('modalTitulo').textContent.replace('Recargar ', '').replace('Comprar ', '');
            const select = document.getElementById('opcionSelect');
            const paqueteNombre = select.options[select.selectedIndex].text;
            
            // Obtener el correo electrónico ingresado obligatoriamente en el formulario
            const emailInputElem = document.getElementById('emailInput');
            const correoCliente = emailInputElem ? emailInputElem.value.trim() : "cliente@pc-recarga.com";

            let detalleDestino = "";
            if (producto === 'Mobile Legends') {
                const userId = document.getElementById('userIdInput').value;
                const zoneId = document.getElementById('zoneIdInput').value;
                detalleDestino = `ID: ${userId} (Zona: ${zoneId})`;
            } else if (['Roblox', 'Netflix', 'Spotify', 'Disney+'].includes(producto)) {
                const phone = document.getElementById('phoneInput').value;
                detalleDestino = `Correo: ${correoCliente} | Teléfono: ${phone}`;
            } else {
                const userInputElem = document.getElementById('userInput');
                detalleDestino = `ID de Cuenta: ${userInputElem ? userInputElem.value : 'N/A'}`;
            }

            const precio = parseFloat(select.value) || 0;
            const comision = calcularComision(precio);
            const montoTotal = precio + comision;

            if (metodoPago === 'Tarjeta de débito de Banco Pedro Carbo') {
                const numTarjetaInput = document.getElementById('fb_tarjeta').value.trim();
                const cvvInput = document.getElementById('fb_cvv').value.trim();
                const expInput = document.getElementById('fb_exp').value.trim();
                const boton = document.getElementById('btnSubmitForm');

                if (!numTarjetaInput || !cvvInput || !expInput) {
                    alert("Por favor complete todos los datos de la tarjeta de débito.");
                    return;
                }

                boton.disabled = true;
                boton.textContent = "Procesando pago en Banco Pedro Carbo...";

                try {
                    // 1. Buscar la tarjeta en la colección 'tarjetas_virtuales' del Banco
                    const tarjetasRef = collection(dbBanco, "tarjetas_virtuales");
                    const q = query(tarjetasRef, where("numero", "==", numTarjetaInput));
                    const querySnapshot = await getDocs(q);

                    if (querySnapshot.empty) {
                        alert("La tarjeta de débito ingresada no existe en el Banco Pedro Carbo.");
                        boton.disabled = false;
                        boton.textContent = "Proceder al Pago";
                        return;
                    }

                    let tarjetaData = null;
                    let docIdEncontrado = null;
                    querySnapshot.forEach((docSnap) => {
                        tarjetaData = docSnap.data();
                        docIdEncontrado = docSnap.id; 
                    });

                    // 2. Validar CVV y Expiración
                    if (tarjetaData.cvv !== cvvInput || tarjetaData.expiracion !== expInput) {
                        alert("Credenciales incorrectas (CVV o Fecha de Expiración erróneos).");
                        boton.disabled = false;
                        boton.textContent = "Proceder al Pago";
                        return;
                    }

                    const userIdBanco = tarjetaData.userId || docIdEncontrado;

                    if (!userIdBanco) {
                        alert("Error: No se pudo asociar la tarjeta a ningún usuario.");
                        boton.disabled = false;
                        boton.textContent = "Proceder al Pago";
                        return;
                    }

                    // 3. Obtener el saldo del usuario en el Banco
                    const userRef = doc(dbBanco, "usuarios", userIdBanco);
                    const userSnap = await getDoc(userRef);

                    if (!userSnap.exists()) {
                        alert("Error: El usuario propietario de la tarjeta no fue encontrado en el banco.");
                        boton.disabled = false;
                        boton.textContent = "Proceder al Pago";
                        return;
                    }

                    let saldoActual = userSnap.data().saldo ?? 0.00;

                    // 4. Verificar fondos suficientes
                    if (saldoActual < montoTotal) {
                        alert(`Fondos insuficientes. Su saldo actual es $${saldoActual.toFixed(2)} y el total a pagar es $${montoTotal.toFixed(2)}.`);
                        boton.disabled = false;
                        boton.textContent = "Proceder al Pago";
                        return;
                    }

                    let nuevoSaldo = saldoActual - montoTotal;

                    // 5. Descontar saldo y registrar transacción en el Banco
                    await updateDoc(userRef, { saldo: nuevoSaldo });

                    await addDoc(collection(dbBanco, "transacciones"), {
                        userId: userIdBanco,
                        userEmail: correoCliente,
                        userName: userSnap.data().nombre || "Cliente Externo",
                        title: `Nexus Gaming: ${producto} (${paqueteNombre})`,
                        category: "Pagos con Tarjeta",
                        amount: -montoTotal,
                        date: new Date().toLocaleString(),
                        timestamp: serverTimestamp(),
                        estado: "Completado"
                    });

                    // 6. CÁLCULO INTELIGENTE DE PUNTOS
                    let puntosGanados = 0;
                    const matches = paqueteNombre.match(/[\d,]+/g);
                    
                    if (matches && (paqueteNombre.toLowerCase().includes('diamante') || paqueteNombre.toLowerCase().includes('uc') || paqueteNombre.toLowerCase().includes('token'))) {
                        puntosGanados = parseInt(matches[0].replace(/,/g, ''), 10) || 0;
                    } else {
                        puntosGanados = Math.round(precio * 10);
                    }

                    // 7. Registrar el pedido en TU propio Firebase y sumar puntos basados en el correo electrónico
                    try {
                        await addDoc(collection(dbTienda, "transacciones"), {
                            userName: userSnap.data().nombre || "Cliente Web",
                            userEmail: correoCliente,
                            title: `${producto} - ${paqueteNombre}`,
                            category: producto,
                            amount: montoTotal,
                            puntosGenerados: puntosGanados,
                            detalleDestino: detalleDestino,
                            metodoPago: metodoPago,
                            date: new Date().toLocaleString(),
                            timestamp: serverTimestamp(),
                            estado: "Completado"
                        });

                        const userPuntosRef = doc(dbTienda, "usuarios_tienda", correoCliente);
                        const userPuntosSnap = await getDoc(userPuntosRef);

                        if (userPuntosSnap.exists()) {
                            const puntosActuales = userPuntosSnap.data().puntos || 0;
                            await updateDoc(userPuntosRef, { puntos: puntosActuales + puntosGanados });
                        } else {
                            await setDoc(userPuntosRef, { email: correoCliente, puntos: puntosGanados });
                        }

                        // 8. SI ES FREE FIRE, GUARDAR O ACTUALIZAR AUTOMÁTICAMENTE EL JUGADOR VERIFICADO
                        if (producto === 'Free Fire') {
                            const userInputFF = document.getElementById('userInput');
                            const hiddenNombreFF = document.getElementById('nombreJugadorInput');
                            if (userInputFF) {
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
                        }

                    } catch (errTienda) {
                        console.error("Error al guardar en tu tienda o sumar puntos:", errTienda);
                    }

                    alert(`¡Pago Exitoso!\n\nServicio: ${producto} - ${paqueteNombre}\nDestino: ${detalleDestino}\nMonto descontado: $${montoTotal.toFixed(2)}\n✨ ¡Has ganado ${puntosGanados} puntos para la ruleta!\nNuevo saldo en banco: $${nuevoSaldo.toFixed(2)}`);
                    window.cerrarModal();
                    formRecarga.reset();
                    location.reload();

                } catch (error) {
                    console.error("Error al procesar el pago:", error);
                    alert("Ocurrió un error al conectar con la base de datos.");
                    boton.disabled = false;
                    boton.textContent = "Proceder al Pago";
                }
            } else {
                alert("Método de pago no disponible.");
                window.cerrarModal();
                formRecarga.reset();
            }
        });
    }
});

// ==========================================
// FUNCIONES GLOBALES EXPUESTAS AL OBJETO WINDOW
// ==========================================

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
    
    // FORMULARIO DINÁMICO CON BOTÓN DE VERIFICACIÓN EXCLUSIVO PARA FREE FIRE
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

} else if (['Roblox', 'Netflix', 'Spotify', 'Disney+', 'Discord'].includes(nombreProducto)) {
    camposIdContainer.innerHTML = `
        <label for="emailInput">Correo Electrónico (Para acumular tus puntos y envío):</label>
        <input type="email" id="emailInput" placeholder="tucorreo@email.com" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; margin-bottom: 12px; background: #f8fafc; color: #000;">

        <label for="phoneInput">Número de Teléfono o Usuario de Discord:</label>
        <input type="text" id="phoneInput" placeholder="Ej: usuario#0000 o +593..." required style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; background: #f8fafc; color: #000;">
    `;
}
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

// FUNCIÓN DE VERIFICACIÓN DE ID PARA FREE FIRE
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

window.manejarMetodoPago = function() {
    const metodoPagoSelect = document.getElementById('metodoPagoSelect');
    const camposTarjetaContainer = document.getElementById('camposTarjetaContainer');

    if (metodoPagoSelect.value === 'Transferencia Bancaria' || metodoPagoSelect.value === 'Persona Física') {
        alert("Este método de pago se encuentra temporalmente deshabilitado.");
        metodoPagoSelect.value = "";
        camposTarjetaContainer.innerHTML = '';
        return;
    }

    if (metodoPagoSelect.value === 'Tarjeta de débito de Banco Pedro Carbo') {
        camposTarjetaContainer.innerHTML = `
            <div style="background: #ffffff; padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #374151; color: #1e3a8a;">
                <h3 style="margin-top: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; color: #1e3a8a;">
                    💳 Pago con Tarjeta Banco Pedro Carbo
                </h3>
                <p style="color: #64748b; font-size: 0.8rem; margin-bottom: 1rem;">Ingrese los datos de su tarjeta virtual para procesar el pago de forma segura.</p>
                
                <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 5px; color: #334155;">Número de Tarjeta</label>
                <input type="text" id="fb_tarjeta" placeholder="Ej. 4532XXXXXXXX1234" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; margin-bottom: 12px; background: #f8fafc; color: #000;" required>
                
                <div style="display: flex; gap: 10px; margin-bottom: 5px;">
                    <div style="flex: 1;">
                        <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 5px; color: #334155;">CVV</label>
                        <input type="password" id="fb_cvv" placeholder="123" maxlength="4" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; background: #f8fafc; color: #000;" required>
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 5px; color: #334155;">Expiración</label>
                        <input type="text" id="fb_exp" placeholder="MM/AA" maxlength="5" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; background: #f8fafc; color: #000;" required>
                    </div>
                </div>
            </div>
        `;
    } else {
        camposTarjetaContainer.innerHTML = '';
    }
}

function calcularComision(precio) {
    let comision = precio * 0.08; 
    if (comision > 4.00) {
        comision = 4.00;
    }
    if (precio > 0 && comision < 0.20) {
        comision = 0.20;
    }
    return comision;
}

window.actualizarResumen = function() {
    const select = document.getElementById('opcionSelect');
    const precio = parseFloat(select.value) || 0;
    const comision = calcularComision(precio);
    const total = precio + comision;

    const lblPrecio = document.getElementById('lblPrecio');
    const lblComision = document.getElementById('lblComision');
    const lblTotal = document.getElementById('lblTotal');

    if (lblPrecio) lblPrecio.textContent = `$${precio.toFixed(2)}`;
    if (lblComision) lblComision.textContent = `$${comision.toFixed(2)}`;
    if (lblTotal) lblTotal.textContent = `$${total.toFixed(2)}`;
}

window.cerrarModal = function() {
    const modal = document.getElementById('modalCompra');
    if (modal) modal.style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('modalCompra');
    if (event.target === modal) {
        window.cerrarModal();
    }
}
// Control de pasos del modal estilo HydraUp
window.irPaso = function(paso) {
    // Ocultar todos los pasos
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'none';
    document.getElementById('step4').style.display = 'none';

    // Resetear indicadores
    for (let i = 1; i <= 4; i++) {
        const ind = document.getElementById(`stepInd${i}`);
        if (ind) {
            ind.style.color = '#9ca3af';
            ind.style.fontWeight = 'normal';
        }
    }

    // Mostrar el paso actual y resaltar indicador
    document.getElementById(`step${paso}`).style.display = 'block';
    const activeInd = document.getElementById(`stepInd${paso}`);
    if (activeInd) {
        activeInd.style.color = '#10b981';
        activeInd.style.fontWeight = 'bold';
    }
}

window.validarYPasarPaso3 = function() {
    const emailInput = document.getElementById('emailInput');
    if (emailInput && !emailInput.value.trim()) {
        alert("Por favor ingresa tu correo electrónico.");
        emailInput.focus();
        return;
    }

    // Validar ID de juego según el servicio
    const userInput = document.getElementById('userInput');
    const userIdInput = document.getElementById('userIdInput');
    const phoneInput = document.getElementById('phoneInput');

    if (userInput && !userInput.value.trim()) {
        alert("Por favor ingresa tu ID de jugador.");
        userInput.focus();
        return;
    }
    if (userIdInput && !userIdInput.value.trim()) {
        alert("Por favor ingresa tu ID de usuario.");
        userIdInput.focus();
        return;
    }
    if (phoneInput && !phoneInput.value.trim()) {
        alert("Por favor ingresa tu número de teléfono.");
        phoneInput.focus();
        return;
    }

    // Si todo está correcto, avanza al paso 3 (Método de pago)
    window.irPaso(3);
}
