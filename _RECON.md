# Reconocimiento: Clasificador Geográfico de Medios
Fecha: 2026-01-07

---

## 1. Estructura del Proyecto

```
Clasificador-Geográfico/
├── index.html                       # Página principal (UI)
├── app.js                           # Lógica de procesamiento JS
├── styles.css                       # Estilos CSS
├── clasificar_geografico.py         # Script Python alternativo
├── netlify.toml                     # Config de deploy Netlify
├── README.md                        # Documentación
├── NACIONAL UPN.xlsx                # Archivo de ejemplo (input)
├── NACIONAL UPN_CLASIFICADO.xlsx    # Archivo de ejemplo (output)
└── RANKINT ULT TRIMESTRE (18).xlsx  # Archivo de ratings de ejemplo
```

**Líneas de código:**
| Archivo                   | Líneas |
|---------------------------|--------|
| app.js                    | 1,032  |
| styles.css                | 1,146  |
| index.html                | 421    |
| clasificar_geografico.py  | 89     |
| **TOTAL**                 | **2,688** |

**Package Manager:** Ninguno (sin dependencies locales)

**Archivos de Configuración:**
- `netlify.toml` → Configuración de headers de seguridad y publish directory

---

## 2. Stack Tecnológico

```
STACK:
├── Lenguaje: JavaScript ES6+ (frontend) + Python 3.x (script opcional)
├── Framework: Vanilla JS (sin framework)
├── Base de datos: Ninguna (procesa archivos locales)
├── Auth: Ninguna
├── UI: HTML5 + CSS3 puro
├── Librerías externas:
│   ├── SheetJS (xlsx) vía CDN → Lectura/escritura Excel
│   └── Google Fonts (Inter) → Tipografía
└── Deploy: Netlify (hosting estático)
```

**Características técnicas:**
- 100% Client-side (procesamiento en navegador)
- Sin servidor/backend
- Datos nunca salen del dispositivo del usuario

---

## 3. Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `index.html` | UI completa con drag & drop, formularios de config, previsualización y resultados |
| `app.js` | Motor de clasificación geográfica + cálculo de audiencia + generación de Excel |
| `styles.css` | Diseño responsive moderno con variables CSS |
| `clasificar_geografico.py` | Script Python standalone que hace lo mismo (alternativa CLI) |
| `netlify.toml` | Headers de seguridad (X-Frame-Options, XSS-Protection, etc.) |

---

## 4. Dependencias

### Frontend (CDN - no hay package.json)

| Librería | Versión | Uso |
|----------|---------|-----|
| SheetJS (xlsx) | 0.20.1 | Lectura de Excel RANKINT + generación de Excel de salida |
| Google Fonts (Inter) | latest | Tipografía de la UI |

### Backend/Python (implícitas - no hay requirements.txt)

| Librería | Uso |
|----------|-----|
| pandas | Procesamiento de datos tabular |
| openpyxl | Lectura/escritura de archivos Excel |
| numpy | Operaciones numéricas (dependencia de pandas) |

---

## 5. Propósito de la Herramienta

### 5.1 ¿Qué hace esta herramienta?

Clasifica registros de **pauta publicitaria en TV/medios peruanos** determinando si un spot tiene alcance **NACIONAL** (apareció en las 7 ciudades principales: Lima, Arequipa, Trujillo, Cusco, Chiclayo, Huancayo, Piura) o si fue emitido solo en **ciudades específicas**. Además calcula valores de audiencia basándose en ratings y distribución porcentual por zona (Norte/Sur).

### 5.2 ¿Quién la usa?

- **Media Planners** / Planificadores de medios
- **Analistas de publicidad** en agencias
- Personal de marketing que necesita reportes de cobertura geográfica

### 5.3 ¿Qué recibe? (Inputs)

| Input | Formato | Descripción |
|-------|---------|-------------|
| Archivo de pauta | TXT (delimitado por pipes `\|`) | Registros de spots publicitarios con columnas: DIA, MEDIO, EMISORA/SITE, VERSION, REGION/ÁMBITO, SPOTS, etc. |
| Archivos RANKINT | Excel (.xlsx) | Ratings por canal/programa para zonas Norte y Sur |
| Configuración | UI | Ámbito geográfico, audiencia en miles por zona, porcentajes por ciudad |

### 5.4 ¿Qué produce? (Outputs)

| Output | Formato | Descripción |
|--------|---------|-------------|
| Excel clasificado | .xlsx | Archivo original + columna `CLASIFICACION_GEOGRAFICA` (NACIONAL o nombre de ciudad) |
| Tabla dinámica | Sheet en Excel | Resumen agregado por año/mes/emisora/programa/zona/ciudad |
| Estadísticas | UI | Total registros, registros NACIONAL, grupos únicos, distribución % |
| Gráfico de barras | UI | Visualización de distribución por clasificación |

---

## 6. Reglas de Negocio Identificadas

### 6.1 Clasificación NACIONAL automática
Ciertas emisoras siempre se clasifican como NACIONAL:
- ATV+
- NATIVA TV
- RPP TV
- WILLAX PERU

### 6.2 Clasificación por distribución geográfica
Para otros registros:
1. Se agrupan por: `DIA + MEDIO + EMISORA/SITE + VERSION`
2. Si aparecen en las **7 ciudades**: el mínimo común se marca NACIONAL, excedentes van a ciudad específica
3. Si aparecen en **menos de 7 ciudades**: cada registro se clasifica por su ciudad

### 6.3 Zonas geográficas
- **NORTE:** Chiclayo, Trujillo, Piura
- **SUR:** Arequipa, Cusco, Huancayo
- **LIMA:** Tratamiento especial/separado

---

## 7. Flujo de la Aplicación

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. SUBIR TXT   │────▶│ 2. CONFIGURAR   │────▶│  3. PROCESAR    │────▶│ 4. DESCARGAR    │
│  (drag & drop)  │     │ (RANKINT+%)     │     │  (clasificar)   │     │    EXCEL        │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 8. Observaciones Técnicas

### Fortalezas
- Arquitectura simple sin dependencias complejas
- Procesamiento local (privacidad de datos)
- UI moderna y responsive
- Código bien estructurado y comentado

### Áreas de atención para migración
- Sin tests automatizados
- Sin validación de tipos (no TypeScript)
- Configuración hardcodeada (ciudades, emisoras nacionales)
- Script Python y app JS implementan lógica similar pero separada
- Sin manejo de errores robusto
- Sin versionamiento semántico

### Archivos de datos presentes (ejemplos)
- `NACIONAL UPN.xlsx` - 4.07 MB
- `NACIONAL UPN_CLASIFICADO.xlsx` - 3.89 MB
- `RANKINT ULT TRIMESTRE (18).xlsx` - 58 KB

---

## 9. Contexto de Negocio

**Dominio:** Publicidad y medios en Perú
**Mercado:** 7 ciudades principales del Perú
**Métricas clave:**
- Spots publicitarios
- Cobertura geográfica (NACIONAL vs Local)
- Audiencia en miles
- Ratings (RAT# y RAT%)

---

*Reconocimiento completado por auditor técnico.*
