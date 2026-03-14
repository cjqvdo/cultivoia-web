/**
 * app.js - Orquestador Maestro de Cultivo IA
 * SOLUCIÓN: Multi-tabla con soporte para Lotes e Infraestructura
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
 * 1. INICIO DEL FLUJO (index.html)
 * Crea el registro base en la tabla 'lotes'
 */
async function startOnboarding(type) {
    if (state.formData.lote_id) {
        loadNextStep();
        return;
    }

    state.environment = type;
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';

    try {
        console.log("Iniciando registro para:", type);
        
        // Insertamos el registro base
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
            console.log("Registro exitoso. ID:", state.formData.lote_id);

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
        console.error("Error en startOnboarding:", error.message);
        alert("Error al iniciar: " + error.message);
    }
}

/**
 * 2. MOTOR DE CARGA DINÁMICA
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];

    if (!nextFile) return;

    try {
        const response = await fetch(nextFile);
        if (!response.ok) throw new Error(`404: No se encontró ${nextFile}`);
        
        const html = await response.text();
        viewport.innerHTML = html;

        // Reinicializar componentes Lucide e interacciones de UI
        if (window.lucide) lucide.createIcons();
        initPillInteractions(viewport);
        
        state.currentStep++;
        window.scrollTo(0, 0);

    } catch (error) {
        console.error("Error en loadNextStep:", error);
        viewport.innerHTML = `<div class="section-card"><p style="color:red;">Error al cargar: <b>${nextFile}</b></p></div>`;
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
 * 3. PERSISTENCIA (UPDATE / UPSERT)
 * Esta función decide si guardar en 'lotes' o en 'infraestructura'
 */
async function handleStepSave(data, tableName = 'lotes') {
    if (!state.formData.lote_id) {
        alert("Error: No se encontró el ID del lote.");
        return;
    }

    try {
        let query;

        if (tableName === 'infraestructura') {
            // UPSERT para la tabla técnica (usa lote_id para evitar duplicados)
            query = supabaseClient
                .from('infraestructura')
                .upsert({ 
                    lote_id: state.formData.lote_id, 
                    ...data 
                }, { onConflict: 'lote_id' });
        } else {
            // UPDATE para la tabla principal lotes
            query = supabaseClient
                .from('lotes')
                .update(data)
                .eq('lote_id', state.formData.lote_id);
        }

        const { error } = await query;
        if (error) throw error;

        console.log(`Guardado exitoso en [${tableName}]`);
        loadNextStep();

    } catch (error) {
        console.error("Error en handleStepSave:", error.message);
        // Aquí capturamos los errores de tus capturas (alto, RLS, etc)
        alert("No se pudo guardar: " + error.message);
    }
}

/**
 * 4. RECOLECTORES (Bridges entre HTML y Supabase)
 */

// Para batch.html (Tabla: lotes)
window.submitBatchForm = function() {
    const getVal = (id) => document.getElementById(id)?.value || null;
    const getActivePill = (id) => {
        const active = document.querySelector(`.pill-group[data-id="${id}"] .pill.active`);
        return active ? active.dataset.val : null;
    };

    const formData = {
        nombre_del_lote: getVal('nombre_del_lote'),
        estado_del_lote: getActivePill('estado_del_lote') || 'active',
        variedad: getActivePill('variedad'),
        tipo_de_cultivo: getActivePill('tipo_de_cultivo'),
        cantidad_de_plantas: parseInt(getVal('cantidad_de_plantas')) || 0,
        genetica: getVal('genetica'),
        banco: getVal('banco'),
        predominancia_genetica: getActivePill('predominancia_genetica'),
        thc_esperado: parseFloat(getVal('thc_esperado')) || 0,
        cbd_esperado: parseFloat(getVal('cbd_esperado')) || 0
    };

    handleStepSave(formData, 'lotes');
};

// Para infrastructure.html (Tabla: infraestructura)
window.submitInfraForm = function() {
    const getVal = (id) => document.getElementById(id)?.value || null;
    const getActivePill = (id) => {
        const active = document.querySelector(`.pill-group[data-id="${id}"] .pill.active`);
        return active ? active.dataset.val : null;
    };

    const formData = {
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
    };

    handleStepSave(formData, 'infraestructura');
};