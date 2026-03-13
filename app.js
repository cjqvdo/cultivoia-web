/**
 * app.js - Orquestador de Onboarding Cultivo IA
 */

const state = {
    environment: null,
    currentStep: 0,
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: {
        id_lote: null 
    } 
};

/**
 * Inicia el flujo y registra el ambiente en la tabla 'lotes'
 */
async function startOnboarding(type) {
    state.environment = type;
    
    // Ajustamos dinámicamente el último paso según el entorno
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';

    console.log("Iniciando registro para:", type);

    try {
        // Validación de existencia del cliente antes de operar
        if (typeof supabaseClient === 'undefined') {
            throw new Error("supabaseClient no detectado. Verifica config.js");
        }

        // INSERT inicial: Creamos el registro solo con el campo 'espacio'
        const { data, error } = await supabaseClient
            .from('lotes')
            .insert([{ espacio: type }])
            .select();

        if (error) throw error;

        // Capturamos el ID generado por la base de datos
        if (data && data.length > 0) {
            // Usamos el nombre exacto de la columna en tu DB: 'id del lote'
            state.formData.id_lote = data[0]['id del lote'];
            console.log("Conexión Exitosa. ID asignado:", state.formData.id_lote);

            // Transición visual: Desvanecer branding y cargar siguiente paso
            const header = document.getElementById('header-branding');
            if (header) {
                header.style.opacity = '0';
                setTimeout(() => {
                    header.style.display = 'none';
                    loadNextStep();
                }, 300);
            }
        }

    } catch (error) {
        console.error("Error en el registro inicial:", error);
        // El alert nos dirá si el problema es la KEY o la Policy (RLS)
        alert("Error de Conexión: " + error.message);
    }
}

/**
 * Carga los archivos HTML de forma secuencial en el viewport
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];

    if (!nextFile) return;

    // Animación de salida
    viewport.style.opacity = '0';
    viewport.style.transform = 'translateY(10px)';

    try {
        const response = await fetch(nextFile);
        if (!response.ok) throw new Error('No se pudo encontrar el archivo: ' + nextFile);
        
        const html = await response.text();
        
        setTimeout(() => {
            viewport.innerHTML = html;
            
            // Re-inicializamos iconos para el nuevo contenido
            if (window.lucide) lucide.createIcons();
            
            // Animación de entrada
            viewport.style.opacity = '1';
            viewport.style.transform = 'translateY(0)';
            
            state.currentStep++;
        }, 300);

    } catch (error) {
        console.error("Error cargando paso:", error);
        viewport.innerHTML = `<div class="card"><p>Error al cargar el módulo: ${nextFile}</p></div>`;
        viewport.style.opacity = '1';
    }
}

/**
 * Función que llamarán los formularios de batch.html, infrastructure.html, etc.
 * para guardar sus datos en el 'state' local antes del envío final.
 */
function handleStepSave(data) {
    state.formData = { ...state.formData, ...data };
    console.log(`Datos acumulados (Paso ${state.currentStep}):`, state.formData);

    if (state.currentStep < state.steps.length) {
        loadNextStep();
    } else {
        finalizeSetup();
    }
}

/**
 * Pantalla final de éxito
 */
function finalizeSetup() {
    const viewport = document.getElementById('app-viewport');
    
    viewport.innerHTML = `
        <div class="card fade-in">
            <i data-lucide="check-circle" size="48" style="color: #10B981; margin-bottom: 20px;"></i>
            <h2 style="font-weight: 300; margin-bottom: 10px;">¡Configuración Lista!</h2>
            <p style="font-size: 14px; color: #6B7280; opacity: 0.8;">
                Estamos calibrando el sistema para tu cultivo ${state.environment}.
            </p>
        </div>
    `;
    
    if (window.lucide) lucide.createIcons();
}