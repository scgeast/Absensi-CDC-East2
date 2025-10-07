// Overtime Form Functions
import { db } from './firebase-config.js';
import { 
    currentUser, showLoading, showNotification, 
    formatDateForShift, shiftMatrix 
} from './utils.js';

export let rekapLemburData = [];
export let currentRekapRows = [];
export const plantOptions = ["Denpasar2", "Gianyar", "Manyar", "Manukan", "Gempol", "Kediri", "Krian"];

// PERBAIKAN: Fungsi untuk inisialisasi Overtime Form
export function initOvertimeForm() {
    // PERBAIKAN: Tampilkan form yang berbeda berdasarkan role
    if (currentUser.role === 'admin') {
        document.getElementById('userOvertimeForm').style.display = 'none';
        document.getElementById('adminOvertimeDetail').style.display = 'block';
        document.getElementById('overtimeFilterSection').style.display = 'flex';
        setupOvertimeEmployeeFilter();
        loadAllOvertimeData();
    } else {
        document.getElementById('userOvertimeForm').style.display = 'block';
        document.getElementById('adminOvertimeDetail').style.display = 'block';
        document.getElementById('overtimeFilterSection').style.display = 'none';
        
        const rekapDate = document.getElementById('rekapDate');
        if (rekapDate) {
            rekapDate.valueAsDate = new Date();
        }
        
        const tbody = document.getElementById('rekapLemburTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            currentRekapRows = [];
            addRekapRow();
        }
        
        loadUserOvertimeData();
    }
    
    // Setup event listeners
    const saveBtn = document.getElementById('saveRekapLembur');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveRekapLembur);
    }
    
    // Event listener untuk filter date change
    const startDateFilter = document.getElementById('startDateOvertimeOutput');
    const endDateFilter = document.getElementById('endDateOvertimeOutput');
    if (startDateFilter) startDateFilter.addEventListener('change', updateOvertimeDisplay);
    if (endDateFilter) endDateFilter.addEventListener('change', updateOvertimeDisplay);
}

// PERBAIKAN: Fungsi untuk setup filter employee pada overtime detail
function setupOvertimeEmployeeFilter() {
    const overtimeEmployeeFilter = document.getElementById('overtimeEmployeeFilter');
    if (!overtimeEmployeeFilter) return;
    
    // Clear existing options
    overtimeEmployeeFilter.innerHTML = '<option value="all">All Employees</option>';
    
    // Get all unique employee names from global absensiData
    const uniqueNames = new Set();
    if (window.absensiData && window.absensiData.length > 0) {
        window.absensiData.forEach(employee => {
            if (employee.name) uniqueNames.add(employee.name);
        });
    }
    
    if (uniqueNames.size === 0) {
        window.initialEmployees.forEach(employee => {
            uniqueNames.add(employee.name);
        });
    }
    
    // Add options to dropdown
    uniqueNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        overtimeEmployeeFilter.appendChild(option);
    });
    
    // Add event listener for filter change
    overtimeEmployeeFilter.addEventListener('change', updateOvertimeDetailTable);
}

// PERBAIKAN: Fungsi untuk edit overtime record di overtime detail (admin only)
export async function editOvertimeDetailRecord(recordId) {
    if (currentUser.role !== 'admin') {
        showNotification('Only admin can edit overtime records', 'error');
        return;
    }
    
    const record = rekapLemburData.find(r => r.id === recordId);
    if (!record) return;
    
    // Tampilkan form edit
    document.getElementById('rekapDate').value = record.date;
    document.getElementById('rekapStartTime').value = record.startTime;
    document.getElementById('rekapEndTime').value = record.endTime;
    document.getElementById('uraianTugas').value = record.taskDescription;
    
    // Isi tabel dengan data yang ada
    const tbody = document.getElementById('rekapLemburTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (record.tableData && record.tableData.length > 0) {
        record.tableData.forEach((rowData, index) => {
            const row = document.createElement('tr');
            const rowId = Date.now() + index;
            row.setAttribute('data-row-id', rowId);
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><input type="text" class="form-control form-control-sm total-project" data-row="${rowId}" value="${rowData.totalProject || ''}"></td>
                <td>
                    <input type="number" class="form-control form-control-sm total-plant" 
                           data-row="${rowId}" min="1" max="7" value="${rowData.totalPlant || 1}">
                </td>
                <td>
                    <div class="plant-select-container" id="plantContainer-${rowId}">
                        ${generatePlantSelectors(rowData.plantNames, rowId, rowData.totalPlant || 1)}
                    </div>
                </td>
                <td><input type="text" class="form-control form-control-sm volume" data-row="${rowId}" value="${rowData.volume || ''}"></td>
                <td>
                    <button type="button" class="btn btn-danger btn-sm" onclick="removeRekapRow(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
            currentRekapRows.push(rowId);
            
            // Setup event listener untuk total plant change
            const totalPlantInput = row.querySelector('.total-plant');
            if (totalPlantInput) {
                totalPlantInput.addEventListener('change', function() {
                    updatePlantSelectors(this);
                });
            }
        });
    } else {
        addRekapRow();
    }
    
    // Setup event listener untuk save dengan update
    const saveBtn = document.getElementById('saveRekapLembur');
    if (saveBtn) {
        saveBtn.onclick = async function() {
            await updateOvertimeRecord(recordId);
        };
        saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Update';
    }
    
    showNotification('Overtime record loaded for editing', 'info');
}

// PERBAIKAN: Fungsi untuk update overtime record
export async function updateOvertimeRecord(recordId) {
    const date = document.getElementById('rekapDate').value;
    const startTime = document.getElementById('rekapStartTime').value;
    const endTime = document.getElementById('rekapEndTime').value;
    const taskDescription = document.getElementById('uraianTugas').value;
    
    if (!date || !startTime || !endTime) {
        showNotification('Please fill date, start time, and end time', 'error');
        return;
    }
    
    // Hitung overtime duration
    const overtimeDuration = calculateOvertimeDuration(startTime, endTime);
    
    // Kumpulkan data dari tabel
    const tableData = [];
    const rows = document.querySelectorAll('#rekapLemburTableBody tr');
    
    let hasValidData = false;
    rows.forEach(row => {
        const rowId = row.getAttribute('data-row-id');
        const totalProject = row.querySelector('.total-project').value;
        const totalPlant = parseInt(row.querySelector('.total-plant').value) || 1;
        const volume = row.querySelector('.volume').value;
        
        // Kumpulkan plant names
        const plantNames = [];
        const plantSelects = row.querySelectorAll(`.plant-select[data-row="${rowId}"]`);
        plantSelects.forEach(select => {
            if (select.value) {
                plantNames.push(select.value);
            }
        });
        
        if (totalProject || volume || plantNames.length > 0) {
            tableData.push({
                totalProject,
                totalPlant,
                plantNames: plantNames.join(', '),
                volume
            });
            hasValidData = true;
        }
    });
    
    if (!hasValidData && !taskDescription) {
        showNotification('Please fill at least one row or task description', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Update ke Firestore
        await db.collection('overtimeRecords').doc(recordId).update({
            date,
            startTime,
            endTime,
            overtimeDuration,
            tableData,
            taskDescription,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // PERBAIKAN: Update Overtime Calculation juga
        await updateRelatedOvertimeCalculation(recordId, date, startTime, endTime, overtimeDuration, taskDescription);
        
        // Update data lokal
        const recordIndex = rekapLemburData.findIndex(r => r.id === recordId);
        if (recordIndex !== -1) {
            rekapLemburData[recordIndex] = {
                ...rekapLemburData[recordIndex],
                date,
                startTime,
                endTime,
                overtimeDuration,
                tableData,
                taskDescription
            };
        }
        
        // Update tampilan
        updateOvertimeDetailTable();
        updateTotalOvertime();
        
        // Reset form
        resetOvertimeForm();
        
        // Reset save button
        const saveBtn = document.getElementById('saveRekapLembur');
        if (saveBtn) {
            saveBtn.onclick = saveRekapLembur;
            saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Save';
        }
        
        showNotification('Overtime record updated successfully', 'success');
        
    } catch (error) {
        console.error('Error updating overtime record:', error);
        showNotification('Error updating overtime record: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// PERBAIKAN: Fungsi untuk menghapus overtime record di overtime detail
export async function deleteOvertimeDetailRecord(recordId) {
    if (currentUser.role !== 'admin') {
        showNotification('Only admin can delete overtime records', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this overtime record?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Dapatkan data record sebelum dihapus
        const record = rekapLemburData.find(r => r.id === recordId);
        
        // Hapus dari Firestore
        await db.collection('overtimeRecords').doc(recordId).delete();
        
        // PERBAIKAN: Update Overtime Calculation juga
        if (record) {
            await removeRelatedOvertimeCalculation(record.employeeName, record.date);
        }
        
        // Hapus dari data lokal
        rekapLemburData = rekapLemburData.filter(record => record.id !== recordId);
        
        // Update tampilan
        updateOvertimeDetailTable();
        updateTotalOvertime();
        
        showNotification('Overtime record deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting overtime record:', error);
        showNotification('Error deleting overtime record: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Fungsi untuk menambah row pada form overtime
export function addRekapRow() {
    const tbody = document.getElementById('rekapLemburTableBody');
    if (!tbody) return;
    
    const rowCount = tbody.rows.length;
    const rowId = Date.now() + rowCount;
    
    const row = document.createElement('tr');
    row.setAttribute('data-row-id', rowId);
    row.innerHTML = `
        <td>${rowCount + 1}</td>
        <td><input type="text" class="form-control form-control-sm total-project" data-row="${rowId}"></td>
        <td>
            <input type="number" class="form-control form-control-sm total-plant" 
                   data-row="${rowId}" min="1" max="7" value="1">
        </td>
        <td>
            <div class="plant-select-container" id="plantContainer-${rowId}">
                <select class="form-control form-control-sm plant-select" data-row="${rowId}">
                    <option value="">Select Plant</option>
                    ${plantOptions.map(plant => `<option value="${plant}">${plant}</option>`).join('')}
                </select>
            </div>
        </td>
        <td><input type="text" class="form-control form-control-sm volume" data-row="${rowId}"></td>
        <td>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeRekapRow(this)">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(row);
    currentRekapRows.push(rowId);
    
    const totalPlantInput = row.querySelector('.total-plant');
    if (totalPlantInput) {
        totalPlantInput.addEventListener('change', function() {
            updatePlantSelectors(this);
        });
    }
}

// Fungsi untuk menghapus row
export function removeRekapRow(button) {
    const row = button.closest('tr');
    const rowId = row.getAttribute('data-row-id');
    
    // Hapus dari array current rows
    currentRekapRows = currentRekapRows.filter(id => id != rowId);
    
    row.remove();
    updateRowNumbers();
}

// Fungsi untuk update nomor row
export function updateRowNumbers() {
    const rows = document.querySelectorAll('#rekapLemburTableBody tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

// Fungsi untuk update plant selectors berdasarkan total plant
export function updatePlantSelectors(input) {
    const rowId = input.getAttribute('data-row');
    const totalPlant = parseInt(input.value) || 1;
    const plantContainer = document.getElementById(`plantContainer-${rowId}`);
    
    if (!plantContainer) return;
    
    // Clear existing selects
    plantContainer.innerHTML = '';
    
    // Add new selects based on total plant
    for (let i = 0; i < totalPlant; i++) {
        const select = document.createElement('select');
        select.className = 'form-control form-control-sm plant-select';
        select.setAttribute('data-row', rowId);
        select.innerHTML = `
            <option value="">Select Plant</option>
            ${plantOptions.map(plant => `<option value="${plant}">${plant}</option>`).join('')}
        `;
        plantContainer.appendChild(select);
        
        // Add spacing between selects
        if (i < totalPlant - 1) {
            plantContainer.appendChild(document.createElement('br'));
        }
    }
}

// Fungsi untuk generate plant selectors
function generatePlantSelectors(plantNames, rowId, totalPlant) {
    if (!plantNames) {
        return `<select class="form-control form-control-sm plant-select" data-row="${rowId}">
            <option value="">Select Plant</option>
            ${plantOptions.map(plant => `<option value="${plant}">${plant}</option>`).join('')}
        </select>`;
    }
    
    const plants = plantNames.split(', ');
    let html = '';
    for (let i = 0; i < totalPlant; i++) {
        const plant = plants[i] || '';
        html += `<select class="form-control form-control-sm plant-select" data-row="${rowId}">
            <option value="">Select Plant</option>
            ${plantOptions.map(p => `<option value="${p}" ${p === plant ? 'selected' : ''}>${p}</option>`).join('')}
        </select>`;
        if (i < totalPlant - 1) {
            html += '<br>';
        }
    }
    return html;
}

// PERBAIKAN: Fungsi untuk menyimpan data overtime
export async function saveRekapLembur() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    const date = document.getElementById('rekapDate').value;
    const startTime = document.getElementById('rekapStartTime').value;
    const endTime = document.getElementById('rekapEndTime').value;
    const taskDescription = document.getElementById('uraianTugas').value;
    
    if (!date || !startTime || !endTime) {
        showNotification('Please fill date, start time, and end time', 'error');
        return;
    }
    
    // Hitung overtime duration dengan support untuk overnight overtime
    const overtimeDuration = calculateOvertimeDuration(startTime, endTime);
    
    // Kumpulkan data dari tabel
    const tableData = [];
    const rows = document.querySelectorAll('#rekapLemburTableBody tr');
    
    let hasValidData = false;
    rows.forEach(row => {
        const rowId = row.getAttribute('data-row-id');
        const totalProject = row.querySelector('.total-project').value;
        const totalPlant = parseInt(row.querySelector('.total-plant').value) || 1;
        const volume = row.querySelector('.volume').value;
        
        // Kumpulkan plant names
        const plantNames = [];
        const plantSelects = row.querySelectorAll(`.plant-select[data-row="${rowId}"]`);
        plantSelects.forEach(select => {
            if (select.value) {
                plantNames.push(select.value);
            }
        });
        
        // Hanya tambahkan jika ada data yang valid
        if (totalProject || volume || plantNames.length > 0) {
            tableData.push({
                totalProject,
                totalPlant,
                plantNames: plantNames.join(', '),
                volume
            });
            hasValidData = true;
        }
    });
    
    if (!hasValidData && !taskDescription) {
        showNotification('Please fill at least one row or task description', 'error');
        return;
    }
    
    // Buat data untuk disimpan
    const overtimeRecord = {
        employeeName: currentUser.name,
        employeeEmail: currentUser.email,
        date,
        startTime,
        endTime,
        overtimeDuration,
        tableData,
        taskDescription,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        showLoading(true);
        
        // Simpan ke Firestore
        const docRef = await db.collection('overtimeRecords').add(overtimeRecord);
        overtimeRecord.id = docRef.id;
        
        // Tambahkan ke data lokal
        rekapLemburData.push(overtimeRecord);
        
        // PERBAIKAN: Update Overtime Calculation secara otomatis
        await updateOvertimeCalculation(overtimeRecord);
        
        // Update tampilan
        updateOvertimeDetailTable();
        updateTotalOvertime();
        
        // Reset form
        resetOvertimeForm();
        
        showNotification('Overtime data saved successfully and integrated with Overtime Calculation', 'success');
        
    } catch (error) {
        console.error('Error saving overtime data:', error);
        showNotification('Error saving overtime data: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// PERBAIKAN: Fungsi untuk menghitung durasi overtime dengan support overnight
export function calculateOvertimeDuration(startTime, endTime) {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    // PERBAIKAN: Jika end time di hari berikutnya (setelah tengah malam)
    if (end < start) {
        end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
}

// PERBAIKAN: Fungsi untuk memuat semua data overtime (untuk admin)
export async function loadAllOvertimeData() {
    try {
        let query;
        if (currentUser.role === 'admin') {
            // Admin bisa melihat semua data
            query = db.collection('overtimeRecords').orderBy('date', 'desc');
        } else {
            // User biasa hanya bisa melihat data sendiri
            query = db.collection('overtimeRecords')
                .where('employeeEmail', '==', currentUser.email)
                .orderBy('date', 'desc');
        }
        
        const querySnapshot = await query.get();
        
        rekapLemburData = [];
        querySnapshot.forEach(doc => {
            rekapLemburData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updateOvertimeDetailTable();
        updateTotalOvertime();
        
    } catch (error) {
        console.error('Error loading all overtime data:', error);
    }
}

// PERBAIKAN: Fungsi untuk memuat data overtime user
export async function loadUserOvertimeData() {
    if (!currentUser) return;
    
    try {
        let query;
        if (currentUser.role === 'admin') {
            query = db.collection('overtimeRecords').orderBy('date', 'desc');
        } else {
            query = db.collection('overtimeRecords')
                .where('employeeEmail', '==', currentUser.email)
                .orderBy('date', 'desc');
        }
        
        const querySnapshot = await query.get();
        
        rekapLemburData = [];
        querySnapshot.forEach(doc => {
            rekapLemburData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updateOvertimeDetailTable();
        updateTotalOvertime();
        
    } catch (error) {
        console.error('Error loading overtime data:', error);
    }
}

// PERBAIKAN: Fungsi untuk update tabel detail overtime dengan kolom Duration
export function updateOvertimeDetailTable() {
    const tbody = document.getElementById('overtimeDetailTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Filter data berdasarkan date range
    const startDate = document.getElementById('startDateOvertimeOutput').valueAsDate;
    const endDate = document.getElementById('endDateOvertimeOutput').valueAsDate;
    
    // Filter berdasarkan employee (untuk admin) atau user saat ini (untuk user biasa)
    let filteredData = rekapLemburData;
    
    if (currentUser.role === 'admin') {
        const employeeFilter = document.getElementById('overtimeEmployeeFilter');
        if (employeeFilter && employeeFilter.value !== 'all') {
            filteredData = rekapLemburData.filter(record => record.employeeName === employeeFilter.value);
        }
    } else {
        // PERBAIKAN: Untuk user biasa, hanya tampilkan data miliknya sendiri
        filteredData = rekapLemburData.filter(record => record.employeeEmail === currentUser.email);
        
        // Juga filter berdasarkan date range yang dipilih
        if (startDate && endDate) {
            filteredData = filteredData.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= startDate && recordDate <= endDate;
            });
        }
    }
    
    // Filter berdasarkan date range untuk admin
    if (currentUser.role === 'admin' && startDate && endDate) {
        filteredData = filteredData.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= startDate && recordDate <= endDate;
        });
    }
    
    if (filteredData.length === 0) {
        const row = document.createElement('tr');
        const colSpan = currentUser.role === 'admin' ? '12' : '11';
        row.innerHTML = `<td colspan="${colSpan}" class="text-center">No overtime data found</td>`;
        tbody.appendChild(row);
        return;
    }
    
    let rowNumber = 1;
    filteredData.forEach(record => {
        // Jika ada data tabel, tampilkan setiap baris
        if (record.tableData && record.tableData.length > 0) {
            record.tableData.forEach((tableRow, index) => {
                const row = document.createElement('tr');
                // PERBAIKAN: Tambahkan class untuk user biasa
                if (currentUser.role === 'user') {
                    row.classList.add('user-overtime-detail');
                }
                row.innerHTML = `
                    <td>${rowNumber++}</td>
                    <td>${record.employeeName}</td>
                    <td>${index === 0 ? record.date : ''}</td>
                    <td>${index === 0 ? record.startTime : ''}</td>
                    <td>${index === 0 ? record.endTime : ''}</td>
                    <td>${index === 0 ? record.overtimeDuration : ''}</td>
                    <td>${tableRow.totalProject || ''}</td>
                    <td>${tableRow.totalPlant || ''}</td>
                    <td>${tableRow.plantNames || ''}</td>
                    <td>${tableRow.volume || ''}</td>
                    <td>${index === 0 ? record.taskDescription : ''}</td>
                    ${currentUser.role === 'admin' ? 
                        `<td>
                            ${index === 0 ? `
                                <button class="btn-edit" onclick="editOvertimeDetailRecord('${record.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-delete" onclick="deleteOvertimeDetailRecord('${record.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </td>` : 
                        '<td></td>'
                    }
                `;
                tbody.appendChild(row);
            });
        } else {
            // Jika tidak ada data tabel, tampilkan satu baris saja
            const row = document.createElement('tr');
            if (currentUser.role === 'user') {
                row.classList.add('user-overtime-detail');
            }
            row.innerHTML = `
                <td>${rowNumber++}</td>
                <td>${record.employeeName}</td>
                <td>${record.date}</td>
                <td>${record.startTime}</td>
                <td>${record.endTime}</td>
                <td>${record.overtimeDuration}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td>${record.taskDescription}</td>
                ${currentUser.role === 'admin' ? 
                    `<td>
                        <button class="btn-edit" onclick="editOvertimeDetailRecord('${record.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="deleteOvertimeDetailRecord('${record.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>` : 
                    '<td></td>'
                }
            `;
            tbody.appendChild(row);
        }
    });
    
    // Update total overtime
    updateTotalOvertime();
}

// PERBAIKAN: Fungsi untuk update total overtime
export function updateTotalOvertime() {
    const totalOvertimeElement = document.getElementById('totalOvertimeValue');
    if (!totalOvertimeElement) return;
    
    // Filter data berdasarkan date range
    const startDate = document.getElementById('startDateOvertimeOutput').valueAsDate;
    const endDate = document.getElementById('endDateOvertimeOutput').valueAsDate;
    
    // Filter berdasarkan employee (untuk admin)
    let filteredData = rekapLemburData;
    if (currentUser.role === 'admin') {
        const employeeFilter = document.getElementById('overtimeEmployeeFilter');
        if (employeeFilter && employeeFilter.value !== 'all') {
            filteredData = rekapLemburData.filter(record => record.employeeName === employeeFilter.value);
        }
    }
    
    // Filter berdasarkan date range
    if (startDate && endDate) {
        filteredData = filteredData.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= startDate && recordDate <= endDate;
        });
    }
    
    // Hitung total overtime
    let totalMinutes = 0;
    filteredData.forEach(record => {
        const [hours, minutes] = record.overtimeDuration.split(':').map(Number);
        totalMinutes += hours * 60 + minutes;
    });
    
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    totalOvertimeElement.textContent = 
        `${String(totalHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
}

// Fungsi untuk update overtime display saat filter berubah
export function updateOvertimeDisplay() {
    updateOvertimeDetailTable();
}

// Fungsi untuk reset form overtime
export function resetOvertimeForm() {
    const rekapDate = document.getElementById('rekapDate');
    const rekapStartTime = document.getElementById('rekapStartTime');
    const rekapEndTime = document.getElementById('rekapEndTime');
    const uraianTugas = document.getElementById('uraianTugas');
    
    if (rekapDate) rekapDate.valueAsDate = new Date();
    if (rekapStartTime) rekapStartTime.value = '';
    if (rekapEndTime) rekapEndTime.value = '';
    if (uraianTugas) uraianTugas.value = '';
    
    // Reset tabel
    const tbody = document.getElementById('rekapLemburTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        currentRekapRows = [];
        addRekapRow();
    }
}

// =============================================
// PERBAIKAN INTEGRASI OVERTIME FORM KE OVERTIME CALCULATION
// =============================================

// PERBAIKAN: Fungsi untuk integrasi dengan Overtime Calculation
async function updateOvertimeCalculation(overtimeRecord) {
    if (!currentUser) return;
    
    try {
        // Format tanggal untuk pencarian (DD/MM/YYYY)
        const formattedDate = formatDateForShift(new Date(overtimeRecord.date));
        
        console.log('Mencari data overtime calculation untuk:', {
            employee: overtimeRecord.employeeName,
            date: formattedDate,
            duration: overtimeRecord.overtimeDuration,
            task: overtimeRecord.taskDescription
        });
        
        // Cari data overtime calculation yang sesuai berdasarkan nama dan tanggal
        const overtimeSnapshot = await db.collection('overtime')
            .where('name', '==', overtimeRecord.employeeName)
            .where('date', '==', formattedDate)
            .get();
        
        if (!overtimeSnapshot.empty) {
            const batch = db.batch();
            let updatedCount = 0;
            
            overtimeSnapshot.forEach(doc => {
                // Update existing record
                const docRef = db.collection('overtime').doc(doc.id);
                
                batch.update(docRef, {
                    rkpPIC: overtimeRecord.overtimeDuration,
                    remarks: overtimeRecord.taskDescription || 'Overtime recorded',
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                updatedCount++;
            });
            
            await batch.commit();
            console.log(`Berhasil mengupdate ${updatedCount} record di Firestore`);
            
        } else {
            // Jika tidak ditemukan record yang cocok, buat record baru
            console.log('Tidak ditemukan record yang cocok, membuat record baru');
            await createNewOvertimeCalculationRecord(overtimeRecord, formattedDate);
        }
        
        console.log('Integrasi overtime calculation selesai');
        
    } catch (error) {
        console.error('Error updating overtime calculation:', error);
    }
}

// PERBAIKAN: Fungsi untuk membuat record overtime calculation baru dengan Duration
async function createNewOvertimeCalculationRecord(overtimeRecord, formattedDate) {
    try {
        // Buat data dasar untuk overtime calculation
        const newOvertimeCalc = {
            area: "CDC East",
            name: overtimeRecord.employeeName,
            position: "",
            date: formattedDate,
            shift: "",
            shiftCheckIn: "",
            shiftCheckOut: "",
            wtNormal: "",
            actualCheckIn: "",
            actualCheckOut: "",
            overTime: "",
            cekRMC: "",
            rkpPIC: overtimeRecord.overtimeDuration,
            rmcShiftCheckOut: "",
            remarks: overtimeRecord.taskDescription || 'Overtime recorded',
            createdFromOvertimeForm: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Coba dapatkan data employee untuk melengkapi informasi
        if (window.absensiData) {
            const employeeData = window.absensiData.find(emp => emp.name === overtimeRecord.employeeName);
            if (employeeData) {
                newOvertimeCalc.area = employeeData.area || "CDC East";
                newOvertimeCalc.position = employeeData.position || "";
                
                // Coba dapatkan shift untuk tanggal tersebut
                if (employeeData.shifts && employeeData.shifts[formattedDate]) {
                    const shiftCode = employeeData.shifts[formattedDate];
                    newOvertimeCalc.shift = shiftCode;
                    
                    // Dapatkan detail shift dari matrix
                    const shiftDetails = shiftMatrix[employeeData.position] && shiftMatrix[employeeData.position][shiftCode];
                    if (shiftDetails) {
                        newOvertimeCalc.shiftCheckIn = shiftDetails.checkIn;
                        newOvertimeCalc.shiftCheckOut = shiftDetails.checkOut;
                        newOvertimeCalc.wtNormal = shiftDetails.hours;
                    }
                }
            }
        }
        
        // Simpan ke Firestore
        const docRef = await db.collection('overtime').add(newOvertimeCalc);
        console.log('Created new overtime calculation record:', newOvertimeCalc);
        
    } catch (error) {
        console.error('Error creating new overtime calculation record:', error);
    }
}

// PERBAIKAN: Fungsi untuk update overtime calculation terkait
async function updateRelatedOvertimeCalculation(recordId, date, startTime, endTime, overtimeDuration, taskDescription) {
    try {
        const record = rekapLemburData.find(r => r.id === recordId);
        if (!record) return;
        
        // Format tanggal untuk pencarian
        const formattedDate = formatDateForShift(new Date(date));
        
        // Cari data overtime calculation yang sesuai
        const overtimeSnapshot = await db.collection('overtime')
            .where('name', '==', record.employeeName)
            .where('date', '==', formattedDate)
            .get();
        
        if (!overtimeSnapshot.empty) {
            const batch = db.batch();
            
            overtimeSnapshot.forEach(doc => {
                const docRef = db.collection('overtime').doc(doc.id);
                batch.update(docRef, {
                    rkpPIC: overtimeDuration,
                    remarks: taskDescription || 'Overtime recorded',
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            console.log('Updated related overtime calculation records');
        }
        
    } catch (error) {
        console.error('Error updating related overtime calculation:', error);
    }
}

// PERBAIKAN: Fungsi untuk menghapus overtime calculation terkait
async function removeRelatedOvertimeCalculation(employeeName, date) {
    try {
        // Format tanggal untuk pencarian
        const formattedDate = formatDateForShift(new Date(date));
        
        // Cari data overtime calculation yang sesuai
        const overtimeSnapshot = await db.collection('overtime')
            .where('name', '==', employeeName)
            .where('date', '==', formattedDate)
            .get();
        
        if (!overtimeSnapshot.empty) {
            const batch = db.batch();
            
            overtimeSnapshot.forEach(doc => {
                const docRef = db.collection('overtime').doc(doc.id);
                batch.update(docRef, {
                    rkpPIC: "",
                    remarks: "",
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            console.log('Removed overtime data from related overtime calculation records');
        }
        
    } catch (error) {
        console.error('Error removing related overtime calculation:', error);
    }
}
