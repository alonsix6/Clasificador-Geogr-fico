// ============================================
// Clasificador Geográfico de Medios
// Con cálculo de audiencia y tabla dinámica
// ============================================

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

// Columnas a mostrar en la previsualización (índices)
const PREVIEW_COLUMNS = ['#', 'MEDIO', 'DIA', 'VERSION', 'EMISORA/SITE', 'REGION/ÁMBITO'];

// Estado de la aplicación
let state = {
    file: null,
    data: [],
    columns: [],
    processedData: [],
    stats: {},
    // Archivos RANKINT por zona
    rankintFiles: {
        norte: [], // Array de { file, data }
        sur: []    // Array de { file, data }
    },
    rankintDataCombined: {
        norte: [],
        sur: []
    },
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
};

// ============================================
// Elementos del DOM
// ============================================
const elements = {
    uploadBox: document.getElementById('uploadBox'),
    fileInput: document.getElementById('fileInput'),
    selectFileBtn: document.getElementById('selectFileBtn'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    removeFile: document.getElementById('removeFile'),
    // Config Section
    configSection: document.getElementById('configSection'),
    // RANKINT por zona
    rankintNorteInput: document.getElementById('rankintNorteInput'),
    selectRankintNorteBtn: document.getElementById('selectRankintNorteBtn'),
    norteFilesList: document.getElementById('norteFilesList'),
    rankintSurInput: document.getElementById('rankintSurInput'),
    selectRankintSurBtn: document.getElementById('selectRankintSurBtn'),
    surFilesList: document.getElementById('surFilesList'),
    rankintSummary: document.getElementById('rankintSummary'),
    rankintSummaryText: document.getElementById('rankintSummaryText'),
    ambitoNacional: document.getElementById('ambitoNacional'),
    ambitoRegiones: document.getElementById('ambitoRegiones'),
    ambitoLima: document.getElementById('ambitoLima'),
    audienciaGroup: document.getElementById('audienciaGroup'),
    porcentajesGroup: document.getElementById('porcentajesGroup'),
    audienciaNorte: document.getElementById('audienciaNorte'),
    audienciaSur: document.getElementById('audienciaSur'),
    pctChiclayo: document.getElementById('pctChiclayo'),
    pctTrujillo: document.getElementById('pctTrujillo'),
    pctPiura: document.getElementById('pctPiura'),
    pctArequipa: document.getElementById('pctArequipa'),
    pctCusco: document.getElementById('pctCusco'),
    pctHuancayo: document.getElementById('pctHuancayo'),
    totalNorte: document.getElementById('totalNorte'),
    totalSur: document.getElementById('totalSur'),
    porcentajeWarning: document.getElementById('porcentajeWarning'),
    // Preview Section
    previewSection: document.getElementById('previewSection'),
    previewCount: document.getElementById('previewCount'),
    previewHead: document.getElementById('previewHead'),
    previewBody: document.getElementById('previewBody'),
    cancelBtn: document.getElementById('cancelBtn'),
    processBtn: document.getElementById('processBtn'),
    progressSection: document.getElementById('progressSection'),
    progressText: document.getElementById('progressText'),
    progressFill: document.getElementById('progressFill'),
    resultsSection: document.getElementById('resultsSection'),
    totalRecords: document.getElementById('totalRecords'),
    nationalRecords: document.getElementById('nationalRecords'),
    totalGroups: document.getElementById('totalGroups'),
    nationalGroups: document.getElementById('nationalGroups'),
    distributionChart: document.getElementById('distributionChart'),
    downloadBtn: document.getElementById('downloadBtn'),
    newFileBtn: document.getElementById('newFileBtn')
};

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    // Upload box click
    elements.uploadBox.addEventListener('click', () => elements.fileInput.click());
    elements.selectFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.fileInput.click();
    });

    // File input change
    elements.fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    elements.uploadBox.addEventListener('dragover', handleDragOver);
    elements.uploadBox.addEventListener('dragleave', handleDragLeave);
    elements.uploadBox.addEventListener('drop', handleDrop);

    // Remove file
    elements.removeFile.addEventListener('click', resetUpload);

    // Cancel button
    elements.cancelBtn.addEventListener('click', resetUpload);

    // Process button
    elements.processBtn.addEventListener('click', processFile);

    // Download button
    elements.downloadBtn.addEventListener('click', downloadResult);

    // New file button
    elements.newFileBtn.addEventListener('click', resetAll);

    // RANKINT file inputs por zona
    elements.selectRankintNorteBtn.addEventListener('click', () => elements.rankintNorteInput.click());
    elements.rankintNorteInput.addEventListener('change', (e) => handleRankintZoneSelect(e, 'norte'));
    elements.selectRankintSurBtn.addEventListener('click', () => elements.rankintSurInput.click());
    elements.rankintSurInput.addEventListener('change', (e) => handleRankintZoneSelect(e, 'sur'));

    // Ámbito radio buttons
    document.querySelectorAll('input[name="ambito"]').forEach(radio => {
        radio.addEventListener('change', handleAmbitoChange);
    });

    // Audiencia inputs
    elements.audienciaNorte.addEventListener('input', updateAudienciaConfig);
    elements.audienciaSur.addEventListener('input', updateAudienciaConfig);

    // Porcentaje inputs
    const pctInputs = [
        elements.pctChiclayo, elements.pctTrujillo, elements.pctPiura,
        elements.pctArequipa, elements.pctCusco, elements.pctHuancayo
    ];
    pctInputs.forEach(input => {
        input.addEventListener('input', updatePorcentajes);
    });

    // Initialize porcentajes display
    updatePorcentajes();
}

// ============================================
// Config Handlers
// ============================================
function handleAmbitoChange(e) {
    state.config.ambito = e.target.value;

    if (e.target.value === 'regiones') {
        elements.audienciaGroup.classList.remove('hidden');
        elements.porcentajesGroup.classList.remove('hidden');
    } else {
        elements.audienciaGroup.classList.add('hidden');
        elements.porcentajesGroup.classList.add('hidden');
    }
}

function updateAudienciaConfig() {
    state.config.audienciaNorte = parseFloat(elements.audienciaNorte.value) || 0;
    state.config.audienciaSur = parseFloat(elements.audienciaSur.value) || 0;
}

function updatePorcentajes() {
    // Get values
    const pctChiclayo = parseFloat(elements.pctChiclayo.value) || 0;
    const pctTrujillo = parseFloat(elements.pctTrujillo.value) || 0;
    const pctPiura = parseFloat(elements.pctPiura.value) || 0;
    const pctArequipa = parseFloat(elements.pctArequipa.value) || 0;
    const pctCusco = parseFloat(elements.pctCusco.value) || 0;
    const pctHuancayo = parseFloat(elements.pctHuancayo.value) || 0;

    // Calculate totals
    const totalNorte = pctChiclayo + pctTrujillo + pctPiura;
    const totalSur = pctArequipa + pctCusco + pctHuancayo;

    // Update display
    elements.totalNorte.textContent = `${totalNorte.toFixed(2)}%`;
    elements.totalSur.textContent = `${totalSur.toFixed(2)}%`;

    // Apply validation classes
    const norteValid = Math.abs(totalNorte - 100) < 0.1;
    const surValid = Math.abs(totalSur - 100) < 0.1;

    elements.totalNorte.className = `porcentaje-total ${norteValid ? 'valid' : 'invalid'}`;
    elements.totalSur.className = `porcentaje-total ${surValid ? 'valid' : 'invalid'}`;

    // Show/hide warning
    if (!norteValid || !surValid) {
        elements.porcentajeWarning.classList.remove('hidden');
    } else {
        elements.porcentajeWarning.classList.add('hidden');
    }

    // Update state
    state.config.porcentajes = {
        CHICLAYO: pctChiclayo,
        TRUJILLO: pctTrujillo,
        PIURA: pctPiura,
        AREQUIPA: pctArequipa,
        CUSCO: pctCusco,
        HUANCAYO: pctHuancayo
    };
}

// ============================================
// RANKINT File Handling (Multiple files per zone)
// ============================================
function handleRankintZoneSelect(e, zona) {
    const files = e.target.files;
    if (files.length === 0) return;

    // Process each file
    Array.from(files).forEach(file => {
        readRankintZoneFile(file, zona);
    });

    // Reset input to allow selecting same file again
    e.target.value = '';
}

function readRankintZoneFile(file, zona) {
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Get first sheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Parse RANKINT data
            const parsedData = parseRankintZoneData(jsonData, zona);

            // Add to state
            state.rankintFiles[zona].push({
                file: file,
                name: file.name,
                data: parsedData
            });

            // Update combined data
            updateCombinedRankintData(zona);

            // Update UI
            renderZoneFiles(zona);
            updateRankintSummary();

            console.log(`RANKINT ${zona} file loaded:`, file.name, parsedData.length, 'entries');

        } catch (error) {
            console.error('Error reading RANKINT file:', error);
            alert(`Error al leer el archivo ${file.name}: ${error.message}`);
        }
    };

    reader.readAsArrayBuffer(file);
}

function parseRankintZoneData(jsonData, zona) {
    const ratings = [];

    // Detect format - could be single zone or combined
    // Look for header row
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

    // Start parsing from data rows
    const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 5;

    for (let i = startRow; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 4) continue;

        // Skip if it's a "Total" row
        const firstCell = String(row[0] || '').toUpperCase();
        if (firstCell.includes('TOTAL')) continue;

        // Parse based on format
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

function updateCombinedRankintData(zona) {
    // Combine all files for this zone
    state.rankintDataCombined[zona] = [];

    state.rankintFiles[zona].forEach(fileEntry => {
        state.rankintDataCombined[zona].push(...fileEntry.data);
    });
}

function renderZoneFiles(zona) {
    const listEl = zona === 'norte' ? elements.norteFilesList : elements.surFilesList;
    const files = state.rankintFiles[zona];

    if (files.length === 0) {
        listEl.innerHTML = '';
        return;
    }

    listEl.innerHTML = files.map((fileEntry, index) => `
        <div class="zone-file-item" data-zone="${zona}" data-index="${index}">
            <span class="zone-file-name">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M11.5 3.5L5.5 9.5L2.5 6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${fileEntry.name}
            </span>
            <button class="zone-file-remove" onclick="removeRankintFile('${zona}', ${index})" title="Eliminar">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    `).join('');
}

function removeRankintFile(zona, index) {
    state.rankintFiles[zona].splice(index, 1);
    updateCombinedRankintData(zona);
    renderZoneFiles(zona);
    updateRankintSummary();
}

function updateRankintSummary() {
    const totalNorte = state.rankintFiles.norte.length;
    const totalSur = state.rankintFiles.sur.length;
    const total = totalNorte + totalSur;

    if (total > 0) {
        elements.rankintSummary.classList.remove('hidden');
        const entriesNorte = state.rankintDataCombined.norte.length;
        const entriesSur = state.rankintDataCombined.sur.length;
        elements.rankintSummaryText.textContent = `${total} archivo(s) cargados (Norte: ${entriesNorte} registros, Sur: ${entriesSur} registros)`;
    } else {
        elements.rankintSummary.classList.add('hidden');
    }
}

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

// ============================================
// File Handling
// ============================================
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadBox.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadBox.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadBox.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processUploadedFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processUploadedFile(file);
    }
}

function processUploadedFile(file) {
    // Validate file type
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension !== 'txt') {
        alert('Por favor, selecciona un archivo TXT válido');
        return;
    }

    state.file = file;

    // Show file info
    elements.fileName.textContent = file.name;
    elements.fileSize.textContent = formatFileSize(file.size);
    elements.fileInfo.classList.remove('hidden');
    elements.uploadBox.style.display = 'none';

    // Read file
    readTxtFile(file);
}

function readTxtFile(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const content = e.target.result;
            const result = parseTxtContent(content);

            if (result.data.length === 0) {
                alert('El archivo está vacío o no tiene datos válidos');
                resetUpload();
                return;
            }

            state.data = result.data;
            state.columns = result.columns;

            // Show config section and preview
            elements.configSection.classList.remove('hidden');
            showPreview();

        } catch (error) {
            console.error('Error reading file:', error);
            alert('Error al leer el archivo: ' + error.message);
            resetUpload();
        }
    };

    reader.readAsText(file, 'UTF-8');
}

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

function showPreview() {
    // Update count
    elements.previewCount.textContent = `${formatNumber(state.data.length)} registros`;

    // Find column indices for preview
    const previewCols = [];
    PREVIEW_COLUMNS.forEach(colName => {
        if (state.columns.includes(colName)) {
            previewCols.push(colName);
        }
    });

    // If no specific columns found, use first 6 columns
    const columnsToShow = previewCols.length > 0 ? previewCols : state.columns.slice(0, 6);

    // Build header
    elements.previewHead.innerHTML = `
        <tr>
            ${columnsToShow.map(col => `<th>${col}</th>`).join('')}
        </tr>
    `;

    // Build body (show first 50 rows)
    const rowsToShow = state.data.slice(0, 50);
    const emisoraColName = state.columns.find(c => c.includes('EMISORA') || c.includes('SITE')) || 'EMISORA/SITE';

    elements.previewBody.innerHTML = rowsToShow.map(row => {
        const emisora = (row[emisoraColName] || '').toUpperCase().trim();
        const isEmisoraNacional = EMISORAS_NACIONAL.has(emisora);

        return `<tr>
            ${columnsToShow.map(col => {
                const value = row[col] || '';
                const isEmisoraCol = col.includes('EMISORA') || col.includes('SITE');
                const className = (isEmisoraCol && isEmisoraNacional) ? 'class="emisora-nacional"' : '';
                return `<td ${className}>${value}</td>`;
            }).join('')}
        </tr>`;
    }).join('');

    // Show preview section
    elements.previewSection.classList.remove('hidden');
}

function resetUpload() {
    state.file = null;
    state.data = [];
    state.columns = [];

    elements.fileInput.value = '';
    elements.fileInfo.classList.add('hidden');
    elements.uploadBox.style.display = 'block';
    elements.previewSection.classList.add('hidden');
    elements.configSection.classList.add('hidden');
}

function resetAll() {
    resetUpload();
    state.processedData = [];
    state.stats = {};

    elements.resultsSection.classList.add('hidden');
    elements.progressSection.classList.add('hidden');
}

// ============================================
// Processing Logic
// ============================================
async function processFile() {
    // Find column names dynamically
    const colMedio = state.columns.find(c => c.toUpperCase() === 'MEDIO') || 'MEDIO';
    const colDia = state.columns.find(c => c.toUpperCase() === 'DIA') || 'DIA';
    const colEmisora = state.columns.find(c => c.includes('EMISORA') || c.includes('SITE')) || 'EMISORA/SITE';
    const colVersion = state.columns.find(c => c.toUpperCase() === 'VERSION') || 'VERSION';
    const colRegion = state.columns.find(c => c.includes('REGION') || c.includes('ÁMBITO') || c.includes('AMBITO')) || 'REGION/ÁMBITO';
    const colPrograma = state.columns.find(c => c.includes('PROGRAMA') || c.includes('TIPO')) || 'PROGRAMA/TIPO DE SITE';
    const colSpots = state.columns.find(c => c.toUpperCase().includes('SPOT')) || 'SPOTS';

    // Show progress
    elements.previewSection.classList.add('hidden');
    elements.configSection.classList.add('hidden');
    elements.progressSection.classList.remove('hidden');
    updateProgress(0, 'Preparando datos...');

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        // Step 1: First pass - mark emisoras that are automatically NACIONAL
        updateProgress(10, 'Identificando emisoras nacionales...');
        await new Promise(resolve => setTimeout(resolve, 50));

        // Get audiencia config
        updateAudienciaConfig();

        // Initialize processed data with classification and calculations
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

        // Step 2: Create groups (only for non-emisora-nacional records)
        updateProgress(30, 'Creando grupos...');
        await new Promise(resolve => setTimeout(resolve, 50));

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

        // Step 3: Classify each row based on geographic distribution
        updateProgress(50, 'Clasificando por distribución geográfica...');
        await new Promise(resolve => setTimeout(resolve, 50));

        let nationalGroups = 0;

        // Process each group
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

        // Step 4: Calculate statistics
        updateProgress(80, 'Calculando estadísticas...');
        await new Promise(resolve => setTimeout(resolve, 50));

        const distribution = {};
        let nationalRecords = 0;

        state.processedData.forEach(row => {
            const clasificacion = row['CLASIFICACION_GEOGRAFICA'];
            distribution[clasificacion] = (distribution[clasificacion] || 0) + 1;
            if (clasificacion === 'NACIONAL') nationalRecords++;
        });

        state.stats = {
            totalRecords: state.processedData.length,
            nationalRecords: nationalRecords,
            totalGroups: groups.size,
            nationalGroups: nationalGroups,
            distribution: distribution
        };

        // Step 5: Show results
        updateProgress(100, '¡Completado!');
        await new Promise(resolve => setTimeout(resolve, 300));

        showResults();

    } catch (error) {
        console.error('Error processing file:', error);
        alert('Error al procesar el archivo: ' + error.message);
        elements.progressSection.classList.add('hidden');
        elements.previewSection.classList.remove('hidden');
        elements.configSection.classList.remove('hidden');
    }
}

function createGroupKey(row, colDia, colMedio, colEmisora, colVersion) {
    return `${row[colDia]}|${row[colMedio]}|${row[colEmisora]}|${row[colVersion]}`;
}

function normalizeRegion(region) {
    if (!region) return '';
    return String(region).toUpperCase().trim();
}

function updateProgress(percent, text) {
    elements.progressFill.style.width = `${percent}%`;
    elements.progressText.textContent = text;
}

// ============================================
// Results Display
// ============================================
function showResults() {
    elements.progressSection.classList.add('hidden');
    elements.resultsSection.classList.remove('hidden');

    // Update stats
    elements.totalRecords.textContent = formatNumber(state.stats.totalRecords);
    elements.nationalRecords.textContent = formatNumber(state.stats.nationalRecords);
    elements.totalGroups.textContent = formatNumber(state.stats.totalGroups);
    elements.nationalGroups.textContent = formatNumber(state.stats.nationalGroups);

    // Build distribution chart
    buildDistributionChart();
}

function buildDistributionChart() {
    const distribution = state.stats.distribution;
    const total = state.stats.totalRecords;

    // Sort by count descending
    const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

    elements.distributionChart.innerHTML = '';

    sorted.forEach(([label, count]) => {
        const percent = (count / total) * 100;
        const isNational = label === 'NACIONAL';

        const item = document.createElement('div');
        item.className = 'distribution-item';
        item.innerHTML = `
            <span class="distribution-label">${label}</span>
            <div class="distribution-bar-container">
                <div class="distribution-bar ${isNational ? 'national' : 'city'}"
                     style="width: ${percent}%"></div>
            </div>
            <span class="distribution-value">${formatNumber(count)} (${percent.toFixed(1)}%)</span>
        `;

        elements.distributionChart.appendChild(item);
    });
}

// ============================================
// Download with Pivot Table
// ============================================
function downloadResult() {
    try {
        // Create new workbook
        const wb = XLSX.utils.book_new();

        // Sheet 1: Data clasificada
        const ws = XLSX.utils.json_to_sheet(state.processedData);
        XLSX.utils.book_append_sheet(wb, ws, 'Clasificado');

        // Sheet 2: Tabla Dinámica (Pivot)
        if (state.config.ambito === 'regiones') {
            const pivotData = createPivotTable();
            const wsPivot = XLSX.utils.json_to_sheet(pivotData);
            XLSX.utils.book_append_sheet(wb, wsPivot, 'Tabla Dinamica');
        }

        // Generate filename
        const originalName = state.file.name.replace(/\.[^/.]+$/, '');
        const fileName = `${originalName}_CLASIFICADO.xlsx`;

        // Download
        XLSX.writeFile(wb, fileName);

    } catch (error) {
        console.error('Error downloading file:', error);
        alert('Error al descargar el archivo');
    }
}

function createPivotTable() {
    // Find column names
    const colEmisora = state.columns.find(c => c.includes('EMISORA') || c.includes('SITE')) || 'EMISORA/SITE';
    const colPrograma = state.columns.find(c => c.includes('PROGRAMA') || c.includes('TIPO')) || 'PROGRAMA/TIPO DE SITE';
    const colSpots = state.columns.find(c => c.toUpperCase().includes('SPOT')) || 'SPOTS';
    const colDia = state.columns.find(c => c.toUpperCase() === 'DIA') || 'DIA';

    // Create aggregated data
    const pivotMap = new Map();

    state.processedData.forEach(row => {
        // Extract year and month from DIA column (format: DD/MM/YYYY or similar)
        const diaValue = row[colDia] || '';
        let año = '';
        let mes = '';

        // Try to parse date
        if (diaValue) {
            const parts = diaValue.split('/');
            if (parts.length >= 3) {
                año = parts[2];
                mes = getMonthName(parseInt(parts[1]));
            }
        }

        const emisora = row[colEmisora] || '';
        const programa = row[colPrograma] || '';
        const spots = parseFloat(row[colSpots]) || 0;
        const valorCalculado = row['VALOR_CALCULADO'] || 0;
        const zona = row['ZONA'] || '';
        const ciudad = row['CLASIFICACION_GEOGRAFICA'] || '';

        // Create unique key for pivot
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
    });

    // Convert to array and sort
    const pivotArray = Array.from(pivotMap.values());

    // Sort by AÑO, MES, EMISORA, PROGRAMA
    pivotArray.sort((a, b) => {
        if (a['AÑO'] !== b['AÑO']) return a['AÑO'].localeCompare(b['AÑO']);
        if (a['MES'] !== b['MES']) return getMonthOrder(a['MES']) - getMonthOrder(b['MES']);
        if (a['EMISORA/SITE'] !== b['EMISORA/SITE']) return a['EMISORA/SITE'].localeCompare(b['EMISORA/SITE']);
        return a['PROGRAMA/TIPO DE SITE'].localeCompare(b['PROGRAMA/TIPO DE SITE']);
    });

    // Round values
    pivotArray.forEach(row => {
        row['SUMA_SPOTS'] = Math.round(row['SUMA_SPOTS'] * 100) / 100;
        row['VALOR_AUDIENCIA'] = Math.round(row['VALOR_AUDIENCIA'] * 100) / 100;
    });

    return pivotArray;
}

function getMonthName(monthNum) {
    const months = [
        '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthNum] || '';
}

function getMonthOrder(monthName) {
    const months = {
        'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4,
        'Mayo': 5, 'Junio': 6, 'Julio': 7, 'Agosto': 8,
        'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'Diciembre': 12
    };
    return months[monthName] || 0;
}

// ============================================
// Utilities
// ============================================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(num) {
    return num.toLocaleString('es-PE');
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', initEventListeners);
