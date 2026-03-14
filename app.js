/**
 * app.js - Orquestador Maestro de Cultivo IA
 * Soporte: lotes, infraestructura e insumos
 */

const state = {
    environment: null,
    currentStep: 0,
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: { lote_id: null } 
};

/**
 * 1. INICIO DEL FLUJO
 */
async function startOnboarding(type) {
    if (state.formData.lote_id) {
        loadNextStep();
        return;
    }
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
            loadNextStep();
        }
    } catch (error) {
        alert("Error inicial: " + error.message);
    }
}

/**
 * 2. MOTOR DE NAVEGACIÓN
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];
    if (!nextFile) return;

    try {
        const response = await fetch(nextFile);
        const html = await response.text();
        viewport.innerHTML = html;

        if (window.lucide) lucide.createIcons();
        initPills(viewport);
        
        state.currentStep++;
        window.scrollTo(0, 0);
    } catch (error) {
        console.error("Error cargando paso:", error);
    }
}

function initPills(container) {
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
 * 3. PERSISTENCIA MULTI-TABLA
 */
async function handleStepSave(data, tableName = 'lotes') {
    try {
        let query;
        if (tableName === 'infraestructura') {
            query = supabaseClient.from('infraestructura').upsert({ lote_id: state.formData.lote_id, ...data }, { onConflict: 'lote_id' });
        } else if (tableName === 'insumos') {
            // Para insumos usamos INSERT ya que un lote puede tener muchos insumos
            query = supabaseClient.from('insumos').insert([data]);
        } else {
            query = supabaseClient.from('lotes').update(data).eq('lote_id', state.formData.lote_id);
        }

        const { error } = await query;
        if (error) throw error;
        loadNextStep();
    } catch (error) {
        alert("Error de guardado en " + tableName + ": " + error.message);
    }
}

/**
 * 4. RECOLECTORES (BRIDGES)
 */

window.submitBatchForm = function() {
    // ... (Código anterior de batch.html)
};

window.submitInfraForm = function() {
    // ... (Código anterior de infrastructure.html)
};

// NUEVO: Bridge para supplies.html
window.submitSuppliesForm = function() {
    const getVal = (id) => document.getElementById(id)?.value || null;
    const getActivePill = (id) => {
        const active = document.querySelector(`.pill-group[data-id="${id}"] .pill.active`);
        return active ? active.dataset.val : null;
    };

    // Mapeo exacto a las columnas de tu imagen de la tabla 'insumos'
    const formData = {
        nombre: getVal('nombre'),
        marca: getVal('marca'),
        categoria: getActivePill('categorías'),
        tipo_base: getActivePill('tipo_base'),
        formato: getActivePill('formato'),
        uso_principal: getVal('uso_principal'),
        aplicacion: getActivePill('aplicación'),
        incompatibilidad: getVal('incompatibilidad'),
        stock: parseFloat(getVal('existencias')) || 0,
        unidad_de_medida: getVal('unidad_de_medida')
    };

    handleStepSave(formData, 'insumos');
};