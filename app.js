/**
 * app.js - Orquestador Maestro de Cultivo IA
 */

const state = {
    environment: null,
    currentStep: 0,
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: {
        lote_id: null 
    } 
};

/**
 * Inicia el flujo principal y crea el registro inicial
 */
async function startOnboarding(type) {
    if (state.formData.lote_id) return;

    state.environment = type;
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';

    console.log("Iniciando registro para:", type);

    try {
        const { data, error } = await supabaseClient
            .from('lotes')
            .insert([{ 
                espacio: type,
                estado_del_lote: 'activo' // Valor por defecto seguro
            }])
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            state.formData.lote_id = data[0].lote_id;
            console.log("Conexión Exitosa. ID asignado:", state.formData.lote_id);

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
        console.error("Error en registro inicial:", error);
        alert("Error de Conexión: " + error.message);
    }
}

/**
 * Carga el HTML y activa la interactividad de los componentes
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];

    if (!nextFile) return;

    try {
        const response = await fetch(nextFile);
        if (!response.ok) throw new Error('No se encontró ' + nextFile);
        
        const html = await response.text();
        viewport.innerHTML = html;

        // --- RE-INICIALIZACIÓN ---
        if (window.lucide) lucide.createIcons();

        // Activación de Pills
        const pills = viewport.querySelectorAll('.pill');
        pills.forEach(pill => {
            pill.onclick = function() {
                const group = this.closest('.pill-group');
                if (group) {
                    group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                    this.classList.add('active');
                }
            };
        });
        
        state.currentStep++;

    } catch (error) {
        console.error("Error cargando paso:", error);
    }
}

/**
 * Sincroniza datos con Supabase
 */
async function handleStepSave(data) {
    console.log("Intentando actualizar lote:", state.formData.lote_id);
    try {
        const { error } = await supabaseClient
            .from('lotes')
            .update(data)
            .eq('lote_id', state.formData.lote_id);

        if (error) throw error;

        console.log("Datos sincronizados con éxito.");
        loadNextStep();

    } catch (error) {
        console.error("Error al actualizar:", error.message);
        alert("No se pudo guardar: " + error.message);
    }
}

/**
 * Captura masiva de batch.html
 */
window.submitBatchForm = function() {
    const getVal = (id, fallback) => {
        const el = document.getElementById(id);
        return el ? (el.value || fallback) : fallback;
    };

    const getActivePill = (id) => {
        const group = document.querySelector(`.pill-group[data-id="${id}"]`);
        if (!group) return null;
        const active = group.querySelector('.pill.active');
        return active ? active.dataset.val : null;
    };

    // Construcción del objeto de datos
    const formData = {
        nombre_del_lote: getVal('nombre_del_lote', 'Nuevo Lote'),
        estado_del_lote: getActivePill('estado_del_lote') || 'activo',
        variedad: getActivePill('variedad'),
        tipo_de_cultivo: getActivePill('tipo_de_cultivo'),
        cantidad_de_plantas: parseInt(getVal('cantidad_de_plantas', 0)),
        genetica: getVal('genetica', ''),
        banco: getVal('banco', ''),
        predominancia_genetica: getActivePill('predominancia_genetica'),
        thc_esperado: parseFloat(getVal('thc_esperado', 0)),
        cbd_esperado: parseFloat(getVal('cbd_esperado', 0)),
        fecha_de_germinacion_esqueje: getVal('fecha_de_germinacion_esqueje', null) || null
    };

    handleStepSave(formData);
};