# Cultivo IA - Module: Data Acquisition (Inputs)

Este módulo contiene la capa de interfaz de usuario (UI) diseñada para la captura de datos maestros y la configuración de perfiles de éxito para cultivos controlados por Inteligencia Artificial.

## 🎨 Estética & UX
- **Diseño:** Minimalista Moderno (Apple-inspired).
- **Estilo:** Neumorfismo refinado con paleta monocromática (Grises, Blancos).
- **Tipografía:** Inter (Google Fonts).
- **Iconografía:** Lucide Icons.

## 🛠 Arquitectura de Datos (Tables)

### 1. Batch (Lotes)
Es la entidad principal. Define la genética, ubicación y, fundamentalmente, los **Optimal Targets** diferenciados por etapa:
- **Vegetative Stage:** Rangos de VPD, Humedad, Temperatura, EC y PH específicos para crecimiento.
- **Flowering Stage:** Rangos ajustados para la fase de producción (enfocados en prevención de hongos y engorde).

### 2. Infrastructure (Infraestructura)
Registro de activos físicos:
- Sensores, iluminación, sistemas de ventilación y riego.
- Seguimiento de consumo eléctrico (W) y observaciones técnicas.

### 3. Supplies (Insumos)
Gestión de inventario de consumibles:
- Fertilizantes (con perfil N-P-K), sustratos y preventivos.

### 4. Daily Logs (Registros Diarios)
Sistema de reporte de actividad:
- Confirmación de tareas prescritas por la IA.
- **Canal de Desvíos:** Campo crítico para reportar anomalías o incumplimientos del plan, permitiendo el recalculo dinámico del motor de IA.

## 🚀 Próximos Pasos
- [ ] Configuración del Bridge en Google Apps Script (backend_RAG.gs).
- [ ] Implementación de `POST` requests hacia Supabase.
- [ ] Validación de esquemas de datos en tiempo real.

---
**Desarrollado en Argentina para el mercado global de Ag-Tech.**