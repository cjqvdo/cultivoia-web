/**
 * app.js - Cultivo IA v4.0
 * Master Orchestrator: Lots, Infrastructure, and Supplies
 */

const state = {
    environment: null,
    currentStep: 0,
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'dashboard.html'],
    formData: { lote_id: null } 
};

/**
 * Initializes the onboarding process and creates the Lot in Supabase
 */
async function startOnboarding(type) {
    state.environment = type;
    
    // Hide initial branding
    const branding = document.getElementById('header-branding');
    if (branding) branding.style.display = 'none';

    try {
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
            loadNextStep();
        }
    } catch (e) { 
        alert("Initialization Error: " + e.message); 
    }
}

/**
 * Fetches and injects the next HTML component into the viewport
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];
    
    if (!nextFile) return;

    try {
        const response = await fetch(nextFile);
        if (!response.ok) throw new Error(`Could not load ${nextFile}`);
        
        viewport.innerHTML = await response.text();
        
        // Clean up any extra branding from the component
        const extraBranding = viewport.querySelector('.branding-to-remove');
        if (extraBranding) extraBranding.remove();

        if (window.lucide) lucide.createIcons();
        
        initPillInteractions(viewport);
        state.currentStep++;
        window.scrollTo(0, 0);
    } catch (e) { 
        console.error("Step Loading Error:", e); 
    }
}

/**
 * Global logic for pill selection (UI/UX)
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
 * Universal save function for all steps
 */
async function handleStepSave(data, tableName = 'lotes') {
    if (!state.formData.lote_id) {
        alert("Error: No active Batch ID found.");
        return;
    }

    try {
        let query;
        if (tableName === 'infraestructura') {
            query = supabaseClient.from('infraestructura')
                .upsert({ lote_id: state.formData.lote_id, ...data }, { onConflict: 'lote_id' });
        } else if (tableName === 'insumos') {
            // Supplies are linked via lote_id if your schema allows it, 
            // otherwise they are global inventory items.
            query = supabaseClient.from('insumos').insert([{ ...data, lote_id: state.formData.lote_id }]);
        } else {
            query = supabaseClient.from('lotes')
                .update(data)
                .eq('lote_id', state.formData.lote_id);
        }

        const { error } = await query;
        if (error) throw error;

        console.log(`Successful save in [${tableName}]`);
        loadNextStep();
    } catch (e) { 
        alert("Save Error: " + e.message); 
    }
}

/**
 * FORM SUBMISSIONS
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
        unidad_de_medida: getActivePill('unidad_medida') // Captura el valor de la pill (ml, gr, etc.)
    }, 'insumos');
};