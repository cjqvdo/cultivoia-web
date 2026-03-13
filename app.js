/**
 * app.js - Orquestador de Cultivo IA
 */

const state = {
    environment: null,
    currentStep: 0,
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: {
        lote_id: null // Sincronizado con el nombre de tu columna en Supabase
    } 
};

/**
 * Inicia el flujo. Evita duplicados verificando si ya existe un ID en el estado.
 */
async function startOnboarding(type) {
    // 1. Evitar registros múltiples si el usuario hace click varias veces
    if (state.formData.lote_id) {
        console.warn("Ya existe un lote iniciado en esta sesión.");
        return;
    }

    state.environment = type;
    // Ajuste dinámico del último paso según el entorno
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';

    console.log("Iniciando registro para:", type);

    try {
        if (typeof supabaseClient === 'undefined') {
            throw new Error("supabaseClient no detectado. Verifica config.js");
        }

        // INSERT inicial: Solo enviamos el 'espacio'
        const { data, error } = await supabaseClient
            .from('lotes')
            .insert([{ espacio: type }])
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            // Capturamos el lote_id (nombre exacto de tu columna)
            state.formData.lote_id = data[0].lote_id;
            console.log("Conexión Exitosa. ID asignado:", state.formData.lote_id);

            // Transición visual
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
        alert("Error de Conexión: " + error.message);
    }
}

/**
 * Carga los archivos HTML en el viewport
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];

    if (!nextFile) return;

    viewport.style.opacity = '0';
    viewport.style.transform = 'translateY(10px)';

    try {
        const response = await fetch(nextFile);
        if (!response.ok) throw new Error('No se pudo encontrar: ' + nextFile);
        
        const html = await response.text();
        
        setTimeout(() => {
            viewport.innerHTML = html;
            if (window.lucide) lucide.createIcons();
            
            viewport.style.opacity = '1';
            viewport.style.transform = 'translateY(0)';
            state.currentStep++;
        }, 300);

    } catch (error) {
        console.error("Error cargando paso:", error);
        viewport.innerHTML = `<div class="card"><p>Error al cargar: ${nextFile}</p></div>`;
        viewport.style.opacity = '1';
    }
}

/**
 * Recibe el formData de batch.html y actualiza la fila en Supabase
 */
async function handleStepSave(data) {
    // Combinamos datos locales
    state.formData = { ...state.formData, ...data };
    console.log("Actualizando lote ID:", state.formData.lote_id);

    try {
        // UPDATE en Supabase usando el lote_id guardado
        const { error } = await supabaseClient
            .from('lotes')
            .update(data)
            .eq('lote_id', state.formData.lote_id);

        if (error) throw error;

        console.log("Datos actualizados correctamente.");

        if (state.currentStep < state.steps.length) {
            loadNextStep();
        } else {
            finalizeSetup();
        }

    } catch (error) {
        console.error("Error al actualizar datos:", error.message);
        alert("Error al guardar: " + error.message);
    }
}

function finalizeSetup() {
    const viewport = document.getElementById('app-viewport');
    viewport.innerHTML = `
        <div class="card fade-in" style="text-align:center; padding: 40px;">
            <i data-lucide="check-circle" size="48" style="color: #10B981; margin-bottom: 20px;"></i>
            <h2 style="font-weight: 200;">¡Registro Completo!</h2>
            <p style="color: #6B7280; margin-top: 10px;">El lote ha sido configurado con éxito.</p>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}