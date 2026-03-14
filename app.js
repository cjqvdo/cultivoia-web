/**
 * app.js - Orquestador Maestro de Cultivo IA
 */

const state = {
    environment: null,
    currentStep: 0,
    // Asegúrate de que estos archivos existan en tu directorio raíz
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: {
        lote_id: null 
    } 
};

/**
 * 1. INICIO DEL FLUJO
 * Se dispara desde el index.html (Botones Indoor/Outdoor)
 */
async function startOnboarding(type) {
    // Bloqueo de seguridad: Si ya hay un proceso, no crear otro registro
    if (state.formData.lote_id) {
        console.log("Sesión activa detectada:", state.formData.lote_id);
        loadNextStep();
        return;
    }

    state.environment = type;
    // El cuarto paso cambia según el entorno elegido
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';

    try {
        console.log("Iniciando registro inicial para:", type);
        
        // INSERT inicial en Supabase
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
            console.log("Registro exitoso. ID asignado:", state.formData.lote_id);

            // Transición visual
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
        console.error("Error en startOnboarding:", error);
        alert("Error de conexión con la base de datos: " + error.message);
    }
}

/**
 * 2. MOTOR DE CARGA DINÁMICA
 * Carga el HTML de cada paso y "despierta" sus componentes
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];

    if (!nextFile) {
        console.log("Fin del flujo de configuración.");
        return;
    }

    try {
        console.log("Cargando:", nextFile);
        const response = await fetch(nextFile);
        
        if (!response.ok) {
            throw new Error(`404: No se encontró el archivo ${nextFile}`);
        }
        
        const html = await response.text();
        viewport.innerHTML = html;

        // --- RE-INICIALIZACIÓN DE COMPONENTES ---
        // Despertar iconos de Lucide
        if (window.lucide) lucide.createIcons();

        // Despertar lógica de las "Pills" (Seleccionadores)
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
        window.scrollTo(0, 0);

    } catch (error) {
        console.error("Error en loadNextStep:", error);
        viewport.innerHTML = `
            <div class="section-card" style="text-align:center;">
                <p style="color:red;">Error al cargar el componente: <b>${nextFile}</b></p>
                <p>Asegúrate de que el archivo existe en tu repositorio.</p>
            </div>`;
    }
}

/**
 * 3. SINCRONIZACIÓN DE DATOS (UPDATE)
 * Actualiza la fila existente en Supabase usando el lote_id
 */
async function handleStepSave(data) {
    if (!state.formData.lote_id) {
        alert("Error: No se encontró un ID de lote válido.");
        return;
    }

    try {
        console.log("Sincronizando datos para ID:", state.formData.lote_id);
        const { error } = await supabaseClient
            .from('lotes')
            .update(data)
            .eq('lote_id', state.formData.lote_id);

        if (error) throw error;

        console.log("Sincronización exitosa.");
        loadNextStep();

    } catch (error) {
        console.error("Error en handleStepSave:", error.message);
        alert("No se pudo guardar: " + error.message);
    }
}

/**
 * 4. RECOLECTORES DE FORMULARIOS (BRIDGES)
 */

// Captura para batch.html
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
        nombre_del_lote: getVal('nombre_del_lote', 'Nuevo Lote'),
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

// Captura para infrastructure.html
window.submitInfraForm = function() {
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
        lugar_cultivo: getActivePill('lugar_cultivo'),
        ancho: parseFloat(getVal('ancho', 0)) || 0,
        largo: parseFloat(getVal('largo', 0)) || 0,
        alto: parseFloat(getVal('alto', 0)) || 0,
        sustrato: getVal('sustrato', ''),
        iluminacion: getVal('iluminacion', ''),
        control_humedad: getVal('control_humedad', ''),
        control_temperatura: getVal('control_temperatura', ''),
        movimiento_aire: getVal('movimiento_aire', ''),
        iny_ext_aire: getVal('iny_ext_aire', ''),
        observaciones_infraestructura: getVal('observaciones_infraestructura', '')
    };

    handleStepSave(formData);
};