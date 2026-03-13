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
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';

    console.log("Iniciando registro para:", type);

    try {
        if (typeof supabaseClient === 'undefined') {
            throw new Error("supabaseClient no detectado. Verifica config.js");
        }

        // INSERT inicial
        const { data, error } = await supabaseClient
            .from('lotes')
            .insert([{ espacio: type }])
            .select();

        if (error) {
            // Si el error es 42501 o similar, es un tema de RLS
            console.error("Error de Supabase:", error);
            throw new Error("Permiso denegado (RLS). Verifica las políticas de la tabla 'lotes'.");
        }

        if (data && data.length > 0) {
            // Usamos el nombre exacto de la columna en tu DB: 'id del lote'
            state.formData.id_lote = data[0]['id del lote'];
            console.log("Conexión Exitosa. ID asignado:", state.formData.id_lote);

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
        console.error("Error detallado:", error);
        alert(error.message);
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
        if (!response.ok) throw new Error('No se pudo encontrar el archivo: ' + nextFile);
        
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
        viewport.innerHTML = `<div class="card"><p>Error al cargar el módulo: ${nextFile}</p></div>`;
        viewport.style.opacity = '1';
    }
}

/**
 * Actualiza el registro en Supabase con los nuevos datos del formulario
 */
async function handleStepSave(data) {
    state.formData = { ...state.formData, ...data };
    console.log("Actualizando lote ID:", state.formData.id_lote);

    try {
        const { error } = await supabaseClient
            .from('lotes')
            .update(data)
            .eq('id del lote', state.formData.id_lote);

        if (error) throw error;

        console.log("Datos guardados en Supabase correctamente.");

        if (state.currentStep < state.steps.length) {
            loadNextStep();
        } else {
            finalizeSetup();
        }

    } catch (error) {
        console.error("Error al actualizar datos:", error.message);
        alert("No se pudieron guardar los detalles del lote.");
    }
}

function finalizeSetup() {
    const viewport = document.getElementById('app-viewport');
    viewport.innerHTML = `
        <div class="card fade-in">
            <i data-lucide="check-circle" size="48" style="color: #10B981; margin-bottom: 20px;"></i>
            <h2 style="font-weight: 300; margin-bottom: 10px;">¡Configuración Lista!</h2>
            <p style="font-size: 14px; color: #6B7280; opacity: 0.8;">
                Calibrando sistema para cultivo ${state.environment}.
            </p>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}