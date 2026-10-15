import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    doc, 
    updateDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup,
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const miFirebaseConfig = {
    apiKey: "AIzaSyCOzTgyw5GqN9OeGvot45rqXAcjs5w848M",
    authDomain: "pc-recarga-77d05.firebaseapp.com",
    projectId: "pc-recarga-77d05",
    storageBucket: "pc-recarga-77d05.firebasestorage.app",
    messagingSenderId: "381158278092",
    appId: "1:381158278092:web:a4abad0bae8ad046e11369",
    measurementId: "G-3G3GLFY81L"
};

const appMiTienda = initializeApp(miFirebaseConfig, "tiendaVerificacionApp");
const dbTienda = getFirestore(appMiTienda);
const authTienda = getAuth(appMiTienda);

let seccionActual = 'enVerificacion';
let unsubscribeActual = null;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(authTienda, (user) => {
        const modalAuth = document.getElementById('modalAuthAdmin');

        if (!user) {
            // Mostrar modal de login si no hay sesión
            if (modalAuth) modalAuth.style.display = 'flex';
            return;
        }

        if (user.email !== "jeremymatiasdelrosario@gmail.com") {
            alert(`Acceso denegado. La cuenta (${user.email}) no es el administrador.`);
            if (modalAuth) modalAuth.style.display = 'flex';
            return;
        }

        // Si es el administrador, ocultamos el modal y cargamos los pedidos
        if (modalAuth) modalAuth.style.display = 'none';
        cargarPedidosAdmin();
    });
});

// Función para iniciar sesión con Google
window.loginConGoogleAdmin = async function() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(authTienda, provider);
    } catch (error) {
        console.error("Error al iniciar sesión con Google:", error);
        alert("No se pudo completar el inicio de sesión con Google.");
    }
}

// Función para iniciar sesión con correo y contraseña desde el modal
window.loginConEmailAdmin = async function(event) {
    event.preventDefault();
    const correo = document.getElementById('loginCorreo').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await signInWithEmailAndPassword(authTienda, correo, password);
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        alert("Correo o contraseña incorrectos.");
    }
}

window.cambiarSeccionAdmin = function(seccion) {
    seccionActual = seccion;

    const btnEnVerif = document.getElementById('btnTabEnVerificacion');
    const btnComprobada = document.getElementById('btnTabComprobada');

    if (btnEnVerif && btnComprobada) {
        if (seccion === 'enVerificacion') {
            btnEnVerif.classList.add('active');
            btnComprobada.classList.remove('active');
        } else {
            btnComprobada.classList.add('active');
            btnEnVerif.classList.remove('active');
        }
    }

    cargarPedidosAdmin();
}

function cargarPedidosAdmin() {
    const contenedor = document.getElementById('listaPedidosVerificacion');
    if (!contenedor) return;

    if (unsubscribeActual) {
        unsubscribeActual();
    }

    try {
        let q;
        if (seccionActual === 'enVerificacion') {
            q = query(
                collection(dbTienda, "transacciones"), 
                where("estado", "in", ["En Verificación", "Pendiente", "Pedido hecho"])
            );
        } else {
            q = query(
                collection(dbTienda, "transacciones"), 
                where("estado", "in", ["Entregado", "Aceptada", "Completado"])
            );
        }

        unsubscribeActual = onSnapshot(q, (snapshot) => {
            contenedor.innerHTML = "";

            if (snapshot.empty) {
                const mensajeVacio = seccionActual === 'enVerificacion' 
                    ? "No hay pagos pendientes de verificación en este momento." 
                    : "No hay pedidos comprobados o completados todavía.";
                
                contenedor.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #1e293b; border-radius: 12px; border: 1px solid #334155;">
                        <i class="fa-solid fa-circle-check" style="font-size: 3rem; color: #22c55e; margin-bottom: 10px;"></i>
                        <h3 style="color: #fff; margin: 0 0 5px 0;">Todo al día</h3>
                        <p style="color: #94a3b8; font-size: 0.9rem; margin: 0;">${mensajeVacio}</p>
                    </div>
                `;
                return;
            }

            snapshot.forEach((docSnap) => {
                const tx = docSnap.data();
                const txId = docSnap.id;

                const nombreCliente = tx.nombreCompleto || `${tx.nombreCliente || ''} ${tx.apellidoCliente || ''}`.trim() || 'Cliente Web';
                const correo = tx.userEmail || 'Sin correo';
                const servicio = tx.title || tx.category || 'Servicio';
                const monto = tx.amount || tx.monto || 0;
                const banco = tx.metodoPago || 'Transferencia Bancaria';
                const destino = tx.detalleDestino || 'N/A';
                const comprobanteUrl = tx.comprobanteUrl || '';
                const estadoActual = tx.estado || 'Pendiente';

                let botonesAccion = '';
                if (seccionActual === 'enVerificacion') {
                    botonesAccion = `
                        <div style="display: flex; gap: 10px; margin-top: 15px;">
                            <button onclick="actualizarEstadoPedido('${txId}', 'Entregado')" style="flex: 1; background: #22c55e; color: #000; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer;"><i class="fa-solid fa-check"></i> Aprobar</button>
                            <button onclick="actualizarEstadoPedido('${txId}', 'Rechazada')" style="flex: 1; background: #ef4444; color: #fff; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer;"><i class="fa-solid fa-xmark"></i> Rechazar</button>
                        </div>
                    `;
                } else {
                    botonesAccion = `
                        <div style="margin-top: 15px; text-align: center; background: #0f172a; padding: 8px; border-radius: 6px; font-size: 0.85rem; color: #22c55e; border: 1px solid #1e3a8a;">
                            ✔ Estado: <b>${estadoActual}</b>
                        </div>
                    `;
                }

                contenedor.innerHTML += `
                    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h3 style="margin-top: 0; color: #fbbf24; font-size: 1.1rem; border-bottom: 1px solid #334155; padding-bottom: 10px;">${servicio}</h3>
                            <div style="font-size: 0.88rem; color: #cbd5e1; margin-bottom: 8px;"><b>Cliente:</b> ${nombreCliente}</div>
                            <div style="font-size: 0.88rem; color: #cbd5e1; margin-bottom: 8px;"><b>Correo:</b> ${correo}</div>
                            <div style="font-size: 0.88rem; color: #cbd5e1; margin-bottom: 8px;"><b>Destino:</b> ${destino}</div>
                            <div style="font-size: 0.88rem; color: #cbd5e1; margin-bottom: 8px;"><b>Método:</b> ${banco}</div>
                            <div style="font-size: 0.88rem; color: #cbd5e1; margin-bottom: 8px;"><b>Monto:</b> <span style="color: #22c55e; font-weight: bold; font-size: 1rem;">$${monto.toFixed(2)} USD</span></div>
                            
                            ${comprobanteUrl ? `
                                <div style="margin-top: 10px;">
                                    <b style="font-size: 0.85rem; color: #38bdf8; display: block; margin-bottom: 4px;">Comprobante adjunto:</b>
                                    <a href="${comprobanteUrl}" target="_blank">
                                        <img src="${comprobanteUrl}" alt="Comprobante" style="width: 100%; height: 180px; object-fit: cover; border-radius: 6px; border: 1px solid #475569;" title="Haz clic para ver en grande">
                                    </a>
                                </div>
                            ` : `
                                <div style="margin: 10px 0; color: #ef4444; font-size: 0.85rem;">
                                    <i class="fa-solid fa-triangle-exclamation"></i> Sin comprobante adjunto todavía.
                                </div>
                            `}
                        </div>

                        ${botonesAccion}
                    </div>
                `;
            });
        }, (error) => {
            console.error("Error en snapshot:", error);
        });
    } catch (error) {
        console.error("Error al configurar consulta:", error);
    }
}

window.actualizarEstadoPedido = async function(txId, nuevoEstado) {
    const mensajeAccion = nuevoEstado === 'Entregado' ? 'aprobar y completar' : 'rechazar';
    if (!confirm(`¿Estás seguro de ${mensajeAccion} este pedido?`)) return;

    try {
        const pedidoRef = doc(dbTienda, "transacciones", txId);
        await updateDoc(pedidoRef, {
            estado: nuevoEstado
        });

        alert(`Pedido actualizado exitosamente a: ${nuevoEstado}`);
    } catch (error) {
        console.error("Error al actualizar estado:", error);
        alert("Ocurrió un error al actualizar el estado del pedido.");
    }
}
