// ============================================
// Clasificador Geográfico de Medios
// ============================================

// Las 7 ciudades requeridas para clasificar como NACIONAL
const CIUDADES_NACIONAL = new Set([
    'LIMA', 'TRUJILLO', 'AREQUIPA', 'CUSCO', 'CHICLAYO', 'HUANCAYO', 'PIURA'
]);

// Estado de la aplicación
let state = {
    file: null,
    workbook: null,
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
    configSection: document.getElementById('configSection'),
    colDia: document.getElementById('colDia'),
    colMedio: document.getElementById('colMedio'),
    colEmisora: document.getElementById('colEmisora'),
    colVersion: document.getElementById('colVersion'),
    colRegion: document.getElementById('colRegion'),
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
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    const extension = file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(file.type) && !['xlsx', 'xls'].includes(extension)) {
        alert('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)');
        return;
    }

    state.file = file;

    // Show file info
    elements.fileName.textContent = file.name;
    elements.fileSize.textContent = formatFileSize(file.size);
    elements.fileInfo.classList.remove('hidden');
    elements.uploadBox.style.display = 'none';

    // Read file
    readExcelFile(file);
}

function readExcelFile(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            state.workbook = XLSX.read(data, { type: 'array', cellDates: true });

            // Get first sheet
            const sheetName = state.workbook.SheetNames[0];
            const worksheet = state.workbook.Sheets[sheetName];

            // Convert to JSON
            state.data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (state.data.length === 0) {
                alert('El archivo está vacío o no tiene datos válidos');
                resetUpload();
                return;
            }

            // Get columns
            state.columns = Object.keys(state.data[0]);

            // Populate column selectors
            populateColumnSelectors();

            // Show config section
            elements.configSection.classList.remove('hidden');

        } catch (error) {
            console.error('Error reading file:', error);
            alert('Error al leer el archivo. Asegúrate de que sea un Excel válido.');
            resetUpload();
        }
    };

    reader.readAsArrayBuffer(file);
}

function populateColumnSelectors() {
    const selectors = [
        { element: elements.colDia, keywords: ['dia', 'fecha', 'date', 'day'] },
        { element: elements.colMedio, keywords: ['medio', 'media', 'canal'] },
        { element: elements.colEmisora, keywords: ['emisora', 'site', 'emiso'] },
        { element: elements.colVersion, keywords: ['version', 'vers'] },
        { element: elements.colRegion, keywords: ['region', 'ambito', 'ámbito', 'ciudad', 'city'] }
    ];

    selectors.forEach(({ element, keywords }) => {
        element.innerHTML = '<option value="">-- Seleccionar --</option>';

        state.columns.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            element.appendChild(option);
        });

        // Auto-select based on keywords
        const colLower = state.columns.map(c => c.toLowerCase());
        for (const keyword of keywords) {
            const index = colLower.findIndex(c => c.includes(keyword));
            if (index !== -1) {
                element.value = state.columns[index];
                break;
            }
        }
    });
}

function resetUpload() {
    state.file = null;
    state.workbook = null;
    state.data = [];
    state.columns = [];

    elements.fileInput.value = '';
    elements.fileInfo.classList.add('hidden');
    elements.uploadBox.style.display = 'block';
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
    // Validate column selections
    const colDia = elements.colDia.value;
    const colMedio = elements.colMedio.value;
    const colEmisora = elements.colEmisora.value;
    const colVersion = elements.colVersion.value;
    const colRegion = elements.colRegion.value;

    if (!colDia || !colMedio || !colEmisora || !colVersion || !colRegion) {
        alert('Por favor, selecciona todas las columnas requeridas');
        return;
    }

    // Show progress
    elements.configSection.classList.add('hidden');
    elements.progressSection.classList.remove('hidden');
    updateProgress(0, 'Preparando datos...');

    // Process in chunks to avoid blocking UI
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        // Step 1: Create groups
        updateProgress(20, 'Creando grupos...');
        await new Promise(resolve => setTimeout(resolve, 50));

        const groups = new Map();

        state.data.forEach((row, index) => {
            const key = createGroupKey(row, colDia, colMedio, colEmisora, colVersion);
            const region = normalizeRegion(row[colRegion]);

            if (!groups.has(key)) {
                groups.set(key, { regions: new Map(), rows: [] });
            }

            const group = groups.get(key);
            group.rows.push(index);
            group.regions.set(region, (group.regions.get(region) || 0) + 1);
        });

        // Step 2: Classify each row
        updateProgress(50, 'Clasificando registros...');
        await new Promise(resolve => setTimeout(resolve, 50));

        // Initialize classification column
        state.processedData = state.data.map(row => ({
            ...row,
            'CLASIFICACION_GEOGRAFICA': row[colRegion]
        }));

        let nationalRecords = 0;
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
                            nationalRecords++;
                        } else {
                            state.processedData[rowIndex]['CLASIFICACION_GEOGRAFICA'] = region;
                        }
                    }
                });
            }
            // If not all cities present, keep original region (already set)
        });

        // Step 3: Calculate statistics
        updateProgress(80, 'Calculando estadísticas...');
        await new Promise(resolve => setTimeout(resolve, 50));

        const distribution = {};
        state.processedData.forEach(row => {
            const clasificacion = row['CLASIFICACION_GEOGRAFICA'];
            distribution[clasificacion] = (distribution[clasificacion] || 0) + 1;
        });

        state.stats = {
            totalRecords: state.processedData.length,
            nationalRecords: nationalRecords,
            totalGroups: groups.size,
            nationalGroups: nationalGroups,
            distribution: distribution
        };

        // Step 4: Show results
        updateProgress(100, '¡Completado!');
        await new Promise(resolve => setTimeout(resolve, 300));

        showResults();

    } catch (error) {
        console.error('Error processing file:', error);
        alert('Error al procesar el archivo: ' + error.message);
        elements.progressSection.classList.add('hidden');
        elements.configSection.classList.remove('hidden');
    }
}

function createGroupKey(row, colDia, colMedio, colEmisora, colVersion) {
    // Normalize date to string
    let dia = row[colDia];
    if (dia instanceof Date) {
        dia = dia.toISOString().split('T')[0];
    } else if (dia) {
        dia = String(dia);
    }

    return `${dia}|${row[colMedio]}|${row[colEmisora]}|${row[colVersion]}`;
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
