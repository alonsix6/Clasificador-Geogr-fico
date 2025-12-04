# Clasificador Geográfico de Medios

Herramienta web para clasificar registros de pauta publicitaria en medios como **NACIONAL** o por **ciudad específica**, basándose en la distribución geográfica de las emisiones.

---

## Tabla de Contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Cómo Funciona](#cómo-funciona)
- [Reglas de Clasificación](#reglas-de-clasificación)
- [Formato de Archivo de Entrada](#formato-de-archivo-de-entrada)
- [Columnas Utilizadas](#columnas-utilizadas)
- [Emisoras Automáticamente NACIONAL](#emisoras-automáticamente-nacional)
- [Las 7 Ciudades para NACIONAL](#las-7-ciudades-para-nacional)
- [Ejemplos de Clasificación](#ejemplos-de-clasificación)
- [Instalación y Despliegue](#instalación-y-despliegue)
- [Uso de la Aplicación](#uso-de-la-aplicación)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Estructura del Proyecto](#estructura-del-proyecto)

---

## Descripción

Esta herramienta permite procesar archivos de pauta publicitaria exportados en formato TXT (delimitado por pipes `|`) y clasificar cada registro según su alcance geográfico.

La clasificación determina si un spot publicitario tiene cobertura **NACIONAL** (apareció en las 7 ciudades principales del Perú) o si fue emitido solo en ciudades específicas.

### Problema que resuelve

Cuando se tiene una base de datos de pauta publicitaria con miles de registros, es difícil determinar manualmente cuáles spots son de alcance nacional y cuáles son locales. Esta herramienta automatiza ese proceso aplicando reglas de negocio específicas.

---

## Características

### Funcionalidades Principales

| Característica | Descripción |
|---------------|-------------|
| **Carga de archivos TXT** | Soporte para archivos delimitados por pipes (`\|`) |
| **Drag & Drop** | Arrastra y suelta el archivo directamente en la aplicación |
| **Previsualización** | Muestra los primeros 50 registros antes de procesar |
| **Auto-detección de columnas** | Identifica automáticamente las columnas necesarias |
| **Emisoras especiales** | Clasifica automáticamente ciertas emisoras como NACIONAL |
| **Resaltado visual** | Las emisoras especiales se muestran destacadas en verde |
| **Estadísticas en tiempo real** | Muestra totales, grupos y distribución |
| **Gráfico de distribución** | Visualización de barras con porcentajes |
| **Exportación a Excel** | Descarga el resultado como archivo .xlsx |
| **100% Client-side** | Todo el procesamiento ocurre en el navegador |
| **Sin servidor requerido** | Funciona en cualquier hosting estático (Netlify, GitHub Pages, etc.) |

### Interfaz de Usuario

- Diseño moderno y responsive
- Compatible con dispositivos móviles
- Feedback visual durante el procesamiento
- Barra de progreso animada

---

## Cómo Funciona

### Flujo de Trabajo

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   1. SUBIR      │────▶│  2. PREVISUA-   │────▶│   3. PROCESAR   │────▶│  4. DESCARGAR   │
│   ARCHIVO TXT   │     │     LIZAR       │     │   Y CLASIFICAR  │     │   EXCEL         │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Proceso Interno

1. **Lectura del archivo**: Se lee el contenido del TXT y se parsean las líneas
2. **Detección de cabeceras**: Se identifican las líneas de metadatos y se saltan
3. **Parsing de datos**: Se convierte cada línea en un objeto con las columnas correspondientes
4. **Primera clasificación**: Se marcan las emisoras especiales como NACIONAL
5. **Agrupación**: Se crean grupos por combinación de DIA + MEDIO + EMISORA + VERSION
6. **Análisis geográfico**: Para cada grupo, se cuenta cuántos registros hay por ciudad
7. **Clasificación final**: Se aplican las reglas de negocio para determinar NACIONAL o ciudad
8. **Generación de estadísticas**: Se calculan totales y distribución
9. **Exportación**: Se genera el archivo Excel con la nueva columna

---

## Reglas de Clasificación

### Regla 1: Emisoras Automáticamente NACIONAL

Si la columna `EMISORA/SITE` contiene alguno de estos valores, el registro se clasifica automáticamente como **NACIONAL**, sin importar la ciudad:

- ATV+
- NATIVA TV
- RPP TV
- WILLAX PERU

### Regla 2: Distribución Geográfica Completa

Para los registros que NO son de emisoras especiales, se aplica la siguiente lógica:

1. Se agrupa por: `DIA` + `MEDIO` + `EMISORA/SITE` + `VERSION`
2. Se cuenta cuántos registros hay en cada ciudad para ese grupo
3. **Si aparece en las 7 ciudades**:
   - El **mínimo común** de todas las ciudades se clasifica como **NACIONAL**
   - Los **excedentes** de cada ciudad se clasifican con el nombre de esa ciudad
4. **Si aparece en menos de 7 ciudades**:
   - Cada registro se clasifica con su **ciudad específica**

### Regla 3: Excedentes

Cuando un grupo tiene diferente cantidad de registros por ciudad:

```
Ejemplo: Grupo con distribución desigual
- LIMA: 6 registros
- AREQUIPA: 4 registros
- TRUJILLO: 4 registros
- CUSCO: 4 registros
- CHICLAYO: 4 registros
- HUANCAYO: 4 registros
- PIURA: 4 registros

Resultado:
- Mínimo común = 4
- 4 de cada ciudad = 28 registros NACIONAL
- 2 de LIMA = 2 registros LIMA (excedentes)
```

---

## Formato de Archivo de Entrada

### Estructura del TXT

El archivo debe estar delimitado por pipes (`|`) y puede incluir líneas de metadatos al inicio:

```
Periodo: del 01 Enero 2024 al 30 Noviembre 2025
Tarifa Impresa Bruta en dólares
Tipos de Avisos: MENCION, SPOT, BANNER, PRES.PROGRAMA, DESP.PROGRAMA
Targets: No Presenta

#|MEDIO|DIA|MARCA|PRODUCTO|VERSION|...|REGION/ÁMBITO|CORTE LOCAL|RUC|
1|TV|01/01/2024|MARCA X|PRODUCTO Y|VERSION Z|...|LIMA| |12345678901|
2|TV|01/01/2024|MARCA X|PRODUCTO Y|VERSION Z|...|AREQUIPA| |12345678901|
```

### Líneas que se ignoran automáticamente

- Líneas vacías
- Líneas que empiezan con `Periodo:`
- Líneas que empiezan con `Tarifa`
- Líneas que empiezan con `Tipos de Avisos:`
- Líneas que empiezan con `Targets:`

---

## Columnas Utilizadas

### Columnas para Agrupación

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| `DIA` | Fecha de emisión | 01/01/2024 |
| `MEDIO` | Tipo de medio | TV, CABLE, RADIO |
| `EMISORA/SITE` | Canal o emisora | 04AMERICA, 02LATINA, RPP TV |
| `VERSION` | Versión del spot | TU MOMENTO ES AHORA |

### Columna para Evaluación Geográfica

| Columna | Descripción | Valores posibles |
|---------|-------------|-----------------|
| `REGION/ÁMBITO` | Ciudad de emisión | LIMA, AREQUIPA, TRUJILLO, CUSCO, CHICLAYO, HUANCAYO, PIURA |

### Columna de Salida

| Columna | Descripción |
|---------|-------------|
| `CLASIFICACION_GEOGRAFICA` | Resultado: NACIONAL o nombre de ciudad |

---

## Emisoras Automáticamente NACIONAL

Las siguientes emisoras tienen cobertura nacional garantizada y se clasifican automáticamente:

| Emisora | Motivo |
|---------|--------|
| **ATV+** | Canal de señal nacional |
| **NATIVA TV** | Canal de señal nacional |
| **RPP TV** | Canal de señal nacional |
| **WILLAX PERU** | Canal de señal nacional |

Estos registros se resaltan en **verde** en la previsualización.

---

## Las 7 Ciudades para NACIONAL

Para que un grupo sea considerado NACIONAL por distribución geográfica, debe aparecer en **todas** estas ciudades:

1. **LIMA**
2. **AREQUIPA**
3. **TRUJILLO**
4. **CUSCO**
5. **CHICLAYO**
6. **HUANCAYO**
7. **PIURA**

Si falta aunque sea una ciudad, el registro se clasifica por ciudad individual.

---

## Ejemplos de Clasificación

### Ejemplo 1: Cobertura Nacional Perfecta

```
Grupo: 15/01/2024 | TV | 04AMERICA | SPOT VERANO

LIMA: 3 registros
AREQUIPA: 3 registros
TRUJILLO: 3 registros
CUSCO: 3 registros
CHICLAYO: 3 registros
HUANCAYO: 3 registros
PIURA: 3 registros

Resultado: 21 registros → TODOS clasificados como NACIONAL
```

### Ejemplo 2: Cobertura Nacional con Excedentes

```
Grupo: 20/01/2024 | TV | 02LATINA | PROMO ENERO

LIMA: 6 registros
AREQUIPA: 4 registros
TRUJILLO: 4 registros
CUSCO: 4 registros
CHICLAYO: 4 registros
HUANCAYO: 4 registros
PIURA: 4 registros

Mínimo común: 4

Resultado:
- 28 registros → NACIONAL (4 de cada ciudad)
- 2 registros → LIMA (excedentes)
```

### Ejemplo 3: Cobertura Parcial

```
Grupo: 25/01/2024 | TV | CANAL LOCAL | SPOT LOCAL

LIMA: 5 registros
AREQUIPA: 3 registros
(No aparece en las otras 5 ciudades)

Resultado:
- 5 registros → LIMA
- 3 registros → AREQUIPA
```

### Ejemplo 4: Emisora Especial

```
Cualquier registro con EMISORA/SITE = "RPP TV"

Resultado: NACIONAL (automático, sin importar la ciudad original)
```

---

## Instalación y Despliegue

### Opción 1: Netlify (Recomendado)

1. Conecta tu repositorio GitHub a Netlify
2. Configura el deploy:
   - **Build command**: (dejar vacío)
   - **Publish directory**: `.`
3. Deploy automático con cada push

### Opción 2: GitHub Pages

1. Ve a Settings > Pages
2. Selecciona la rama y carpeta raíz
3. Guarda y espera el deploy

### Opción 3: Local

```bash
# Clonar repositorio
git clone https://github.com/solmarinavk/Laureatte.git

# Abrir con servidor local
cd Laureatte
python -m http.server 8000
# o
npx serve .

# Acceder en navegador
http://localhost:8000
```

---

## Uso de la Aplicación

### Paso 1: Subir Archivo

- Arrastra el archivo TXT a la zona de carga, o
- Haz clic en "Seleccionar archivo"

### Paso 2: Verificar Previsualización

- Revisa que los datos se vean correctamente
- Las emisoras NACIONAL automáticas aparecen en verde
- Verifica el conteo de registros

### Paso 3: Procesar

- Haz clic en "Procesar y clasificar"
- Espera mientras se procesan los datos
- Observa la barra de progreso

### Paso 4: Revisar Resultados

- Verifica las estadísticas:
  - Total de registros
  - Registros NACIONAL
  - Grupos únicos
  - Grupos con cobertura NACIONAL
- Revisa el gráfico de distribución

### Paso 5: Descargar

- Haz clic en "Descargar Excel clasificado"
- El archivo incluye todas las columnas originales + `CLASIFICACION_GEOGRAFICA`

---

## Tecnologías Utilizadas

| Tecnología | Uso |
|------------|-----|
| **HTML5** | Estructura de la aplicación |
| **CSS3** | Estilos y diseño responsive |
| **JavaScript ES6+** | Lógica de procesamiento |
| **SheetJS (xlsx)** | Generación de archivos Excel |
| **Google Fonts (Inter)** | Tipografía moderna |

### Sin dependencias de servidor

- No requiere backend
- No envía datos a ningún servidor
- Todo el procesamiento es local en el navegador
- Los datos nunca salen del dispositivo del usuario

---

## Estructura del Proyecto

```
Laureatte/
├── index.html          # Página principal
├── styles.css          # Estilos de la aplicación
├── app.js              # Lógica de procesamiento
├── netlify.toml        # Configuración para Netlify
├── README.md           # Este archivo
├── clasificar_geografico.py  # Script Python (alternativa)
├── NACIONAL UPN.xlsx   # Archivo de ejemplo (Excel)
└── NACIONAL UPN_CLASIFICADO.xlsx  # Resultado de ejemplo
```

---

## Soporte

Si tienes preguntas o encuentras algún problema, por favor abre un issue en el repositorio.

---

## Licencia

Este proyecto es de uso interno. Todos los derechos reservados.
