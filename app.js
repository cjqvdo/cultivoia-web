/**
 * app.js - Cultivo IA v4.1
 * Master Orchestrator: Lots, Infrastructure, and Supplies
 */

const state = {
    environment: null,
    currentStep: 0,
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'dashboard.html'],
    formData: { lote_id: null } 
};

/**
 * Initializes the onboarding process
 */
async function startOnboarding(type) {
    state.environment = type;
    
    // UI Cleanup
    const branding = document.getElementById('header-branding');
    if (branding) branding.style.display = 'none';

    try {
        // Create the Lot first
        const { data, error } = await supabaseClient
            .from('lotes')
            .insert([{ 
                espacio: type,
                nombre_del_lote: `Batch ${type.toUpperCase()} - ${new Date().toLocaleDateString()}`,
                estado_del_lote: 'active' 
            }])
            .select();

        if (error) throw error;
        
        if (data && data.length > 0) {
            state.formData.lote_id = data[0].lote_id;
            // Reiniciamos el contador para asegurar que empiece en batch.html
            state.currentStep = 0; 
            await loadNextStep();
        }
    } catch (e) { 
        console.error("Initialization Error:", e);
        alert("Error creating record: " + e.message); 
    }
}

/**
 * Fetches and injects the next HTML component
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    if (!viewport) return;

    const nextFile = state.steps[state.currentStep];
    console.log(`Loading step ${state.currentStep}: ${nextFile}`); // Debug log

    if (!nextFile) {
        console.log("No more steps defined.");
        return;
    }

    try {
        const response = await fetch(nextFile);
        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status} - File: ${nextFile}`);
        
        const htmlContent = await response.text();
        viewport.innerHTML = htmlContent;
        
        // Post-load initialization
        const extraBranding = viewport.querySelector('.branding-to-remove');
        if (extraBranding) extraBranding.remove();

        if (window.lucide) lucide.createIcons();
        
        initPillInteractions(viewport);
        
        // Increment after successful load
        state.currentStep++;
        window.scrollTo(0, 0);
    } catch (e) { 
        console.error("Step Loading Error:", e);
        alert("Error loading the next screen. Check console for details.");
    }
}

/**
 * Global logic for pill selection
 */
function initPillInteractions(container) {
    const pills = container.querySelectorAll('.pill');
    pills.forEach(pill => {
        pill.onclick = function() {
            const group = this.closest('.pill-group');
            if (group) {
                group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                this.classList.add('active');
            }
        };
    });
}

/**
 * Universal save function
 */
async function handleStepSave(data, tableName = 'lotes') {
    if (!state.formData.lote_id) {
        alert("Session error: Batch ID not found.");
        return;
    }

    try {
        let query;
        if (tableName === 'infraestructura') {
            query = supabaseClient.from('infraestructura')
                .upsert({ lote_id: state.formData.lote_id, ...data }, { onConflict: 'lote_id' });
        } else if (tableName === 'insumos') {
            // Link supply to the current lot
            query = supabaseClient.from('insumos').insert([{ ...data, lote_id: state.formData.lote_id }]);
        } else {
            query = supabaseClient.from('lotes')
                .update(data)
                .eq('lote_id', state.formData.lote_id);
        }

        const { error } = await query;
        if (error) throw error;

        console.log(`Data saved successfully to ${tableName}`);
        await loadNextStep(); // Move to next screen
    } catch (e) { 
        console.error("Save Error:", e);
        alert("Database error: " + e.message); 
    }
}

/**
 * FORM SUBMISSIONS - Interfaz con el HTML
 */

window.submitBatchForm = function() {
    const getVal = (id) => document.getElementById(id)?.value || null;
    const getActivePill = (id) => document.querySelector(`.pill-group[data-id="${id}"] .pill.active`)?.dataset.val;

    handleStepSave({
        nombre_del_lote: getVal('nombre_del_lote'),
        variedad: getActivePill('variedad'),
        cantidad_de_plantas: parseInt(getVal('cantidad_de_plantas')) || 0,
        genetica: getVal('genetica'),
        banco: getVal('banco'),
        predominancia_genetica: getActivePill('predominancia_genetica'),
        tamaño_esperado: getActivePill('tamaño_esperado') 
    }, 'lotes');
};

window.submitInfraForm = function() {
    const getVal = (id) => document.getElementById(id)?.value || null;
    const getActivePill = (id) => document.querySelector(`.pill-group[data-id="${id}"] .pill.active`)?.dataset.val;

    handleStepSave({
        lugar_cultivo: getActivePill('lugar_cultivo'),
        ancho: parseFloat(getVal('ancho')) || 0,
        largo: parseFloat(getVal('largo')) || 0,
        alto: parseFloat(getVal('alto')) || 0,
        sustrato: getVal('sustrato'),
        iluminacion: getVal('iluminacion'),
        control_humedad: getVal('control_humedad'),
        control_temperatura: getVal('control_temperatura'),
        movimiento_aire: getVal('movimiento_aire'),
        iny_ext_aire: getVal('iny_ext_aire'),
        observaciones_infraestructura: getVal('observaciones_infraestructura')
    }, 'infraestructura');
};

window.submitSuppliesForm = function() {
    const getVal = (id) => document.getElementById(id)?.value || null;
    const getActivePill = (id) => document.querySelector(`.pill-group[data-id="${id}"] .pill.active`)?.dataset.val;

    handleStepSave({
        nombre: getVal('nombre'),
        marca: getVal('marca'),
        categoria: getActivePill('categorías'),
        tipo_base: getActivePill('tipo_base'),
        formato: getActivePill('formato'),
        uso_principal: getVal('uso_principal'),
        aplicacion: getActivePill('aplicación'),
        incompatibilidad: getVal('incompatibilidad'),
        stock: parseFloat(getVal('existencias')) || 0,
        unidad_de_medida: getActivePill('unidad_medida') 
    }, 'insumos');
};