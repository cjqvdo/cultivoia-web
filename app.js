/**
 * app.js - Cultivo IA v4.3
 * PROTECCIÓN TOTAL Y DEPURACIÓN ACTIVA
 */

const state = {
    environment: null,
    currentStep: 0,
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: { lote_id: null } 
};

// Exponer el estado a la consola para debug manual
window.cultivoState = state;

async function startOnboarding(type) {
    console.log("Iniciando onboarding para:", type);
    state.environment = type;
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';
    
    try {
        const { data, error } = await supabaseClient
            .from('lotes')
            .insert([{ 
                espacio: type,
                nombre_del_lote: `Lote ${type.toUpperCase()} - ${new Date().toLocaleDateString()}`,
                estado_del_lote: 'active' 
            }])
            .select();

        if (error) throw error;
        
        if (data && data.length > 0) {
            state.formData.lote_id = data[0].lote_id;
            console.log("Lote creado con ID:", state.formData.lote_id);
            await loadNextStep();
        }
    } catch (err) { 
        alert("ERROR AL INICIAR: " + err.message); 
    }
}

async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];
    
    console.log("Cargando paso:", state.currentStep, "Archivo:", nextFile);

    if (!nextFile) {
        alert("Fin del flujo de configuración.");
        return;
    }

    try {
        const response = await fetch(nextFile);
        if (!response.ok) throw new Error(`Error HTTP ${response.status} en ${nextFile}`);
        
        const html = await response.text();
        viewport.innerHTML = html;
        
        if (window.lucide) lucide.createIcons();
        initPillInteractions(viewport);
        
        state.currentStep++;
        window.scrollTo(0, 0);
    } catch (err) { 
        alert("ERROR AL CARGAR PANTALLA: " + err.message);
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

// Función global que unifica el guardado
async function handleStepSave(data, tableName) {
    if (!state.formData.lote_id) {
        alert("ERROR: No hay un ID de lote activo. Reinicia el proceso.");
        return;
    }

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
        
        console.log("Guardado exitoso en:", tableName);
        await loadNextStep();
    } catch (err) { 
        alert("ERROR AL GUARDAR: " + err.message); 
    }
}

/**
 * MAPEOS GLOBALES PARA TUS HTML
 */

// Si tu botón dice submitForm()
window.submitForm = function() {
    console.log("submitForm invocado. Paso actual:", state.currentStep);
    // Como loadNextStep ya incrementó el step, evaluamos:
    if (state.currentStep === 1) submitBatchForm();
    else if (state.currentStep === 2) submitInfraForm();
    else if (state.currentStep === 3) submitSuppliesForm();
};

// Si tu botón dice submitBatchForm()
window.submitBatchForm = function() {
    const getVal = (id) => document.getElementById(id)?.value || null;
    const getActivePill = (id) => {
        const el = document.querySelector(`.pill-group[data-id="${id}"] .pill.active`);
        return el ? el.dataset.val : null;
    };

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
    const getActivePill = (id) => {
        const el = document.querySelector(`.pill-group[data-id="${id}"] .pill.active`);
        return el ? el.dataset.val : null;
    };

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
    const getActivePill = (id) => {
        const el = document.querySelector(`.pill-group[data-id="${id}"] .pill.active`);
        return el ? el.dataset.val : null;
    };

    handleStepSave({
        nombre: getVal('nombre'),
        marca: getVal('marca'),
        categoria: getActivePill('categorías'),
        stock: parseFloat(getVal('existencias')) || 0,
        unidad_de_medida: getActivePill('unidad_medida') 
    }, 'insumos');
};