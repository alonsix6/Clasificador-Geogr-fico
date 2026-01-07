# Análisis Técnico: Clasificador Geográfico de Medios
Fecha: 2026-01-07

---

## 1. Features (Funcionalidades)

### FEATURE: Carga de Archivo TXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Archivo(s):** `app.js:489-587`
**Descripción:** Permite subir archivos TXT delimitados por pipes, con drag & drop o selector de archivos
**Input:** Archivo TXT con formato `columna1|columna2|columna3|...`
**Output:** Array de objetos JS con los datos parseados en `state.data`
**Estado:** ✅ Funcional

---

### FEATURE: Carga de Archivos RANKINT (Excel)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Archivo(s):** `app.js:244-425`
**Descripción:** Carga múltiples archivos Excel con ratings por zona (Norte/Sur)
**Input:** Archivos .xlsx/.xls con columnas: Año, Mes, Canal, Programa, Rat#, Rat%
**Output:** Arrays en `state.rankintDataCombined.norte` y `.sur`
**Estado:** ✅ Funcional

---

### FEATURE: Configuración de Ámbito y Audiencia
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Archivo(s):** `app.js:182-239`
**Descripción:** Permite configurar ámbito (Nacional/Regiones/Lima), audiencia en miles y porcentajes por ciudad
**Input:** Selección de radio buttons e inputs numéricos
**Output:** Objeto `state.config` actualizado
**Estado:** ✅ Funcional

---

### FEATURE: Clasificación Geográfica
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Archivo(s):** `app.js:657-831` (JS), `clasificar_geografico.py:7-85` (Python)
**Descripción:** Clasifica registros como NACIONAL o por ciudad según distribución geográfica
**Input:** Datos parseados + configuración
**Output:** Array `state.processedData` con columna `CLASIFICACION_GEOGRAFICA`
**Estado:** ✅ Funcional

---

### FEATURE: Cálculo de Valor de Audiencia
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Archivo(s):** `app.js:698-717`
**Descripción:** Calcula valor monetario basado en spots × audiencia × porcentaje
**Input:** SPOTS, audiencia en miles, porcentaje por ciudad
**Output:** Campo `VALOR_CALCULADO` por registro
**Estado:** ✅ Funcional

---

### FEATURE: Generación de Tabla Dinámica (Pivot)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Archivo(s):** `app.js:924-995`
**Descripción:** Crea resumen agregado por Año/Mes/Emisora/Programa/Zona/Ciudad
**Input:** Datos procesados
**Output:** Hoja adicional en Excel de salida
**Estado:** ✅ Funcional

---

### FEATURE: Descarga de Excel Clasificado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Archivo(s):** `app.js:895-922`
**Descripción:** Genera archivo .xlsx con datos clasificados y tabla dinámica
**Input:** `state.processedData` + pivot table
**Output:** Archivo `{nombre}_CLASIFICADO.xlsx`
**Estado:** ✅ Funcional

---

### FEATURE: Visualización de Estadísticas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Archivo(s):** `app.js:850-890`
**Descripción:** Muestra totales, grupos y gráfico de distribución
**Input:** `state.stats`
**Output:** Cards con métricas y gráfico de barras horizontal
**Estado:** ✅ Funcional

---

## 2. Lógica de Negocio Crítica

### ════════════════════════════════════════════
### CONSTANTES GLOBALES
### ARCHIVO: app.js:7-57
### ════════════════════════════════════════════

```javascript
// Las 7 ciudades requeridas para clasificar como NACIONAL
const CIUDADES_NACIONAL = new Set([
    'LIMA', 'TRUJILLO', 'AREQUIPA', 'CUSCO', 'CHICLAYO', 'HUANCAYO', 'PIURA'
]);

// Ciudades del Norte
const CIUDADES_NORTE = new Set(['CHICLAYO', 'TRUJILLO', 'PIURA']);

// Ciudades del Sur
const CIUDADES_SUR = new Set(['AREQUIPA', 'CUSCO', 'HUANCAYO']);

// Emisoras que automáticamente son NACIONAL
const EMISORAS_NACIONAL = new Set([
    'ATV+',
    'NATIVA TV',
    'RPP TV',
    'WILLAX PERU'
]);

// Estado inicial de configuración
config: {
    ambito: 'regiones',
    audienciaNorte: 0,
    audienciaSur: 0,
    porcentajes: {
        CHICLAYO: 33.33,
        TRUJILLO: 33.33,
        PIURA: 33.34,
        AREQUIPA: 33.33,
        CUSCO: 33.33,
        HUANCAYO: 33.34
    }
}
```

**PYTHON equivalente (clasificar_geografico.py:5):**
```python
CIUDADES_NACIONAL = {'LIMA', 'TRUJILLO', 'AREQUIPA', 'CUSCO', 'CHICLAYO', 'HUANCAYO', 'PIURA'}
```

---

### ════════════════════════════════════════════
### FUNCIÓN: parseTxtContent()
### ARCHIVO: app.js:541-587
### ════════════════════════════════════════════

**QUÉ HACE:**
Parsea el contenido de un archivo TXT delimitado por pipes. Detecta líneas de metadatos, encuentra la fila de encabezados, y convierte cada línea de datos en un objeto.

**PARÁMETROS:**
- `content`: String - contenido crudo del archivo TXT

**RETORNA:**
```javascript
{ columns: string[], data: object[] }
```

**ALGORITMO:**
1. Dividir contenido por saltos de línea
2. Iterar cada línea, omitiendo vacías
3. Saltar líneas de metadatos (Periodo:, Tarifa, Tipos de Avisos:, Targets:)
4. Detectar línea de encabezado (empieza con `#|` o `N°|` o contiene `|MEDIO|`)
5. Para líneas de datos: dividir por `|`, crear objeto con columnas como keys
6. Validar que tenga suficientes valores

**CÓDIGO CLAVE:**
```javascript
function parseTxtContent(content) {
    const lines = content.split('\n');
    let columns = [];
    const data = [];
    let headerFound = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines
        if (!line) continue;

        // Skip metadata lines (Periodo:, Tarifa, Tipos, Targets, etc.)
        if (line.startsWith('Periodo:') ||
            line.startsWith('Tarifa') ||
            line.startsWith('Tipos de Avisos:') ||
            line.startsWith('Targets:')) {
            continue;
        }

        // Check if this is the header line (starts with #|)
        if (line.startsWith('#|') || line.startsWith('N°|') || (line.includes('|MEDIO|') && !headerFound)) {
            columns = line.split('|').map(col => col.trim()).filter(col => col);
            headerFound = true;
            continue;
        }

        // If we haven't found header yet, skip
        if (!headerFound) continue;

        // Parse data line
        const values = line.split('|').map(val => val.trim());

        // Skip if not enough values
        if (values.length < columns.length - 1) continue;

        // Create row object
        const row = {};
        columns.forEach((col, index) => {
            row[col] = values[index] || '';
        });

        data.push(row);
    }

    return { columns, data };
}
```

---

### ════════════════════════════════════════════
### FUNCIÓN: parseRankintZoneData()
### ARCHIVO: app.js:300-368
### ════════════════════════════════════════════

**QUÉ HACE:**
Parsea datos de archivos RANKINT (Excel con ratings). Detecta si tiene formato de una zona o combinado (Norte+Sur).

**PARÁMETROS:**
- `jsonData`: array[] - datos del Excel convertidos a JSON
- `zona`: string - 'norte' o 'sur'

**RETORNA:**
```javascript
[{ año, mes, canal, programa, ratNum, ratPct }, ...]
```

**ALGORITMO:**
1. Buscar fila de encabezado (contiene AÑO, MES, CANAL)
2. Detectar si tiene columnas de ambas zonas (NORTE y SUR)
3. Empezar a parsear desde fila después del header (o fila 5 por defecto)
4. Saltar filas de totales
5. Extraer rating según formato detectado

**CÓDIGO CLAVE:**
```javascript
function parseRankintZoneData(jsonData, zona) {
    const ratings = [];
    let headerRowIndex = -1;
    let hasBothZones = false;

    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (!row) continue;

        const rowStr = row.join('|').toUpperCase();

        // Check if it has both Norte and Sur columns
        if (rowStr.includes('NORTE') && rowStr.includes('SUR')) {
            hasBothZones = true;
        }

        // Find header row with Año, Mes, Canal
        if (rowStr.includes('AÑO') || rowStr.includes('MES') || rowStr.includes('CANAL')) {
            headerRowIndex = i;
            break;
        }
    }

    const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 5;

    for (let i = startRow; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 4) continue;

        const firstCell = String(row[0] || '').toUpperCase();
        if (firstCell.includes('TOTAL')) continue;

        if (hasBothZones) {
            // Combined format: Año, Mes, Canal, Programa, NorteRat#, NorteRat%, SurRat#, SurRat%
            const entry = {
                año: row[0],
                mes: String(row[1] || '').toUpperCase().trim(),
                canal: String(row[2] || '').toUpperCase().trim(),
                programa: String(row[3] || '').toUpperCase().trim(),
                ratNum: zona === 'norte' ? (parseFloat(row[4]) || 0) : (parseFloat(row[6]) || 0),
                ratPct: zona === 'norte' ? (parseFloat(row[5]) || 0) : (parseFloat(row[7]) || 0)
            };
            if (entry.canal || entry.programa) {
                ratings.push(entry);
            }
        } else {
            // Single zone format: Año, Mes, Canal, Programa, Rat#, Rat%
            const entry = {
                año: row[0],
                mes: String(row[1] || '').toUpperCase().trim(),
                canal: String(row[2] || '').toUpperCase().trim(),
                programa: String(row[3] || '').toUpperCase().trim(),
                ratNum: parseFloat(row[4]) || 0,
                ratPct: parseFloat(row[5]) || 0
            };
            if (entry.canal || entry.programa) {
                ratings.push(entry);
            }
        }
    }

    return ratings;
}
```

---

### ════════════════════════════════════════════
### FUNCIÓN: processFile() - MOTOR PRINCIPAL
### ARCHIVO: app.js:657-831
### ════════════════════════════════════════════

**QUÉ HACE:**
Función principal que ejecuta todo el proceso de clasificación geográfica.

**PARÁMETROS:** Ninguno (usa `state` global)

**RETORNA:** void (actualiza `state.processedData` y `state.stats`)

**ALGORITMO:**
1. Detectar nombres de columnas dinámicamente
2. **PASO 1:** Primera pasada - marcar emisoras automáticamente NACIONAL
3. **PASO 1.5:** Calcular zona, audiencia y valor calculado por registro
4. **PASO 2:** Crear grupos por combinación DIA+MEDIO+EMISORA+VERSION
5. **PASO 3:** Para cada grupo, verificar si tiene las 7 ciudades
6. **PASO 3.1:** Si tiene 7 ciudades: calcular mínimo común, asignar NACIONAL
7. **PASO 4:** Calcular estadísticas finales

**CÓDIGO CLAVE - DETECCIÓN DE COLUMNAS:**
```javascript
const colMedio = state.columns.find(c => c.toUpperCase() === 'MEDIO') || 'MEDIO';
const colDia = state.columns.find(c => c.toUpperCase() === 'DIA') || 'DIA';
const colEmisora = state.columns.find(c => c.includes('EMISORA') || c.includes('SITE')) || 'EMISORA/SITE';
const colVersion = state.columns.find(c => c.toUpperCase() === 'VERSION') || 'VERSION';
const colRegion = state.columns.find(c => c.includes('REGION') || c.includes('ÁMBITO') || c.includes('AMBITO')) || 'REGION/ÁMBITO';
const colPrograma = state.columns.find(c => c.includes('PROGRAMA') || c.includes('TIPO')) || 'PROGRAMA/TIPO DE SITE';
const colSpots = state.columns.find(c => c.toUpperCase().includes('SPOT')) || 'SPOTS';
```

**CÓDIGO CLAVE - CLASIFICACIÓN INICIAL Y CÁLCULO DE VALOR:**
```javascript
state.processedData = state.data.map(row => {
    const emisora = (row[colEmisora] || '').toUpperCase().trim();
    const isEmisoraNacional = EMISORAS_NACIONAL.has(emisora);
    const regionRaw = (row[colRegion] || '').toUpperCase().trim();
    const region = normalizeRegion(regionRaw);

    // Determine zona (NORTE o SUR)
    let zona = '';
    if (CIUDADES_NORTE.has(region)) {
        zona = 'NORTE';
    } else if (CIUDADES_SUR.has(region)) {
        zona = 'SUR';
    }

    // Calculate audiencia value based on config
    let audienciaMiles = 0;
    let porcentajeCiudad = 0;
    let valorCalculado = 0;

    if (state.config.ambito === 'regiones' && zona) {
        if (zona === 'NORTE') {
            audienciaMiles = state.config.audienciaNorte;
            porcentajeCiudad = state.config.porcentajes[region] || 0;
        } else if (zona === 'SUR') {
            audienciaMiles = state.config.audienciaSur;
            porcentajeCiudad = state.config.porcentajes[region] || 0;
        }

        // Get spots value
        const spots = parseFloat(row[colSpots]) || 0;

        // Calculate: SPOTS × audiencia_en_miles × (porcentaje/100)
        valorCalculado = spots * audienciaMiles * (porcentajeCiudad / 100);
    }

    return {
        ...row,
        'CLASIFICACION_GEOGRAFICA': isEmisoraNacional ? 'NACIONAL' : region,
        'ZONA': zona,
        'AUDIENCIA_MILES': audienciaMiles,
        'PCT_CIUDAD': porcentajeCiudad,
        'VALOR_CALCULADO': valorCalculado
    };
});
```

**CÓDIGO CLAVE - CREACIÓN DE GRUPOS:**
```javascript
const groups = new Map();

state.processedData.forEach((row, index) => {
    // Skip if already marked as NACIONAL due to emisora
    const emisora = (row[colEmisora] || '').toUpperCase().trim();
    if (EMISORAS_NACIONAL.has(emisora)) return;

    const key = createGroupKey(row, colDia, colMedio, colEmisora, colVersion);
    const region = normalizeRegion(row[colRegion]);

    if (!groups.has(key)) {
        groups.set(key, { regions: new Map(), rows: [] });
    }

    const group = groups.get(key);
    group.rows.push(index);
    group.regions.set(region, (group.regions.get(region) || 0) + 1);
});
```

**CÓDIGO CLAVE - CLASIFICACIÓN POR DISTRIBUCIÓN GEOGRÁFICA:**
```javascript
groups.forEach((group, key) => {
    const regionsPresent = new Set(group.regions.keys());

    // Check if all 7 cities are present
    const hasAllCities = [...CIUDADES_NACIONAL].every(city => regionsPresent.has(city));

    if (hasAllCities && regionsPresent.size >= 7) {
        // Calculate minimum common count
        let minCount = Infinity;
        CIUDADES_NACIONAL.forEach(city => {
            const count = group.regions.get(city) || 0;
            if (count < minCount) minCount = count;
        });

        nationalGroups++;

        // Track how many we've assigned as NACIONAL per region
        const assignedNacional = new Map();
        CIUDADES_NACIONAL.forEach(city => assignedNacional.set(city, 0));

        // Assign classifications
        group.rows.forEach(rowIndex => {
            const region = normalizeRegion(state.data[rowIndex][colRegion]);

            if (CIUDADES_NACIONAL.has(region)) {
                const assigned = assignedNacional.get(region);

                if (assigned < minCount) {
                    state.processedData[rowIndex]['CLASIFICACION_GEOGRAFICA'] = 'NACIONAL';
                    assignedNacional.set(region, assigned + 1);
                } else {
                    state.processedData[rowIndex]['CLASIFICACION_GEOGRAFICA'] = region;
                }
            }
        });
    }
});
```

---

### ════════════════════════════════════════════
### FUNCIÓN: clasificar_geografico() - VERSIÓN PYTHON
### ARCHIVO: clasificar_geografico.py:7-85
### ════════════════════════════════════════════

**QUÉ HACE:**
Versión Python del clasificador (script standalone). Hace lo mismo pero sin cálculo de audiencia.

**PARÁMETROS:**
- `input_file`: str - ruta al archivo Excel de entrada
- `output_file`: str (opcional) - ruta de salida, por defecto agrega `_CLASIFICADO`

**RETORNA:**
DataFrame de pandas con columna `CLASIFICACION_GEOGRAFICA`

**ALGORITMO:**
1. Leer Excel con pandas
2. Inicializar clasificación con la región original
3. Crear grupos por DIA+MEDIO+EMISORA/SITE+VERSION usando ngroup()
4. Para cada grupo: contar registros por región
5. Si tiene exactamente las 7 ciudades: calcular mínimo común
6. Asignar NACIONAL a los primeros N de cada ciudad (N = mínimo común)

**CÓDIGO CLAVE:**
```python
def clasificar_geografico(input_file, output_file=None):
    # Leer Excel
    df = pd.read_excel(input_file)

    # Columnas de agrupación
    cols_grupo = ['DIA', 'MEDIO', 'EMISORA/SITE', 'VERSION']
    col_region = 'REGION/ÁMBITO'

    # Crear columna de clasificación inicializada con la región original
    df['CLASIFICACION_GEOGRAFICA'] = df[col_region].copy()

    # Crear identificador de grupo
    df['_grupo_id'] = df.groupby(cols_grupo).ngroup()

    # Para cada grupo, calcular estadísticas
    grupos = df.groupby('_grupo_id')

    for grupo_id, grupo_df in grupos:
        conteo_regiones = grupo_df[col_region].value_counts().to_dict()
        regiones_presentes = set(conteo_regiones.keys())

        # Verificar si están las 7 ciudades
        if regiones_presentes == CIUDADES_NACIONAL:
            minimo_comun = min(conteo_regiones.values())

            for region in CIUDADES_NACIONAL:
                mask = (df['_grupo_id'] == grupo_id) & (df[col_region] == region)
                indices = df[mask].index.tolist()

                for i, idx in enumerate(indices):
                    if i < minimo_comun:
                        df.loc[idx, 'CLASIFICACION_GEOGRAFICA'] = 'NACIONAL'

    df.drop('_grupo_id', axis=1, inplace=True)
    df.to_excel(output_file, index=False)
    return df
```

---

### ════════════════════════════════════════════
### FUNCIÓN: createGroupKey()
### ARCHIVO: app.js:833-835
### ════════════════════════════════════════════

**QUÉ HACE:**
Genera la clave única que identifica un grupo de registros.

**CÓDIGO CLAVE:**
```javascript
function createGroupKey(row, colDia, colMedio, colEmisora, colVersion) {
    return `${row[colDia]}|${row[colMedio]}|${row[colEmisora]}|${row[colVersion]}`;
}
```

**FÓRMULA DE AGRUPACIÓN:**
```
CLAVE_GRUPO = DIA + "|" + MEDIO + "|" + EMISORA/SITE + "|" + VERSION
```

---

### ════════════════════════════════════════════
### FUNCIÓN: findRating()
### ARCHIVO: app.js:427-457
### ════════════════════════════════════════════

**QUÉ HACE:**
Busca el rating de un programa/canal en los datos RANKINT cargados.

**PARÁMETROS:**
- `canal`: string - nombre del canal
- `programa`: string - nombre del programa
- `mes`: string - mes a buscar
- `zona`: string - 'norte' o 'sur'

**RETORNA:**
```javascript
{ ratNum: number, ratPct: number } | null
```

**ALGORITMO:**
1. Normalizar strings a mayúsculas
2. Intentar match exacto: canal + primeros 10 chars de programa + mes
3. Si no hay match: intentar match parcial con primeros 5 chars

**CÓDIGO CLAVE:**
```javascript
function findRating(canal, programa, mes, zona) {
    const data = state.rankintDataCombined[zona.toLowerCase()];
    if (!data || data.length === 0) {
        return null;
    }

    const canalNorm = String(canal).toUpperCase().trim();
    const programaNorm = String(programa).toUpperCase().trim();
    const mesNorm = String(mes).toUpperCase().trim();

    // Try exact match first
    let match = data.find(r =>
        r.canal === canalNorm &&
        r.programa.includes(programaNorm.substring(0, 10)) &&
        r.mes === mesNorm
    );

    // If no exact match, try partial match on programa
    if (!match) {
        match = data.find(r =>
            r.canal === canalNorm &&
            (r.programa.includes(programaNorm.substring(0, 5)) || programaNorm.includes(r.programa.substring(0, 5)))
        );
    }

    if (match) {
        return { ratNum: match.ratNum, ratPct: match.ratPct };
    }

    return null;
}
```

---

### ════════════════════════════════════════════
### FUNCIÓN: createPivotTable()
### ARCHIVO: app.js:924-995
### ════════════════════════════════════════════

**QUÉ HACE:**
Genera una tabla dinámica agregando datos por Año/Mes/Emisora/Programa/Zona/Ciudad.

**RETORNA:**
Array de objetos con campos: AÑO, MES, EMISORA/SITE, PROGRAMA/TIPO DE SITE, ZONA, CIUDAD, SUMA_SPOTS, VALOR_AUDIENCIA

**CÓDIGO CLAVE - EXTRACCIÓN DE FECHA:**
```javascript
// Extract year and month from DIA column (format: DD/MM/YYYY or similar)
const diaValue = row[colDia] || '';
let año = '';
let mes = '';

if (diaValue) {
    const parts = diaValue.split('/');
    if (parts.length >= 3) {
        año = parts[2];
        mes = getMonthName(parseInt(parts[1]));
    }
}
```

**CÓDIGO CLAVE - AGREGACIÓN:**
```javascript
const key = `${año}|${mes}|${emisora}|${programa}|${zona}|${ciudad}`;

if (!pivotMap.has(key)) {
    pivotMap.set(key, {
        'AÑO': año,
        'MES': mes,
        'EMISORA/SITE': emisora,
        'PROGRAMA/TIPO DE SITE': programa,
        'ZONA': zona,
        'CIUDAD': ciudad,
        'SUMA_SPOTS': 0,
        'VALOR_AUDIENCIA': 0
    });
}

const entry = pivotMap.get(key);
entry['SUMA_SPOTS'] += spots;
entry['VALOR_AUDIENCIA'] += valorCalculado;
```

---

### ════════════════════════════════════════════
### FUNCIÓN: updatePorcentajes()
### ARCHIVO: app.js:199-239
### ════════════════════════════════════════════

**QUÉ HACE:**
Valida que los porcentajes por zona sumen 100% y actualiza el estado.

**CÓDIGO CLAVE - VALIDACIÓN:**
```javascript
// Calculate totals
const totalNorte = pctChiclayo + pctTrujillo + pctPiura;
const totalSur = pctArequipa + pctCusco + pctHuancayo;

// Apply validation classes
const norteValid = Math.abs(totalNorte - 100) < 0.1;
const surValid = Math.abs(totalSur - 100) < 0.1;
```

**TOLERANCIA DE VALIDACIÓN:** 0.1% (permite 99.9% a 100.1%)

---

## 3. Endpoints / Rutas

**NO APLICA** - Esta es una aplicación 100% client-side sin backend.

Todas las operaciones se ejecutan en el navegador del usuario.

---

## 4. Procesamiento de Datos

### 4.1 Archivos que procesa

| Tipo | Formato | Propósito |
|------|---------|-----------|
| **Pauta publicitaria** | TXT (pipe-delimited) | Datos principales a clasificar |
| **RANKINT** | Excel (.xlsx/.xls) | Ratings por zona |

### 4.2 Columnas esperadas en archivo TXT de pauta

```
COLUMNAS OBLIGATORIAS:
├── # (o N°)         → Número de fila
├── DIA              → Fecha (DD/MM/YYYY)
├── MEDIO            → Tipo de medio (TV, CABLE, RADIO)
├── EMISORA/SITE     → Canal o emisora
├── VERSION          → Versión del spot
├── REGION/ÁMBITO    → Ciudad de emisión
└── SPOTS            → Cantidad de spots (para cálculo de audiencia)

COLUMNAS OPCIONALES:
├── MARCA
├── PRODUCTO
├── PROGRAMA/TIPO DE SITE
├── CORTE LOCAL
├── RUC
└── ... (otras)
```

### 4.3 Columnas esperadas en archivo RANKINT

```
FORMATO ZONA ÚNICA:
├── Año
├── Mes
├── Canal
├── Programa
├── Rat# (rating numérico)
└── Rat% (rating porcentual)

FORMATO COMBINADO:
├── Año
├── Mes
├── Canal
├── Programa
├── NorteRat#
├── NorteRat%
├── SurRat#
└── SurRat%
```

### 4.4 Transformaciones Aplicadas

| Transformación | Ubicación | Descripción |
|---------------|-----------|-------------|
| Normalización de región | `normalizeRegion()` | `.toUpperCase().trim()` |
| Normalización de emisora | `processFile():685-686` | `.toUpperCase().trim()` |
| Parseo de fecha | `createPivotTable():941-947` | `split('/')` para extraer día/mes/año |
| Conversión a número | múltiples | `parseFloat(value) \|\| 0` |

### 4.5 Validaciones

| Validación | Ubicación | Regla |
|------------|-----------|-------|
| Tipo de archivo | `processUploadedFile():491-496` | Extensión debe ser `.txt` |
| Archivo no vacío | `readTxtFile():518-521` | `data.length > 0` |
| Suficientes valores | `parseTxtContent():575` | `values.length >= columns.length - 1` |
| Porcentajes suman 100% | `updatePorcentajes():217-218` | `Math.abs(total - 100) < 0.1` |
| Fila no es Total | `parseRankintZoneData():334-335` | No contiene 'TOTAL' |

### 4.6 Fórmulas y Cálculos

#### FÓRMULA: Valor Calculado de Audiencia
**CONTEXTO:** Cálculo del valor monetario por registro (solo si ámbito = 'regiones')
**ARCHIVO:** `app.js:715-716`

```javascript
valorCalculado = spots * audienciaMiles * (porcentajeCiudad / 100);
```

**Donde:**
- `spots` = valor numérico de la columna SPOTS
- `audienciaMiles` = audiencia ingresada para la zona (Norte o Sur) en miles
- `porcentajeCiudad` = porcentaje configurado para la ciudad específica

---

#### FÓRMULA: Clave de Grupo
**CONTEXTO:** Identificación única de un grupo para clasificación
**ARCHIVO:** `app.js:834`

```javascript
key = `${row[colDia]}|${row[colMedio]}|${row[colEmisora]}|${row[colVersion]}`;
```

---

#### FÓRMULA: Mínimo Común para NACIONAL
**CONTEXTO:** Determinar cuántos registros de cada ciudad se marcan como NACIONAL
**ARCHIVO:** `app.js:766-771`

```javascript
let minCount = Infinity;
CIUDADES_NACIONAL.forEach(city => {
    const count = group.regions.get(city) || 0;
    if (count < minCount) minCount = count;
});
```

**Ejemplo:**
```
LIMA: 6, AREQUIPA: 4, TRUJILLO: 4, CUSCO: 4, CHICLAYO: 4, HUANCAYO: 4, PIURA: 4
minCount = 4
→ 4 registros de CADA ciudad = 28 NACIONAL
→ 2 excedentes de LIMA = 2 LIMA
```

---

#### FÓRMULA: Porcentaje de Distribución
**CONTEXTO:** Gráfico de barras de resultados
**ARCHIVO:** `app.js:874`

```javascript
const percent = (count / total) * 100;
```

---

#### FÓRMULA: Validación de Porcentajes
**CONTEXTO:** Verificar que porcentajes por zona sumen 100%
**ARCHIVO:** `app.js:217-218`

```javascript
const norteValid = Math.abs(totalNorte - 100) < 0.1;
const surValid = Math.abs(totalSur - 100) < 0.1;
```

---

## 5. Problemas Detectados (Code Smells)

### 🔴 CRÍTICO

**1. Estado global mutable**
```
Ubicación: app.js:29-57
Problema: El objeto `state` es global y mutable, lo que puede causar bugs difíciles de rastrear
Fix: Usar un patrón de gestión de estado (Redux-like) o encapsular en una clase
```

**2. Sin sanitización de inputs HTML**
```
Ubicación: app.js:388-402, app.js:615-627
Problema: Se usa innerHTML con datos del usuario sin sanitizar (XSS potencial)
Fix: Usar textContent donde sea posible o sanitizar con DOMPurify
```

**3. Función findRating() nunca se usa**
```
Ubicación: app.js:427-457
Problema: La función está definida pero no se llama desde ningún lugar
Fix: Remover código muerto o implementar donde corresponda
```

---

### 🟡 MODERADO

**4. Función processFile() muy larga (174 líneas)**
```
Ubicación: app.js:657-831
Problema: Función con demasiadas responsabilidades, difícil de testear y mantener
Fix: Dividir en funciones más pequeñas: prepareData(), createGroups(), classifyGroups(), calculateStats()
```

**5. console.log en producción**
```
Ubicación: app.js:289
Problema: console.log('RANKINT ${zona} file loaded:', ...) queda en producción
Fix: Remover o usar un logger condicional
```

**6. Valores hardcodeados sin constantes**
```
Ubicación: app.js:327 (startRow = 5), app.js:440 (substring(0, 10)), app.js:448 (substring(0, 5))
Problema: Números mágicos sin explicación
Fix: Extraer a constantes con nombres descriptivos
```

**7. Lógica duplicada entre JS y Python**
```
Ubicación: app.js vs clasificar_geografico.py
Problema: Dos implementaciones de la misma lógica que pueden divergir
Fix: Elegir una sola implementación o generar una desde la otra
```

**8. Diferencia de comportamiento JS vs Python**
```
Ubicación: app.js:48 vs clasificar_geografico.py:48
Problema: JS usa `regiones_presentes == CIUDADES_NACIONAL` (subset)
          Python usa `regiones_presentes == CIUDADES_NACIONAL` (igualdad exacta)
Fix: Alinear el comportamiento - decidir si se permiten más de 7 ciudades
```

**9. Sin manejo de errores específicos**
```
Ubicación: app.js:824-830
Problema: Catch genérico que solo muestra alert con error.message
Fix: Implementar manejo de errores específicos con mensajes amigables
```

**10. Lima no está en ninguna zona**
```
Ubicación: app.js:7-15
Problema: LIMA está en CIUDADES_NACIONAL pero no en CIUDADES_NORTE ni CIUDADES_SUR
          Cuando región es LIMA, zona queda vacía y no se calcula valorCalculado
Fix: Definir si LIMA tiene tratamiento especial o crear CIUDADES_LIMA
```

---

### 🟢 MENOR

**11. Inconsistencia en nombres de columnas**
```
Ubicación: app.js:663-665
Problema: Busca 'REGION' o 'ÁMBITO' o 'AMBITO' (con/sin tilde)
Fix: Normalizar siempre quitando tildes antes de comparar
```

**12. No se resetean archivos RANKINT al cargar nuevo archivo principal**
```
Ubicación: app.js:633-643
Problema: resetUpload() no limpia state.rankintFiles
Fix: Agregar limpieza de RANKINT en reset o preguntar al usuario
```

**13. Funciones de utilidad mezcladas con lógica de negocio**
```
Ubicación: app.js:1017-1027
Problema: formatFileSize() y formatNumber() están al final del archivo
Fix: Extraer utilidades a módulo separado
```

**14. Nombres de variables en español e inglés mezclados**
```
Ubicación: múltiples
Problema: `año`, `mes`, `grupos`, `colEmisora` vs `nationalGroups`, `processedData`
Fix: Elegir un idioma y ser consistente
```

**15. CSS con valores duplicados**
```
Ubicación: styles.css:1052-1064, styles.css:1072-1140
Problema: Dos bloques @media (max-width: 768px) separados
Fix: Consolidar media queries
```

---

## 6. Casos Edge

### CASO EDGE: Emisora es NACIONAL automáticamente
```
Qué lo causa: EMISORA/SITE es 'ATV+', 'NATIVA TV', 'RPP TV', o 'WILLAX PERU'
Cómo se maneja: Se marca NACIONAL inmediatamente, se salta del análisis de grupos
Código: app.js:686, app.js:737-738
```

### CASO EDGE: Grupo tiene exactamente 7 ciudades con cantidades iguales
```
Qué lo causa: Cada ciudad tiene el mismo número de registros (ej: 4 cada una)
Cómo se maneja: Todos se clasifican como NACIONAL (minCount = cantidad de cada uno)
Código: app.js:765-794
```

### CASO EDGE: Grupo tiene más de 7 regiones
```
Qué lo causa: Aparece una región adicional (ej: "LIMA METROPOLITANA" además de "LIMA")
Cómo se maneja: JS: Si tiene las 7 ciudades requeridas Y más de 7, procesa como NACIONAL
                Python: Requiere EXACTAMENTE las 7 ciudades
Código: app.js:765 (hasAllCities && regionsPresent.size >= 7)
```

### CASO EDGE: Archivo con solo metadatos
```
Qué lo causa: Archivo TXT que no tiene líneas de datos después del header
Cómo se maneja: Muestra alert "El archivo está vacío o no tiene datos válidos"
Código: app.js:518-521
```

### CASO EDGE: Porcentajes no suman 100%
```
Qué lo causa: Usuario ingresa valores que suman != 100 por zona
Cómo se maneja: Muestra warning visual, pero NO bloquea el procesamiento
Código: app.js:224-228
NOTA: El procesamiento continúa con valores incorrectos - debería bloquearse
```

### CASO EDGE: Región no reconocida
```
Qué lo causa: REGION/ÁMBITO contiene valor no estándar (ej: "CALLAO", "ICA")
Cómo se maneja: zona queda vacía (''), no se calcula audiencia, clasificación = la región original
Código: app.js:691-696, app.js:703
```

### CASO EDGE: Columna SPOTS vacía o no numérica
```
Qué lo causa: Campo SPOTS con texto o vacío
Cómo se maneja: parseFloat retorna NaN, se convierte a 0 con || 0
Código: app.js:713
```

### CASO EDGE: Fecha con formato inesperado
```
Qué lo causa: Columna DIA con formato diferente a DD/MM/YYYY
Cómo se maneja: año y mes quedan vacíos (''), aparecen así en pivot table
Código: app.js:941-947
```

### CASO EDGE: Archivo RANKINT sin header reconocible
```
Qué lo causa: Excel sin fila que contenga 'AÑO', 'MES', o 'CANAL'
Cómo se maneja: Usa fila 5 como inicio de datos (hardcodeado)
Código: app.js:327
```

### CASO EDGE: Match de programa por substring
```
Qué lo causa: Nombre de programa en pauta no coincide exactamente con RANKINT
Cómo se maneja: Intenta match parcial con primeros 5 caracteres
Código: app.js:444-450
NOTA: Puede generar falsos positivos
```

---

## 7. Resumen de Deuda Técnica

| Categoría | Cantidad | Impacto |
|-----------|----------|---------|
| Críticos | 3 | Alto - Seguridad y mantenibilidad |
| Moderados | 7 | Medio - Bugs potenciales y confusión |
| Menores | 5 | Bajo - Calidad de código |

### Prioridades para Migración:

1. **P0:** Eliminar código muerto (`findRating`)
2. **P0:** Decidir sobre duplicación JS/Python
3. **P1:** Refactorizar `processFile()` en funciones pequeñas
4. **P1:** Alinear comportamiento JS vs Python (>7 ciudades)
5. **P1:** Decidir qué hacer con LIMA (¿zona especial?)
6. **P2:** Sanitizar inputs HTML
7. **P2:** Bloquear procesamiento si porcentajes != 100%
8. **P3:** Extraer constantes mágicas
9. **P3:** Consolidar estilos CSS

---

*Análisis técnico completado por auditor.*
