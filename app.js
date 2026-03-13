/**
 * app.js - Orquestador de Onboarding Cultivo IA
 */

const state = {
    environment: null, // 'indoor' o 'outdoor'
    currentStep: 0,
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: {
        id_lote: null // Aquí guardaremos el ID que nos devuelva Supabase
    } 
};

/**
 * Inicia el flujo y registra el ambiente en la tabla 'lotes' de Supabase
 */
async function startOnboarding(type) {
    state.environment = type;
    
    // Ajustamos el último paso según la elección del entorno
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';

    try {
        // Registro inicial en Supabase
        // IMPORTANTE: Asegúrate que la columna se llame 'espacio' en tu tabla 'lotes'
        const { data, error } = await supabase
            .from('lotes')
            .insert([{ espacio: type }])
            .select();

        if (error) throw error;

        // Guardamos el ID generado (en tu captura se ve como 'id del lote')
        // Si en la DB el nombre tiene espacios, se accede así: data[0]['id del lote']
        state.formData.id_lote = data[0]['id del lote'] || data[0].id;
        console.log("Registro exitoso. ID del Lote:", state.formData.id_lote);

        // Efecto visual: Ocultamos el branding
        const header = document.getElementById('header-branding');
        if (header) {
            header.style.opacity = '0';
            setTimeout(() => {
                header.style.display = 'none';
                loadNextStep();
            }, 300);
        }

    } catch (error) {
        console.error("Error de conexión con Supabase:", error.message);
        alert("No se pudo iniciar el registro. Revisa la consola.");
    }
}

/**
 * Carga el siguiente archivo HTML en el viewport
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];

    viewport.style.opacity = '0';
    viewport.style.transform = 'translateY(10px)';

    try {
        const response = await fetch(nextFile);
        if (!response.ok) throw new Error('Error al cargar ' + nextFile);
        
        const html = await response.text();
        
        setTimeout(() => {
            viewport.innerHTML = html;
            if (window.lucide) lucide.createIcons();
            
            viewport.style.opacity = '1';
            viewport.style.transform = 'translateY(0)';
            
            state.currentStep++;
        }, 300);

    } catch (error) {
        console.error("Critical Error:", error);
        viewport.innerHTML = `<div class="card"><p>Error al cargar el módulo ${nextFile}.</p></div>`;
        viewport.style.opacity = '1';
    }
}

/**
 * Recibe los datos de cada formulario y los acumula
 */
function handleStepSave(data) {
    state.formData = { ...state.formData, ...data };
    console.log(`Paso ${state.currentStep} guardado localmente:`, state.formData);

    if (state.currentStep < state.steps.length) {
        loadNextStep();
    } else {
        finalizeSetup();
    }
}

/**
 * Finaliza el onboarding
 */
function finalizeSetup() {
    const viewport = document.getElementById('app-viewport');
    
    viewport.innerHTML = `
        <div class="card fade-in">
            <i data-lucide="check-circle" size="48" style="color: #10B981; margin-bottom: 20px;"></i>
            <h2 style="font-weight: 300; margin-bottom: 10px;">Setup Complete</h2>
            <p style="font-size: 14px; color: #6B7280; opacity: 0.8;">
                IA is now calibrating your ${state.environment} environment.
            </p>
        </div>
    `;
    
    if (window.lucide) lucide.createIcons();
}