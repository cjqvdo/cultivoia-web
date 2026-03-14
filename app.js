/**
 * app.js - Orquestador Maestro de Cultivo IA
 * Versión: 2.1 (Multi-tabla & Upsert optimizado)
 */

// 1. ESTADO GLOBAL
const state = {
    environment: null,
    currentStep: 0,
    // Asegúrate de que estos .html existan en tu raíz de Vercel
    steps: ['batch.html', 'infrastructure.html', 'supplies.html', 'setup_detail'],
    formData: {
        lote_id: null 
    } 
};

/**
 * 2. REGISTRO INICIAL (index.html)
 * Se ejecuta al elegir Indoor u Outdoor
 */
async function startOnboarding(type) {
    // Si ya existe un lote_id en esta sesión, saltamos al siguiente paso
    if (state.formData.lote_id) {
        loadNextStep();
        return;
    }

    state.environment = type;
    state.steps[3] = (type === 'indoor') ? 'indoor.html' : 'outdoor.html';

    try {
        // Registro base en 'lotes'
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
            
            // Animación de salida del header
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
        console.error("Error inicial:", error.message);
        alert("Error al iniciar lote: " + error.message);
    }
}

/**
 * 3. MOTOR DE NAVEGACIÓN (CARGA DINÁMICA)
 */
async function loadNextStep() {
    const viewport = document.getElementById('app-viewport');
    const nextFile = state.steps[state.currentStep];

    if (!nextFile) {
        console.log("Flujo finalizado correctamente.");
        return;
    }

    try {
        const response = await fetch(nextFile);
        if (!response.ok) throw new Error(`Archivo no encontrado: ${nextFile}`);
        
        const html = await response.text();
        viewport.innerHTML = html;

        // Re-activar componentes de UI
        if (window.lucide) lucide.createIcons();
        initPillInteractions(viewport);
        
        state.currentStep++;
        window.scrollTo(0, 0);

    } catch (error) {
        console.error("Error de carga:", error);
        viewport.innerHTML = `<div class="section-card"><p style="color:red;">Error al cargar el componente <b>${nextFile}</b>. Verifica que el archivo existe en el repositorio.</p></div>`;
    }
}

/**
 * Activa el evento click en los botones tipo "Pill"
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
 * 4. SISTEMA DE PERSISTENCIA (GUARDADO)
 * tableName: 'lotes' (por defecto) o 'infraestructura'
 */
async function handleStepSave(data, tableName = 'lotes') {
    if (!state.formData.lote_id) {
        alert("Sesión inválida. Por favor reinicia.");
        return;
    }

    try {
        let query;

        if (tableName === 'infraestructura') {
            // UPSERT: Inserta si no existe, actualiza si ya existe el lote_id
            query = supabaseClient
                .from('infraestructura')
                .upsert({ 
                    lote_id: state.formData.lote_id, 
                    ...data 
                }, { onConflict: 'lote_id' });
        } else {
            // UPDATE: Actualiza la fila principal del lote
            query = supabaseClient
                .from('lotes')
                .update(data)
                .eq('lote_id', state.formData.lote_id);
        }

        const { error } = await query;
        if (error) throw error;

        console.log(`Guardado exitoso en ${tableName}`);
        loadNextStep();

    } catch (error) {
        console.error("Error al sincronizar:", error.message);
        alert("Error de guardado: " + error.message);
    }
}

/**
 * 5. BRIDGES (Conectores entre HTML y Supabase)
 */

// Se llama desde batch.html
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

// Se llama desde infrastructure.html
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