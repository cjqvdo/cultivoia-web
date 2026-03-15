
/**

 * app.js - Orquestador Maestro de Cultivo IA

 * SOPORTE COMPLETO: Lotes, Infraestructura e Insumos

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

                nombre_del_lote: `Lote ${type.toUpperCase()} - ${new Date().toLocaleDateString()}`,

                estado_del_lote: 'active' 

            }])

            .select();

        if (error) throw error;

        if (data && data.length > 0) {

            state.formData.lote_id = data[0].lote_id;

            loadNextStep();

        }

    } catch (error) { alert("Error al iniciar: " + error.message); }

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

    } catch (error) { console.error(error); }

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



async function handleStepSave(data, tableName = 'lotes') {

    if (!state.formData.lote_id) return;

    try {

        let query;

        if (tableName === 'infraestructura') {

            query = supabaseClient.from('infraestructura').upsert({ lote_id: state.formData.lote_id, ...data }, { onConflict: 'lote_id' });

        } else if (tableName === 'insumos') {

            query = supabaseClient.from('insumos').insert([data]);

        } else {

            query = supabaseClient.from('lotes').update(data).eq('lote_id', state.formData.lote_id);

        }

        const { error } = await query;

        if (error) throw error;

        console.log(`Guardado exitoso en [${tableName}]`);

        loadNextStep();

    } catch (error) { alert("Error de guardado: " + error.message); }

}



window.submitBatchForm = function() {

    const getVal = (id) => document.getElementById(id)?.value || null;

    const getActivePill = (id) => {

        const active = document.querySelector(`.pill-group[data-id="${id}"] .pill.active`);

        return active ? active.dataset.val : null;

    };

    handleStepSave({

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

    }, 'lotes');

};



window.submitInfraForm = function() {

    const getVal = (id) => document.getElementById(id)?.value || null;

    const getActivePill = (id) => {

        const active = document.querySelector(`.pill-group[data-id="${id}"] .pill.active`);

        return active ? active.dataset.val : null;

    };

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

    const getActivePill = (id) => {

        const active = document.querySelector(`.pill-group[data-id="${id}"] .pill.active`);

        return active ? active.dataset.val : null;

    };

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

        unidad_de_medida: getVal('unidad_de_medida')

    }, 'insumos');

};