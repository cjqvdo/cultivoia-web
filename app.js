/**
 * app.js - Cultivo IA
 * FIX: Agregado soporte para submitForm y mapeo de IDs
 */

const state = {
    environment: null,
    currentStep: 0,
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: { lote_id: null } 
};

async function startOnboarding(type) {
    if (state.formData.lote_id) { loadNextStep(); return; }
    state.environment = type;
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';
    
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
    } catch (error) { 
        alert("Error at start: " + error.message); 
    }
}

async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];
    
    if (!nextFile) return;

    try {
        const response = await fetch(nextFile);
        if (!response.ok) throw new Error(`404: ${nextFile}`);
        
        viewport.innerHTML = await response.text();
        
        if (window.lucide) lucide.createIcons();
        initPillInteractions(viewport);
        
        state.currentStep++;
        window.scrollTo(0, 0);
    } catch (error) { 
        console.error("Load Error:", error);
    }
}

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
 * PUENTE CRÍTICO: Esta función mapea el onclick="submitForm()" de tus HTML
 * a las funciones específicas de guardado.
 */
window.submitForm = function() {
    // Si estamos en el primer paso (después de loadNextStep, currentStep ya es 1)
    if (state.currentStep === 1) {
        window.submitBatchForm();
    } else if (state.currentStep === 2) {
        window.submitInfraForm();
    } else if (state.currentStep === 3) {
        window.submitSuppliesForm();
    }
};

async function handleStepSave(data, tableName = 'lotes') {
    if (!state.formData.lote_id) return;
    try {
        let query;
        if (tableName === 'infraestructura') {
            query = supabaseClient.from('infraestructura').upsert({ lote_id: state.formData.lote_id, ...data }, { onConflict: 'lote_id' });
        } else if (tableName === 'insumos') {
            query = supabaseClient.from('insumos').insert([{ ...data, lote_id: state.formData.lote_id }]);
        } else {
            query = supabaseClient.from('lotes').update(data).eq('lote_id', state.formData.lote_id);
        }

        const { error } = await query;
        if (error) throw error;
        
        loadNextStep();
    } catch (error) { 
        alert("Save Error: " + error.message); 
    }
}

window.submitBatchForm = function() {
    const getVal = (id) => document.getElementById(id)?.value || null;
    const getActivePill = (id) => document.querySelector(`.pill-group[data-id="${id}"] .pill.active`)?.dataset.val;

    handleStepSave({
        nombre_del_lote: getVal('nombre_del_lote'),
        variedad: getActivePill('variedad'),
        cantidad_de_plantas: parseInt(getVal('cantidad_de_plantas')) || 0,
        genetica: getVal('genetica'),
        banco: getVal('banco'),
        predominancia_genetica: getActivePill('predominancia_genetica')
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
        iluminacion: getVal('iluminacion')
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