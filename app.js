/**
 * app.js - Orquestador Maestro de Cultivo IA
 */

const state = {
    environment: null,
    currentStep: 0,
    // Asegúrate de que estos archivos EXISTAN en tu carpeta
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: {
        lote_id: null 
    } 
};

/**
 * Inicia el flujo principal
 */
async function startOnboarding(type) {
    // BLOQUEO: Si ya tenemos un ID, no creamos otro lote
    if (state.formData.lote_id) {
        console.log("Ya existe un lote en proceso:", state.formData.lote_id);
        loadNextStep(); // Saltamos directo al primer paso
        return;
    }

    state.environment = type;
    // Ajuste dinámico del último paso
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';

    try {
        console.log("Creando registro inicial para:", type);
        const { data, error } = await supabaseClient
            .from('lotes')
            .insert([{ 
                espacio: type,
                estado_del_lote: 'active' 
            }])
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            state.formData.lote_id = data[0].lote_id;
            console.log("Registro Creado. ID:", state.formData.lote_id);
            
            // Animación de salida
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
        console.error("Error en INSERT inicial:", error);
        alert("Error de DB: " + error.message);
    }
}

/**
 * Carga de HTML y activación de interactividad
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];

    if (!nextFile) {
        console.log("No hay más pasos definidos.");
        return;
    }

    try {
        console.log("Cargando archivo:", nextFile);
        const response = await fetch(nextFile);
        
        if (!response.ok) {
            throw new Error(`Archivo no encontrado: ${nextFile}. Revisa si el archivo existe en el repositorio.`);
        }
        
        const html = await response.text();
        viewport.innerHTML = html;

        // Re-inicializar Lucide
        if (window.lucide) lucide.createIcons();

        // Re-inicializar Pills
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
        console.error("Error en loadNextStep:", error);
        viewport.innerHTML = `<div class="card"><p style="color:red;">Error 404: No se encontró el archivo <b>${nextFile}</b>. Crea el archivo para continuar.</p></div>`;
    }
}

/**
 * Sincronización con la DB (UPDATE)
 */
async function handleStepSave(data) {
    if (!state.formData.lote_id) {
        alert("Error: No hay un ID de lote activo.");
        return;
    }

    console.log("Actualizando Lote ID:", state.formData.lote_id, "con datos:", data);

    try {
        const { error } = await supabaseClient
            .from('lotes')
            .update(data)
            .eq('lote_id', state.formData.lote_id);

        if (error) throw error;

        console.log("Sincronización exitosa.");
        loadNextStep();

    } catch (error) {
        console.error("Error en UPDATE:", error.message);
        alert("Error al guardar: " + error.message);
    }
}

/**
 * Recolector de datos para batch.html
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

    const formData = {
        nombre_del_lote: getVal('nombre_del_lote', 'Lote Nuevo'),
        estado_del_lote: getActivePill('estado_del_lote') || 'active',
        variedad: getActivePill('variedad'),
        tipo_de_cultivo: getActivePill('tipo_de_cultivo'),
        cantidad_de_plantas: parseInt(getVal('cantidad_de_plantas', 0)) || 0,
        genetica: getVal('genetica', ''),
        banco: getVal('banco', ''),
        predominancia_genetica: getActivePill('predominancia_genetica'),
        thc_esperado: parseFloat(getVal('thc_esperado', 0)) || 0,
        cbd_esperado: parseFloat(getVal('cbd_esperado', 0)) || 0,
        fecha_de_germinacion_esqueje: getVal('fecha_de_germinacion_esqueje', null) || null
    };

    handleStepSave(formData);
};