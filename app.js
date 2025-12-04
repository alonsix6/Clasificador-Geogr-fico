// ============================================
// Clasificador Geográfico de Medios
// ============================================

// Las 7 ciudades requeridas para clasificar como NACIONAL
const CIUDADES_NACIONAL = new Set([
    'LIMA', 'TRUJILLO', 'AREQUIPA', 'CUSCO', 'CHICLAYO', 'HUANCAYO', 'PIURA'
]);

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
    stats: {}
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

            // Show preview
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

    // Show progress
    elements.previewSection.classList.add('hidden');
    elements.progressSection.classList.remove('hidden');
    updateProgress(0, 'Preparando datos...');

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        // Step 1: First pass - mark emisoras that are automatically NACIONAL
        updateProgress(10, 'Identificando emisoras nacionales...');
        await new Promise(resolve => setTimeout(resolve, 50));

        // Initialize processed data with classification
        state.processedData = state.data.map(row => {
            const emisora = (row[colEmisora] || '').toUpperCase().trim();
            const isEmisoraNacional = EMISORAS_NACIONAL.has(emisora);

            return {
                ...row,
                'CLASIFICACION_GEOGRAFICA': isEmisoraNacional ? 'NACIONAL' : row[colRegion]
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
// Download
// ============================================
function downloadResult() {
    try {
        // Create new workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(state.processedData);

        XLSX.utils.book_append_sheet(wb, ws, 'Clasificado');

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
