# Migración: Clasificador Geográfico → SiReset

> **Documento autocontenido para migración completa**
> Generado: 2026-01-07
> Fuente: Repositorio `Clasificador-Geográfico`

---

## 1. Resumen Ejecutivo

### Clasificador Geográfico de Medios

**Propósito:** Clasificar registros de pauta publicitaria en TV/medios peruanos como NACIONAL (cobertura en 7 ciudades) o por ciudad específica, con cálculo de audiencia.

**Usuarios:** Media planners, analistas de publicidad, equipos de marketing

**Complejidad:** Media-Alta (lógica de agrupación + múltiples inputs + cálculos)

**Tiempo estimado:** 4-5 días

### Funcionalidades a Migrar

| # | Feature | Prioridad | Complejidad |
|---|---------|-----------|-------------|
| 1 | Carga y parseo de archivo TXT (pipe-delimited) | P0 | Media |
| 2 | Carga múltiple de archivos RANKINT (Excel) | P1 | Media |
| 3 | Configuración de ámbito (Nacional/Regiones/Lima) | P1 | Baja |
| 4 | Configuración de audiencia y porcentajes por ciudad | P1 | Baja |
| 5 | **Motor de clasificación geográfica** | P0 | Alta |
| 6 | Cálculo de valor de audiencia | P1 | Baja |
| 7 | Generación de tabla dinámica (pivot) | P2 | Media |
| 8 | Exportación a Excel clasificado | P0 | Baja |
| 9 | Visualización de estadísticas y gráfico | P2 | Baja |

### Métricas del Código Legacy

| Métrica | Valor |
|---------|-------|
| Líneas JS | 1,032 |
| Líneas Python | 89 |
| Líneas CSS | 1,146 |
| Funciones críticas | 9 |
| Code smells detectados | 15 |

---

## 2. Arquitectura Propuesta en SiReset

### Backend (FastAPI)

```
backend/app/
├── api/routes/
│   └── clasificador_geografico.py    # Endpoints REST
├── processors/
│   └── clasificador_geografico_processor.py  # Lógica de clasificación
├── schemas/
│   └── clasificador_geografico.py    # Pydantic models
└── utils/
    └── excel_utils.py                # Utilidades Excel (si no existe)
```

### Frontend (React + Tailwind)

```
frontend/src/
├── pages/
│   └── ClasificadorGeografico.jsx    # Página principal
└── components/
    └── ClasificadorGeografico/
        ├── FileUpload.jsx            # Drop zone TXT
        ├── RankintUpload.jsx         # Upload Excel por zona
        ├── ConfigPanel.jsx           # Ámbito + audiencia + %
        ├── DataPreview.jsx           # Tabla de previsualización
        ├── ProcessingProgress.jsx    # Barra de progreso
        ├── ResultsStats.jsx          # Cards de estadísticas
        ├── DistributionChart.jsx     # Gráfico de barras
        └── index.js                  # Exports
```

### Flujo de Datos

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   FastAPI   │────▶│  Processor  │────▶│   Response  │
│  (React)    │     │  /api/cg/*  │     │  (Python)   │     │  (Excel)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     │                    │                   │
     │ multipart/form    │ Pydantic         │ pandas
     │ (TXT + Excel)     │ validation       │ processing
     └────────────────────┴───────────────────┘
```

---

## 3. Mapeo Legacy → SiReset

### Backend

| Legacy | SiReset | Cambios |
|--------|---------|---------|
| `app.js:parseTxtContent()` | `processors/clasificador_geografico_processor.py:parse_txt_content()` | Migrar a Python, usar pandas |
| `app.js:parseRankintZoneData()` | `processors/clasificador_geografico_processor.py:parse_rankint_data()` | Migrar a Python, usar openpyxl |
| `app.js:processFile()` | `processors/clasificador_geografico_processor.py:clasificar_geografico()` | Refactorizar en funciones pequeñas |
| `app.js:createPivotTable()` | `processors/clasificador_geografico_processor.py:create_pivot_table()` | Usar pandas pivot_table |
| `clasificar_geografico.py` | `processors/clasificador_geografico_processor.py` | Consolidar con lógica JS |
| Estado global `state` | Parámetros de función + Pydantic | Eliminar estado mutable |

### Frontend

| Legacy | SiReset | Cambios |
|--------|---------|---------|
| `index.html` (upload section) | `components/FileUpload.jsx` | Tailwind + diseño Reset |
| `index.html` (config section) | `components/ConfigPanel.jsx` | Tailwind + diseño Reset |
| `index.html` (preview section) | `components/DataPreview.jsx` | Tailwind + diseño Reset |
| `index.html` (results section) | `components/ResultsStats.jsx` | Tailwind + diseño Reset |
| `app.js:showPreview()` | `components/DataPreview.jsx` | React state |
| `app.js:buildDistributionChart()` | `components/DistributionChart.jsx` | Tailwind bars |
| `styles.css` | Tailwind classes | Aplicar design system Reset |

### API Endpoints

| Acción | Endpoint | Método | Body |
|--------|----------|--------|------|
| Procesar archivo | `/api/clasificador-geografico/process` | POST | multipart/form-data |
| Validar TXT | `/api/clasificador-geografico/validate` | POST | multipart/form-data |
| Health check | `/api/clasificador-geografico/health` | GET | - |

---

## 4. Código Crítico a Migrar

### 4.1 Constantes de Negocio

```python
# clasificador_geografico_processor.py

# Las 7 ciudades requeridas para clasificar como NACIONAL
CIUDADES_NACIONAL = frozenset([
    'LIMA', 'TRUJILLO', 'AREQUIPA', 'CUSCO', 'CHICLAYO', 'HUANCAYO', 'PIURA'
])

# Ciudades del Norte
CIUDADES_NORTE = frozenset(['CHICLAYO', 'TRUJILLO', 'PIURA'])

# Ciudades del Sur
CIUDADES_SUR = frozenset(['AREQUIPA', 'CUSCO', 'HUANCAYO'])

# Emisoras que automáticamente son NACIONAL
EMISORAS_NACIONAL = frozenset([
    'ATV+',
    'NATIVA TV',
    'RPP TV',
    'WILLAX PERU'
])

# Columnas de agrupación
COLUMNAS_GRUPO = ['DIA', 'MEDIO', 'EMISORA/SITE', 'VERSION']

# Configuración por defecto de porcentajes
PORCENTAJES_DEFAULT = {
    'CHICLAYO': 33.33,
    'TRUJILLO': 33.33,
    'PIURA': 33.34,
    'AREQUIPA': 33.33,
    'CUSCO': 33.33,
    'HUANCAYO': 33.34
}

# Metadatos a ignorar en archivo TXT
METADATA_PREFIXES = ('Periodo:', 'Tarifa', 'Tipos de Avisos:', 'Targets:')

# Indicadores de fila header
HEADER_INDICATORS = ('#|', 'N°|', '|MEDIO|')
```

---

### 4.2 Schemas Pydantic

```python
# schemas/clasificador_geografico.py

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, List, Literal
from enum import Enum

class AmbitoGeografico(str, Enum):
    NACIONAL = "nacional"
    REGIONES = "regiones"
    LIMA = "lima"

class PorcentajesCiudad(BaseModel):
    CHICLAYO: float = Field(default=33.33, ge=0, le=100)
    TRUJILLO: float = Field(default=33.33, ge=0, le=100)
    PIURA: float = Field(default=33.34, ge=0, le=100)
    AREQUIPA: float = Field(default=33.33, ge=0, le=100)
    CUSCO: float = Field(default=33.33, ge=0, le=100)
    HUANCAYO: float = Field(default=33.34, ge=0, le=100)

    @field_validator('*', mode='after')
    @classmethod
    def validate_totals(cls, v, info):
        return v

    def validate_totals_sum(self) -> tuple[bool, bool]:
        """Retorna (norte_valid, sur_valid)"""
        total_norte = self.CHICLAYO + self.TRUJILLO + self.PIURA
        total_sur = self.AREQUIPA + self.CUSCO + self.HUANCAYO
        return (
            abs(total_norte - 100) < 0.1,
            abs(total_sur - 100) < 0.1
        )

class ConfiguracionClasificador(BaseModel):
    ambito: AmbitoGeografico = AmbitoGeografico.REGIONES
    audiencia_norte: float = Field(default=0, ge=0, description="Audiencia en miles")
    audiencia_sur: float = Field(default=0, ge=0, description="Audiencia en miles")
    porcentajes: PorcentajesCiudad = Field(default_factory=PorcentajesCiudad)

class RankintEntry(BaseModel):
    año: Optional[str] = None
    mes: str
    canal: str
    programa: str
    rat_num: float = 0
    rat_pct: float = 0

class EstadisticasClasificacion(BaseModel):
    total_registros: int
    registros_nacional: int
    total_grupos: int
    grupos_nacional: int
    distribucion: Dict[str, int]

class ResultadoClasificacion(BaseModel):
    estadisticas: EstadisticasClasificacion
    archivo_nombre: str
    mensaje: str = "Procesamiento completado exitosamente"

class ErrorResponse(BaseModel):
    detail: str
    codigo: str
    ubicacion: Optional[str] = None
```

---

### 4.3 Función Principal: Parseo de TXT

```python
# processors/clasificador_geografico_processor.py

import pandas as pd
from typing import Tuple, List, Dict, Any
from io import StringIO

def parse_txt_content(content: str) -> Tuple[List[str], List[Dict[str, Any]]]:
    """
    Parsea el contenido de un archivo TXT delimitado por pipes.

    Args:
        content: Contenido crudo del archivo TXT

    Returns:
        Tuple de (columnas, datos)

    Raises:
        ValueError: Si no se encuentra header o datos válidos
    """
    lines = content.split('\n')
    columns = []
    data = []
    header_found = False

    for line in lines:
        line = line.strip()

        # Skip empty lines
        if not line:
            continue

        # Skip metadata lines
        if line.startswith(METADATA_PREFIXES):
            continue

        # Check if this is the header line
        is_header = (
            line.startswith('#|') or
            line.startswith('N°|') or
            ('|MEDIO|' in line and not header_found)
        )

        if is_header:
            columns = [col.strip() for col in line.split('|') if col.strip()]
            header_found = True
            continue

        # Skip if header not found yet
        if not header_found:
            continue

        # Parse data line
        values = [val.strip() for val in line.split('|')]

        # Skip if not enough values
        if len(values) < len(columns) - 1:
            continue

        # Create row dict
        row = {col: values[i] if i < len(values) else '' for i, col in enumerate(columns)}
        data.append(row)

    if not columns:
        raise ValueError("No se encontró una fila de encabezados válida")

    if not data:
        raise ValueError("El archivo no contiene datos válidos")

    return columns, data
```

---

### 4.4 Función Principal: Parseo de RANKINT

```python
def parse_rankint_data(
    file_content: bytes,
    zona: Literal['norte', 'sur']
) -> List[RankintEntry]:
    """
    Parsea archivo Excel RANKINT para una zona específica.

    Args:
        file_content: Bytes del archivo Excel
        zona: 'norte' o 'sur'

    Returns:
        Lista de RankintEntry
    """
    import openpyxl
    from io import BytesIO

    workbook = openpyxl.load_workbook(BytesIO(file_content), data_only=True)
    sheet = workbook.active

    # Convertir a lista de listas
    json_data = []
    for row in sheet.iter_rows(values_only=True):
        json_data.append(list(row))

    ratings = []
    header_row_index = -1
    has_both_zones = False

    # Buscar header y detectar formato
    for i, row in enumerate(json_data[:10]):
        if not row:
            continue

        row_str = '|'.join(str(cell or '') for cell in row).upper()

        # Check if has both zones
        if 'NORTE' in row_str and 'SUR' in row_str:
            has_both_zones = True

        # Find header row
        if any(x in row_str for x in ['AÑO', 'MES', 'CANAL']):
            header_row_index = i
            break

    # Start parsing from data rows
    start_row = header_row_index + 1 if header_row_index >= 0 else 5

    for i in range(start_row, len(json_data)):
        row = json_data[i]
        if not row or len(row) < 4:
            continue

        # Skip "Total" rows
        first_cell = str(row[0] or '').upper()
        if 'TOTAL' in first_cell:
            continue

        if has_both_zones:
            # Combined format: Año, Mes, Canal, Programa, NorteRat#, NorteRat%, SurRat#, SurRat%
            entry = RankintEntry(
                año=str(row[0]) if row[0] else None,
                mes=str(row[1] or '').upper().strip(),
                canal=str(row[2] or '').upper().strip(),
                programa=str(row[3] or '').upper().strip(),
                rat_num=float(row[4] or 0) if zona == 'norte' else float(row[6] or 0),
                rat_pct=float(row[5] or 0) if zona == 'norte' else float(row[7] or 0)
            )
        else:
            # Single zone format: Año, Mes, Canal, Programa, Rat#, Rat%
            entry = RankintEntry(
                año=str(row[0]) if row[0] else None,
                mes=str(row[1] or '').upper().strip(),
                canal=str(row[2] or '').upper().strip(),
                programa=str(row[3] or '').upper().strip(),
                rat_num=float(row[4] or 0),
                rat_pct=float(row[5] or 0)
            )

        if entry.canal or entry.programa:
            ratings.append(entry)

    return ratings
```

---

### 4.5 Motor de Clasificación Geográfica (CRÍTICO)

```python
def clasificar_geografico(
    data: List[Dict[str, Any]],
    columns: List[str],
    config: ConfiguracionClasificador,
    rankint_norte: List[RankintEntry] = None,
    rankint_sur: List[RankintEntry] = None
) -> Tuple[List[Dict[str, Any]], EstadisticasClasificacion]:
    """
    Motor principal de clasificación geográfica.

    Args:
        data: Lista de registros parseados
        columns: Nombres de columnas
        config: Configuración de clasificación
        rankint_norte: Datos RANKINT zona norte (opcional)
        rankint_sur: Datos RANKINT zona sur (opcional)

    Returns:
        Tuple de (datos_procesados, estadísticas)
    """
    # ─────────────────────────────────────────────────
    # PASO 1: Detectar nombres de columnas dinámicamente
    # ─────────────────────────────────────────────────
    col_medio = _find_column(columns, lambda c: c.upper() == 'MEDIO', 'MEDIO')
    col_dia = _find_column(columns, lambda c: c.upper() == 'DIA', 'DIA')
    col_emisora = _find_column(columns, lambda c: 'EMISORA' in c or 'SITE' in c, 'EMISORA/SITE')
    col_version = _find_column(columns, lambda c: c.upper() == 'VERSION', 'VERSION')
    col_region = _find_column(columns, lambda c: 'REGION' in c or 'ÁMBITO' in c or 'AMBITO' in c, 'REGION/ÁMBITO')
    col_spots = _find_column(columns, lambda c: 'SPOT' in c.upper(), 'SPOTS')

    # ─────────────────────────────────────────────────
    # PASO 2: Primera pasada - Clasificación inicial
    # ─────────────────────────────────────────────────
    processed_data = []

    for row in data:
        emisora = (row.get(col_emisora) or '').upper().strip()
        is_emisora_nacional = emisora in EMISORAS_NACIONAL
        region = _normalize_region(row.get(col_region))

        # Determinar zona (NORTE o SUR)
        zona = ''
        if region in CIUDADES_NORTE:
            zona = 'NORTE'
        elif region in CIUDADES_SUR:
            zona = 'SUR'

        # ─────────────────────────────────────────────────
        # FÓRMULA: Cálculo de valor de audiencia
        # valorCalculado = spots × audienciaMiles × (porcentajeCiudad / 100)
        # ─────────────────────────────────────────────────
        audiencia_miles = 0
        porcentaje_ciudad = 0
        valor_calculado = 0

        if config.ambito == AmbitoGeografico.REGIONES and zona:
            if zona == 'NORTE':
                audiencia_miles = config.audiencia_norte
                porcentaje_ciudad = getattr(config.porcentajes, region, 0)
            elif zona == 'SUR':
                audiencia_miles = config.audiencia_sur
                porcentaje_ciudad = getattr(config.porcentajes, region, 0)

            spots = _safe_float(row.get(col_spots))
            valor_calculado = spots * audiencia_miles * (porcentaje_ciudad / 100)

        processed_row = {
            **row,
            'CLASIFICACION_GEOGRAFICA': 'NACIONAL' if is_emisora_nacional else region,
            'ZONA': zona,
            'AUDIENCIA_MILES': audiencia_miles,
            'PCT_CIUDAD': porcentaje_ciudad,
            'VALOR_CALCULADO': round(valor_calculado, 2)
        }
        processed_data.append(processed_row)

    # ─────────────────────────────────────────────────
    # PASO 3: Crear grupos por DIA+MEDIO+EMISORA+VERSION
    # ─────────────────────────────────────────────────
    groups = {}  # key -> {regions: {region: count}, rows: [indices]}

    for index, row in enumerate(processed_data):
        emisora = (row.get(col_emisora) or '').upper().strip()

        # Skip si ya es NACIONAL por emisora
        if emisora in EMISORAS_NACIONAL:
            continue

        # FÓRMULA: Clave de grupo
        # key = DIA|MEDIO|EMISORA|VERSION
        key = f"{row.get(col_dia)}|{row.get(col_medio)}|{row.get(col_emisora)}|{row.get(col_version)}"
        region = _normalize_region(row.get(col_region))

        if key not in groups:
            groups[key] = {'regions': {}, 'rows': []}

        groups[key]['rows'].append(index)
        groups[key]['regions'][region] = groups[key]['regions'].get(region, 0) + 1

    # ─────────────────────────────────────────────────
    # PASO 4: Clasificar por distribución geográfica
    # ─────────────────────────────────────────────────
    national_groups = 0

    for key, group in groups.items():
        regions_present = set(group['regions'].keys())

        # Verificar si tiene EXACTAMENTE las 7 ciudades
        # NOTA: Cambiado de >= 7 a == 7 para consistencia con Python legacy
        has_all_cities = regions_present == CIUDADES_NACIONAL

        if has_all_cities:
            # ─────────────────────────────────────────────────
            # FÓRMULA: Mínimo común
            # minCount = min(conteo de cada ciudad)
            # ─────────────────────────────────────────────────
            min_count = min(group['regions'].get(city, 0) for city in CIUDADES_NACIONAL)
            national_groups += 1

            # Asignar NACIONAL a los primeros min_count de cada ciudad
            assigned_nacional = {city: 0 for city in CIUDADES_NACIONAL}

            for row_index in group['rows']:
                region = _normalize_region(data[row_index].get(col_region))

                if region in CIUDADES_NACIONAL:
                    if assigned_nacional[region] < min_count:
                        processed_data[row_index]['CLASIFICACION_GEOGRAFICA'] = 'NACIONAL'
                        assigned_nacional[region] += 1
                    else:
                        processed_data[row_index]['CLASIFICACION_GEOGRAFICA'] = region

    # ─────────────────────────────────────────────────
    # PASO 5: Calcular estadísticas
    # ─────────────────────────────────────────────────
    distribution = {}
    national_records = 0

    for row in processed_data:
        clasificacion = row['CLASIFICACION_GEOGRAFICA']
        distribution[clasificacion] = distribution.get(clasificacion, 0) + 1
        if clasificacion == 'NACIONAL':
            national_records += 1

    stats = EstadisticasClasificacion(
        total_registros=len(processed_data),
        registros_nacional=national_records,
        total_grupos=len(groups),
        grupos_nacional=national_groups,
        distribucion=distribution
    )

    return processed_data, stats


def _find_column(columns: List[str], predicate, default: str) -> str:
    """Busca columna que cumpla el predicado."""
    for col in columns:
        if predicate(col):
            return col
    return default


def _normalize_region(region: Any) -> str:
    """Normaliza nombre de región a mayúsculas."""
    if not region:
        return ''
    return str(region).upper().strip()


def _safe_float(value: Any) -> float:
    """Convierte a float de forma segura."""
    try:
        return float(value) if value else 0
    except (ValueError, TypeError):
        return 0
```

---

### 4.6 Generación de Tabla Dinámica

```python
def create_pivot_table(
    processed_data: List[Dict[str, Any]],
    columns: List[str]
) -> List[Dict[str, Any]]:
    """
    Genera tabla dinámica agregada por Año/Mes/Emisora/Programa/Zona/Ciudad.

    Args:
        processed_data: Datos ya clasificados
        columns: Nombres de columnas originales

    Returns:
        Lista de filas agregadas para la tabla dinámica
    """
    col_emisora = _find_column(columns, lambda c: 'EMISORA' in c or 'SITE' in c, 'EMISORA/SITE')
    col_programa = _find_column(columns, lambda c: 'PROGRAMA' in c or 'TIPO' in c, 'PROGRAMA/TIPO DE SITE')
    col_spots = _find_column(columns, lambda c: 'SPOT' in c.upper(), 'SPOTS')
    col_dia = _find_column(columns, lambda c: c.upper() == 'DIA', 'DIA')

    MONTH_NAMES = {
        1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
        5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
        9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
    }

    pivot_map = {}

    for row in processed_data:
        # ─────────────────────────────────────────────────
        # Extraer año y mes de DIA (formato: DD/MM/YYYY)
        # ─────────────────────────────────────────────────
        dia_value = row.get(col_dia) or ''
        año = ''
        mes = ''

        if dia_value:
            parts = str(dia_value).split('/')
            if len(parts) >= 3:
                año = parts[2]
                try:
                    mes = MONTH_NAMES.get(int(parts[1]), '')
                except ValueError:
                    mes = ''

        emisora = row.get(col_emisora) or ''
        programa = row.get(col_programa) or ''
        spots = _safe_float(row.get(col_spots))
        valor_calculado = row.get('VALOR_CALCULADO', 0)
        zona = row.get('ZONA') or ''
        ciudad = row.get('CLASIFICACION_GEOGRAFICA') or ''

        # Clave única para pivot
        key = f"{año}|{mes}|{emisora}|{programa}|{zona}|{ciudad}"

        if key not in pivot_map:
            pivot_map[key] = {
                'AÑO': año,
                'MES': mes,
                'EMISORA/SITE': emisora,
                'PROGRAMA/TIPO DE SITE': programa,
                'ZONA': zona,
                'CIUDAD': ciudad,
                'SUMA_SPOTS': 0,
                'VALOR_AUDIENCIA': 0
            }

        pivot_map[key]['SUMA_SPOTS'] += spots
        pivot_map[key]['VALOR_AUDIENCIA'] += valor_calculado

    # Convertir a lista y ordenar
    MONTH_ORDER = {v: k for k, v in MONTH_NAMES.items()}

    pivot_list = list(pivot_map.values())
    pivot_list.sort(key=lambda x: (
        x['AÑO'],
        MONTH_ORDER.get(x['MES'], 0),
        x['EMISORA/SITE'],
        x['PROGRAMA/TIPO DE SITE']
    ))

    # Redondear valores
    for row in pivot_list:
        row['SUMA_SPOTS'] = round(row['SUMA_SPOTS'], 2)
        row['VALOR_AUDIENCIA'] = round(row['VALOR_AUDIENCIA'], 2)

    return pivot_list
```

---

### 4.7 Exportación a Excel

```python
def generate_excel_output(
    processed_data: List[Dict[str, Any]],
    pivot_data: List[Dict[str, Any]],
    original_filename: str,
    include_pivot: bool = True
) -> bytes:
    """
    Genera archivo Excel con datos clasificados y tabla dinámica.

    Args:
        processed_data: Datos clasificados
        pivot_data: Tabla dinámica
        original_filename: Nombre del archivo original
        include_pivot: Si incluir hoja de pivot

    Returns:
        Bytes del archivo Excel
    """
    from io import BytesIO
    import pandas as pd

    output = BytesIO()

    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Hoja 1: Datos clasificados
        df_clasificado = pd.DataFrame(processed_data)
        df_clasificado.to_excel(writer, sheet_name='Clasificado', index=False)

        # Hoja 2: Tabla dinámica (si aplica)
        if include_pivot and pivot_data:
            df_pivot = pd.DataFrame(pivot_data)
            df_pivot.to_excel(writer, sheet_name='Tabla Dinamica', index=False)

    output.seek(0)
    return output.read()
```

---

### 4.8 Endpoint FastAPI

```python
# api/routes/clasificador_geografico.py

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from typing import List, Optional
from io import BytesIO
import json

from app.processors.clasificador_geografico_processor import (
    parse_txt_content,
    parse_rankint_data,
    clasificar_geografico,
    create_pivot_table,
    generate_excel_output
)
from app.schemas.clasificador_geografico import (
    ConfiguracionClasificador,
    ResultadoClasificacion,
    ErrorResponse,
    AmbitoGeografico
)

router = APIRouter(prefix="/clasificador-geografico", tags=["Clasificador Geográfico"])


@router.post(
    "/process",
    response_class=StreamingResponse,
    responses={
        200: {"description": "Archivo Excel clasificado"},
        400: {"model": ErrorResponse},
        422: {"model": ErrorResponse}
    }
)
async def process_file(
    archivo_txt: UploadFile = File(..., description="Archivo TXT de pauta (pipe-delimited)"),
    rankint_norte: List[UploadFile] = File(default=[], description="Archivos RANKINT zona Norte"),
    rankint_sur: List[UploadFile] = File(default=[], description="Archivos RANKINT zona Sur"),
    config_json: str = Form(default="{}", description="Configuración en JSON")
):
    """
    Procesa archivo de pauta publicitaria y genera Excel clasificado.

    - **archivo_txt**: Archivo TXT delimitado por pipes con datos de pauta
    - **rankint_norte**: Archivos Excel con ratings zona Norte (opcional)
    - **rankint_sur**: Archivos Excel con ratings zona Sur (opcional)
    - **config_json**: Configuración de ámbito, audiencia y porcentajes
    """
    try:
        # Parsear configuración
        config_dict = json.loads(config_json) if config_json else {}
        config = ConfiguracionClasificador(**config_dict)

        # Validar porcentajes si aplica
        if config.ambito == AmbitoGeografico.REGIONES:
            norte_valid, sur_valid = config.porcentajes.validate_totals_sum()
            if not norte_valid or not sur_valid:
                raise HTTPException(
                    status_code=400,
                    detail="Los porcentajes de cada zona deben sumar 100%"
                )

        # Leer archivo TXT
        content = await archivo_txt.read()
        content_str = content.decode('utf-8')

        columns, data = parse_txt_content(content_str)

        # Parsear archivos RANKINT
        rankint_data_norte = []
        rankint_data_sur = []

        for file in rankint_norte:
            file_content = await file.read()
            rankint_data_norte.extend(parse_rankint_data(file_content, 'norte'))

        for file in rankint_sur:
            file_content = await file.read()
            rankint_data_sur.extend(parse_rankint_data(file_content, 'sur'))

        # Procesar clasificación
        processed_data, stats = clasificar_geografico(
            data=data,
            columns=columns,
            config=config,
            rankint_norte=rankint_data_norte,
            rankint_sur=rankint_data_sur
        )

        # Crear tabla dinámica
        pivot_data = []
        if config.ambito == AmbitoGeografico.REGIONES:
            pivot_data = create_pivot_table(processed_data, columns)

        # Generar Excel
        original_name = archivo_txt.filename.rsplit('.', 1)[0]
        excel_bytes = generate_excel_output(
            processed_data=processed_data,
            pivot_data=pivot_data,
            original_filename=original_name,
            include_pivot=bool(pivot_data)
        )

        # Retornar archivo
        return StreamingResponse(
            BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={original_name}_CLASIFICADO.xlsx",
                "X-Stats-Total": str(stats.total_registros),
                "X-Stats-Nacional": str(stats.registros_nacional),
                "X-Stats-Grupos": str(stats.total_grupos),
                "X-Stats-Grupos-Nacional": str(stats.grupos_nacional)
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Configuración JSON inválida")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.post("/validate")
async def validate_file(archivo_txt: UploadFile = File(...)):
    """Valida estructura de archivo TXT sin procesarlo."""
    try:
        content = await archivo_txt.read()
        content_str = content.decode('utf-8')
        columns, data = parse_txt_content(content_str)

        return {
            "valid": True,
            "columns": columns,
            "row_count": len(data),
            "preview": data[:10]
        }
    except ValueError as e:
        return {"valid": False, "error": str(e)}


@router.get("/health")
async def health_check():
    """Health check del servicio."""
    return {"status": "healthy", "service": "clasificador-geografico"}
```

---

## 5. Mejoras a Implementar

### De Code Smells Detectados

| # | Problema Original | Solución en SiReset |
|---|-------------------|---------------------|
| 1 | Estado global mutable (`state`) | Usar parámetros de función + Pydantic models |
| 2 | XSS potencial (innerHTML) | React maneja esto automáticamente con JSX |
| 3 | Código muerto (`findRating()`) | No migrar - la función nunca se usa |
| 4 | Función de 174 líneas | Dividido en `_find_column`, `_normalize_region`, `_safe_float` |
| 5 | console.log en producción | Usar logging de Python con niveles |
| 6 | Valores hardcodeados | Extraídos a constantes al inicio del módulo |
| 7 | Lógica duplicada JS/Python | Consolidado en una sola implementación Python |
| 8 | Diferencia JS vs Python (≥7 vs ==7) | Unificado a `==7` (igualdad exacta) |
| 9 | Manejo de errores genérico | HTTPException con códigos específicos |
| 10 | LIMA sin zona | Documentado como comportamiento esperado (LIMA no tiene cálculo de audiencia) |
| 11 | Inconsistencia tildes | Buscar 'REGION', 'ÁMBITO', y 'AMBITO' |
| 12 | RANKINT no se resetea | Frontend manejará estado de uploads |
| 13 | Utilidades mezcladas | Separadas en funciones privadas `_*` |
| 14 | Idioma mezclado | Unificado a español para dominio, inglés para código |
| 15 | CSS duplicado | Tailwind elimina duplicación |

### Nuevas Mejoras

| Mejora | Implementación |
|--------|----------------|
| Validación de porcentajes bloqueante | HTTPException si no suman 100% |
| Logging estructurado | `import logging` con formato JSON |
| Documentación OpenAPI | Docstrings en endpoints |
| Límite de tamaño de archivo | Configurar en FastAPI (ej: 50MB) |
| Timeout de procesamiento | Background task para archivos grandes |

---

## 6. Plan de Implementación

### Día 1: Setup + Schemas

- [ ] Crear estructura de carpetas en `backend/app/`
- [ ] Crear `schemas/clasificador_geografico.py` con todos los Pydantic models
- [ ] Crear constantes en `processors/clasificador_geografico_processor.py`
- [ ] Crear endpoint placeholder `/health`
- [ ] Verificar que el router se registre en `main.py`

### Día 2: Backend - Procesamiento

- [ ] Implementar `parse_txt_content()`
- [ ] Implementar `parse_rankint_data()`
- [ ] Implementar `clasificar_geografico()` (motor principal)
- [ ] Implementar `create_pivot_table()`
- [ ] Implementar `generate_excel_output()`
- [ ] Escribir tests unitarios para cada función

### Día 3: Backend - API

- [ ] Implementar endpoint `/process`
- [ ] Implementar endpoint `/validate`
- [ ] Agregar manejo de errores
- [ ] Agregar logging
- [ ] Probar con archivos de ejemplo
- [ ] Documentar en Swagger

### Día 4: Frontend - Estructura

- [ ] Crear `pages/ClasificadorGeografico.jsx`
- [ ] Crear componentes base:
  - [ ] `FileUpload.jsx`
  - [ ] `RankintUpload.jsx`
  - [ ] `ConfigPanel.jsx`
  - [ ] `DataPreview.jsx`
- [ ] Aplicar estilos Reset (negro + verde neón)
- [ ] Conectar estado con hooks

### Día 5: Frontend - Integración

- [ ] Crear componentes de resultados:
  - [ ] `ProcessingProgress.jsx`
  - [ ] `ResultsStats.jsx`
  - [ ] `DistributionChart.jsx`
- [ ] Conectar con API backend
- [ ] Manejar descarga de archivo
- [ ] Agregar ruta en `App.jsx`
- [ ] Agregar card en Dashboard
- [ ] Testing end-to-end

---

## 7. Checklist de Validación

### Antes de PR - Backend

- [ ] Todos los endpoints documentados en Swagger (`/docs`)
- [ ] Validaciones con Pydantic funcionando
- [ ] Manejo de errores con HTTPException
- [ ] Logging configurado
- [ ] Tests unitarios pasando
- [ ] Mismo resultado que legacy con archivos de prueba

### Antes de PR - Frontend

- [ ] Design system Reset aplicado:
  - [ ] Background: `#000000`
  - [ ] Cards: `#1A1A1A`
  - [ ] Accent: `#00FF85`
  - [ ] Tablas: `#6F42C1`
  - [ ] Fonts: Bebas Neue / Montserrat
  - [ ] Border radius: `12px`
- [ ] Responsive (mobile-friendly)
- [ ] Estados de loading/error
- [ ] Drag & drop funcionando

### Antes de PR - General

- [ ] Funcionalidad idéntica al legacy
- [ ] Archivo Excel de salida tiene mismas columnas
- [ ] Clasificación produce mismos resultados
- [ ] Tabla dinámica incluida
- [ ] README.md actualizado con nueva herramienta

---

## 8. Archivos de Referencia

### Estructura de Archivo TXT Esperado

```
Periodo: del 01 Enero 2024 al 30 Noviembre 2025
Tarifa Impresa Bruta en dólares
Tipos de Avisos: MENCION, SPOT, BANNER, PRES.PROGRAMA, DESP.PROGRAMA
Targets: No Presenta

#|MEDIO|DIA|MARCA|PRODUCTO|VERSION|PROGRAMA/TIPO DE SITE|EMISORA/SITE|SPOTS|REGION/ÁMBITO|CORTE LOCAL|RUC|
1|TV|01/01/2024|MARCA X|PRODUCTO Y|VERSION Z|NOTICIERO|04AMERICA|2|LIMA| |12345678901|
2|TV|01/01/2024|MARCA X|PRODUCTO Y|VERSION Z|NOTICIERO|04AMERICA|2|AREQUIPA| |12345678901|
```

### Estructura de Archivo RANKINT Esperado

```
Formato zona única:
AÑO | MES | CANAL | PROGRAMA | RAT# | RAT%

Formato combinado:
AÑO | MES | CANAL | PROGRAMA | NORTE_RAT# | NORTE_RAT% | SUR_RAT# | SUR_RAT%
```

### Columnas de Salida Excel

**Hoja "Clasificado":**
```
[Todas las columnas originales] + CLASIFICACION_GEOGRAFICA + ZONA + AUDIENCIA_MILES + PCT_CIUDAD + VALOR_CALCULADO
```

**Hoja "Tabla Dinámica":**
```
AÑO | MES | EMISORA/SITE | PROGRAMA/TIPO DE SITE | ZONA | CIUDAD | SUMA_SPOTS | VALOR_AUDIENCIA
```

---

## 9. Notas Adicionales

### Decisiones de Diseño

1. **LIMA no tiene zona**: Por diseño, LIMA no pertenece a NORTE ni SUR. No se calcula `VALOR_CALCULADO` para registros de LIMA.

2. **Exactamente 7 ciudades**: Un grupo debe tener exactamente las 7 ciudades (no más, no menos) para clasificarse como NACIONAL.

3. **Emisoras NACIONAL**: ATV+, NATIVA TV, RPP TV, WILLAX PERU siempre son NACIONAL independiente de la distribución geográfica.

4. **Orden de procesamiento**: Primero se marcan emisoras NACIONAL, luego se procesan grupos para el resto.

### Dependencias Python

```
pandas>=2.0.0
openpyxl>=3.1.0
pydantic>=2.0.0
fastapi>=0.100.0
python-multipart>=0.0.6
```

---

*Documento generado automáticamente para migración a SiReset.*
*Última actualización: 2026-01-07*
