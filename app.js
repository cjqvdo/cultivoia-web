/**
 * app.js - Orquestador de Onboarding Cultivo IA
 */

const state = {
    environment: null, // 'indoor' o 'outdoor'
    currentStep: 0,
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: {} // Aquí se irá acumulando todo antes de enviar a Supabase
};

/**
 * Inicia el flujo de configuración inicial
 */
function startOnboarding(type) {
    state.environment = type;
    
    // Ajustamos el último paso según la elección del entorno
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';

    // Efecto visual: Ocultamos el branding para centrar la atención en los inputs
    const header = document.getElementById('header-branding');
    if (header) {
        header.style.opacity = '0';
        setTimeout(() => {
            header.style.display = 'none';
            loadNextStep();
        }, 300);
    }
}

/**
 * Carga el siguiente archivo HTML en el viewport
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];

    // Animación de salida
    viewport.style.opacity = '0';
    viewport.style.transform = 'translateY(10px)';

    try {
        // En Google Apps Script (entorno real), usaremos una función específica
        // Para desarrollo local o pruebas, usamos fetch
        const response = await fetch(nextFile);
        if (!response.ok) throw new Error('Error al cargar ' + nextFile);
        
        const html = await response.text();
        
        setTimeout(() => {
            viewport.innerHTML = html;
            
            // Reiniciamos los iconos de Lucide para el contenido nuevo
            if (window.lucide) lucide.createIcons();
            
            // Animación de entrada
            viewport.style.opacity = '1';
            viewport.style.transform = 'translateY(0)';
            
            state.currentStep++;
        }, 300);

    } catch (error) {
        console.error("Critical Error:", error);
        viewport.innerHTML = `<div class="card"><p>Error al cargar el módulo.</p></div>`;
        viewport.style.opacity = '1';
    }
}

/**
 * Función puente que recibiría los datos de cada formulario individual
 * Debes llamar a esta función desde el 'submitForm' de cada archivo .html
 */
function handleStepSave(data) {
    // Mergeamos los datos nuevos con los que ya teníamos
    state.formData = { ...state.formData, ...data };
    
    console.log(`Paso ${state.currentStep} completado. Datos actuales:`, state.formData);

    if (state.currentStep < state.steps.length) {
        loadNextStep();
    } else {
        finalizeSetup();
    }
}

/**
 * Finaliza el onboarding y debería redirigir al Dashboard principal
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
    
    // Aquí es donde en el futuro llamarás a:
    // google.script.run.withSuccessHandler(showDashboard).saveAllData(state.formData);
}