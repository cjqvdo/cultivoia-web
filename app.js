/**
 * app.js - Orquestador Maestro de Cultivo IA
 */

const state = {
    environment: null,
    currentStep: 0,
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: {
        lote_id: null // Sincronizado con tu columna en Supabase
    } 
};

/**
 * Inicia el flujo principal. 
 * Se activa al elegir Indoor o Outdoor en el Index.
 */
async function startOnboarding(type) {
    // Bloqueo de seguridad: Evita crear 2 lotes si se hace doble clic
    if (state.formData.lote_id) {
        console.warn("Ya hay un proceso iniciado para el lote:", state.formData.lote_id);
        return;
    }

    state.environment = type;
    // El último paso se adapta al tipo de cultivo
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';

    console.log("Iniciando registro para:", type);

    try {
        if (typeof supabaseClient === 'undefined') {
            throw new Error("supabaseClient no cargado. Revisa config.js");
        }

        // INSERT inicial en Supabase
        const { data, error } = await supabaseClient
            .from('lotes')
            .insert([{ espacio: type }])
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            // Guardamos el ID real de la base de datos
            state.formData.lote_id = data[0].lote_id;
            console.log("Conexión Exitosa. ID asignado:", state.formData.lote_id);

            // Efecto de salida del branding y carga del primer paso
            const header = document.getElementById('header-branding');
            if (header) {
                header.style.transition = 'opacity 0.3s';
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
 * Motor de carga dinámica de HTML
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];

    if (!nextFile) return;

    // Animación de transición
    viewport.style.opacity = '0';
    viewport.style.transform = 'translateY(10px)';
    viewport.style.transition = 'all 0.3s ease';

    try {
        const response = await fetch(nextFile);
        if (!response.ok) throw new Error('No se encontró el archivo: ' + nextFile);
        
        const html = await response.text();
        
        setTimeout(() => {
            viewport.innerHTML = html;
            // Reinicializar iconos si usas Lucide
            if (window.lucide) lucide.createIcons();
            
            viewport.style.opacity = '1';
            viewport.style.transform = 'translateY(0)';
            state.currentStep++;
        }, 300);

    } catch (error) {
        console.error("Error cargando paso:", error);
        viewport.innerHTML = `<div class="card"><p>Error al cargar: ${nextFile}</p></div>`;
        viewport.style.opacity = '1';
    }
}

/**
 * Procesa y guarda los datos de cada formulario en Supabase
 */
async function handleStepSave(data) {
    state.formData = { ...state.formData, ...data };
    console.log("Actualizando registro en DB...", state.formData.lote_id);

    try {
        // UPDATE usando el lote_id que obtuvimos al principio
        const { error } = await supabaseClient
            .from('lotes')
            .update(data)
            .eq('lote_id', state.formData.lote_id);

        if (error) throw error;

        console.log("Datos sincronizados con éxito.");

        if (state.currentStep < state.steps.length) {
            loadNextStep();
        } else {
            finalizeSetup();
        }

    } catch (error) {
        console.error("Error al actualizar:", error.message);
        alert("No se pudo guardar: " + error.message);
    }
}

/**
 * Puente Global para capturar los datos de batch.html
 * Esto evita el error de "submitForm is not defined"
 */
window.submitBatchForm = function() {
    const getVal = (id, fallback) => {
        const el = document.getElementById(id);
        return el ? (el.value || fallback) : fallback;
    };

    const getActivePill = (id) => {
        const active = document.querySelector(`.pill-group[data-id="${id}"] .pill.active`);
        return active ? active.dataset.val : null;
    };

    const formData = {
        nombre_del_lote: getVal('nombre_del_lote', ''),
        estado_del_lote: getActivePill('estado_del_lote'),
        variedad: getActivePill('variedad'),
        country: getVal('country', ''),
        state_province: getVal('state_province', ''),
        city: getVal('city', ''),
        gps_coordinates: getVal('gps_coordinates', ''),
        tipo_de_cultivo: getActivePill('tipo_de_cultivo'),
        cantidad_de_plantas: parseInt(getVal('cantidad_de_plantas', 0)),
        cantidad_de_macetas: parseInt(getVal('cantidad_de_macetas', 0)),
        genetica: getVal('genetica', ''),
        proveedor: getVal('proveedor', ''),
        banco: getVal('banco', ''),
        predominancia_genetica: getActivePill('predominancia_genetica'),
        tamano_esperado_indoor: getVal('tamano_esperado_indoor', ''),
        tamano_esperado_outdoor: getVal('tamano_esperado_outdoor', ''),
        produccion_esperada_indoor: getVal('produccion_esperada_indoor', ''),
        produccion_esperada_outdoor: getVal('produccion_esperada_outdoor', ''),
        thc_esperado: parseFloat(getVal('thc_esperado', 0)),
        cbd_esperado: parseFloat(getVal('cbd_esperado', 0)),
        tiempo_floracion_esperada: getVal('tiempo_floracion_esperada', ''),
        fecha_de_germinacion_esqueje: getVal('fecha_de_germinacion_esqueje', null) || null,
        pase_a_sustrato: getVal('pase_a_sustrato', null) || null,
        fecha_del_flip: getVal('fecha_del_flip', null) || null,
        fecha_engorde: getVal('fecha_engorde', null) || null,
        fecha_cosecha: getVal('fecha_cosecha', null) || null,
        fecha_inicio_curado: getVal('fecha_inicio_curado', null) || null,
        fecha_cierre: getVal('fecha_cierre', null) || null,
        // Targets VEGE
        opt_vpd_vege_min: parseFloat(getVal('opt_vpd_vege_min', 0.8)),
        opt_vpd_vege_max: parseFloat(getVal('opt_vpd_vege_max', 1.1)),
        opt_hum_vege_min: parseInt(getVal('opt_hum_vege_min', 60)),
        opt_hum_vege_max: parseInt(getVal('opt_hum_vege_max', 80)),
        opt_temp_vege_min: parseInt(getVal('opt_temp_vege_min', 22)),
        opt_temp_vege_max: parseInt(getVal('opt_temp_vege_max', 28)),
        opt_ec_vege: parseFloat(getVal('opt_ec_vege', 1.2)),
        opt_ph_vege: parseFloat(getVal('opt_ph_vege', 5.8)),
        // Targets FLORA
        opt_vpd_flora_min: parseFloat(getVal('opt_vpd_flora_min', 1.2)),
        opt_vpd_flora_max: parseFloat(getVal('opt_vpd_flora_max', 1.5)),
        opt_hum_flora_min: parseInt(getVal('opt_hum_flora_min', 40)),
        opt_hum_flora_max: parseInt(getVal('opt_hum_flora_max', 55)),
        opt_temp_flora_min: parseInt(getVal('opt_temp_flora_min', 20)),
        opt_temp_flora_max: parseInt(getVal('opt_temp_flora_max', 26)),
        opt_ec_flora: parseFloat(getVal('opt_ec_flora', 1.8)),
        opt_ph_flora: parseFloat(getVal('opt_ph_flora', 6.2))
    };

    // Llamamos a la función de guardado
    handleStepSave(formData);
};

function finalizeSetup() {
    const viewport = document.getElementById('app-viewport');
    viewport.innerHTML = `
        <div class="card fade-in" style="text-align:center; padding: 50px 20px;">
            <i data-lucide="check-circle" size="64" style="color: #10B981; margin-bottom: 20px;"></i>
            <h2 style="font-weight: 200; font-size: 28px;">¡Lote Configurado!</h2>
            <p style="color: #6B7280; margin-top: 15px; font-size: 14px;">Todos los parámetros han sido sincronizados con Cultivo IA.</p>
            <button onclick="location.reload()" class="btn-primary" style="margin-top: 30px; padding: 15px 30px;">Finalizar</button>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}