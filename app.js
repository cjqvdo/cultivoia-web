/**
 * app.js - Orquestador de Onboarding Cultivo IA
 */

const state = {
    environment: null, // 'indoor' o 'outdoor'
    currentStep: 0,
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: {
        id_lote: null 
    } 
};

/**
 * Inicia el flujo y registra el ambiente en la tabla 'lotes' de Supabase
 */
async function startOnboarding(type) {
    state.environment = type;
    
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';

    try {
        // Usamos 'supabaseClient' definido en config.js
        const { data, error } = await supabaseClient
            .from('lotes')
            .insert([{ espacio: type }])
            .select();

        if (error) throw error;

        // Acceso seguro al ID del lote (con espacios como en tu tabla)
        state.formData.id_lote = data[0]['id del lote'];
        console.log("Registro exitoso en Supabase. ID:", state.formData.id_lote);

        const header = document.getElementById('header-branding');
        if (header) {
            header.style.opacity = '0';
            setTimeout(() => {
                header.style.display = 'none';
                loadNextStep();
            }, 300);
        }

    } catch (error) {
        console.error("Error detallado:", error);
        alert("Error de conexión: " + error.message);
    }
}

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

function handleStepSave(data) {
    state.formData = { ...state.formData, ...data };
    console.log(`Paso ${state.currentStep} guardado localmente:`, state.formData);

    if (state.currentStep < state.steps.length) {
        loadNextStep();
    } else {
        finalizeSetup();
    }
}

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