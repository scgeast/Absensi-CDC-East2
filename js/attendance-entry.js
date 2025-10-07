// Attendance Entry Functions
import { db } from './firebase-config.js';
import { 
    showLoading, showNotification, formatDateForShift, 
    formatDateForHeader, parseDateFromString, shiftMatrix 
} from './utils.js';

export let absensiData = [];
export let absenTabelData = [];
export let outputData = [];
export let dateRangeMain = [];
export let dateRangeAbsenTabel = [];
export let currentFocusedCell = null;
export let isSaving = false;

// PERBAIKAN: Fungsi untuk apply filter tanggal Main folder
export function applyDateFilterMain() {
    const startDate = document.getElementById('startDateMain').valueAsDate;
    const endDate = document.getElementById('endDateMain').valueAsDate;
    
    if (!startDate || !endDate) return;
    
    dateRangeMain = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        dateRangeMain.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Batasi maksimal 31 hari untuk performa
    if (dateRangeMain.length > 31) {
        alert('Date range limited to 31 days for better performance');
        dateRangeMain = dateRangeMain.slice(0, 31);
        document.getElementById('endDateMain').valueAsDate = dateRangeMain[dateRangeMain.length - 1];
    }
    
    updateEntryTable();
}

// PERBAIKAN: Fungsi untuk apply filter tanggal Attendance Table
export function applyDateFilterAbsenTabel() {
    const startDate = document.getElementById('startDateAbsenTabel').valueAsDate;
    const endDate = document.getElementById('endDateAbsenTabel').valueAsDate;
    
    if (!startDate || !endDate) return;
    
    dateRangeAbsenTabel = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        dateRangeAbsenTabel.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Batasi maksimal 31 hari untuk performa
    if (dateRangeAbsenTabel.length > 31) {
        alert('Date range limited to 31 days for better performance');
        dateRangeAbsenTabel = dateRangeAbsenTabel.slice(0, 31);
        document.getElementById('endDateAbsenTabel').valueAsDate = dateRangeAbsenTabel[dateRangeAbsenTabel.length - 1];
    }
    
    // Update tables yang menggunakan filter Absen Tabel
    if (window.currentTab === "absen-tabel") {
        updateAbsenTabelTable();
    }
    if (window.currentTab === "cuti-detail") {
        if (window.generateCutiDetailData) {
            window.generateCutiDetailData();
        }
    }
}

// Update entry table
export function updateEntryTable() {
    const thead = document.querySelector('#entryTable thead tr');
    const tbody = document.querySelector('#entryTable tbody');
    
    if (!thead || !tbody) return;
    
    // Update header
    let headerHTML = '<th>Work Area</th><th>Employee Name</th><th>Job Position</th>';
    dateRangeMain.forEach(date => {
        headerHTML += `<th>${formatDateForHeader(date)}</th>`;
    });
    headerHTML += '<th>Action</th>';
    thead.innerHTML = headerHTML;
    
    // Update body
    updateEntryTableBody();
    initializeShiftColors();
    
    // Terapkan pengaturan header yang tersimpan
    loadHeaderSettings();
    
    // PERBAIKAN: Setup navigasi keyboard
    setupKeyboardNavigation();
}

export function updateEntryTableBody() {
    const tbody = document.querySelector('#entryTable tbody');
    if (!tbody) return;
    
    const employeesToShow = absensiData.length > 0 ? absensiData : window.initialEmployees;
    
    // Sort employees by default order
    const sortedEmployees = sortEmployeesByDefaultOrder(employeesToShow);
    
    let tbodyHTML = '';
    
    sortedEmployees.forEach(employee => {
        let rowHTML = `
            <td><input type="text" value="${employee.area || ''}" class="area-input read-only-input" readonly ondblclick="makeEditable(this)"></td>
            <td><input type="text" value="${employee.name || ''}" class="name-input read-only-input" readonly ondblclick="makeEditable(this)"></td>
            <td><input type="text" value="${employee.position || ''}" class="position-input read-only-input" readonly ondblclick="makeEditable(this)"></td>
        `;
        
        dateRangeMain.forEach(date => {
            const dateStr = formatDateForShift(date);
            const shiftValue = employee.shifts && employee.shifts[dateStr] ? employee.shifts[dateStr] : '';
            rowHTML += `<td><input type="text" value="${shiftValue}" class="shift-input editable-cell" onchange="updateShiftColor(this)"></td>`;
        });
        
        rowHTML += '<td><button class="btn-delete" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button></td>';
        tbodyHTML += `<tr>${rowHTML}</tr>`;
    });
    
    tbody.innerHTML = tbodyHTML;
}

// PERBAIKAN: Setup navigasi keyboard
export function setupKeyboardNavigation() {
    const table = document.querySelector('#entryTable');
    if (!table) return;
    
    table.addEventListener('keydown', function(e) {
        if (!currentFocusedCell) return;
        
        const cell = currentFocusedCell;
        const row = cell.closest('tr');
        const cells = Array.from(row.querySelectorAll('input.editable-cell'));
        const cellIndex = cells.indexOf(cell);
        
        let targetCell = null;
        
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                const prevRow = row.previousElementSibling;
                if (prevRow) {
                    const prevCells = prevRow.querySelectorAll('input.editable-cell');
                    if (prevCells[cellIndex]) {
                        targetCell = prevCells[cellIndex];
                    }
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                const nextRow = row.nextElementSibling;
                if (nextRow) {
                    const nextCells = nextRow.querySelectorAll('input.editable-cell');
                    if (nextCells[cellIndex]) {
                        targetCell = nextCells[cellIndex];
                    }
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (cellIndex > 0) {
                    targetCell = cells[cellIndex - 1];
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (cellIndex < cells.length - 1) {
                    targetCell = cells[cellIndex + 1];
                }
                break;
            case 'Tab':
                break;
        }
        
        if (targetCell) {
            targetCell.focus();
            targetCell.select();
            currentFocusedCell = targetCell;
        }
    });
    
    table.addEventListener('click', function(e) {
        if (e.target.classList.contains('editable-cell')) {
            currentFocusedCell = e.target;
        }
    });
    
    table.addEventListener('focusin', function(e) {
        if (e.target.classList.contains('editable-cell')) {
            currentFocusedCell = e.target;
        }
    });
}

// Fungsi untuk membuat input editable
export function makeEditable(input) {
    input.readOnly = false;
    input.focus();
    input.select();
    
    input.addEventListener('blur', function() {
        this.readOnly = true;
        if (window.updateEmployeeDropdown) {
            window.updateEmployeeDropdown();
        }
        if (window.updateCutiEmployeeDropdown) {
            window.updateCutiEmployeeDropdown();
        }
    }, { once: true });
}

// Fungsi untuk delete row
export function deleteRow(button) {
    if (window.currentTab === "absen-tabel") return;
    
    const row = button.closest('tr');
    const name = row.querySelector('.name-input').value;
    const position = row.querySelector('.position-input').value;
    
    absensiData = absensiData.filter(emp => !(emp.name === name && emp.position === position));
    row.remove();
    
    if (window.updateEmployeeDropdown) {
        window.updateEmployeeDropdown();
    }
    if (window.updateCutiEmployeeDropdown) {
        window.updateCutiEmployeeDropdown();
    }
}

// Fungsi untuk mengurutkan karyawan sesuai urutan default
export function sortEmployeesByDefaultOrder(employees) {
    const nameOrder = ["Fahmi Ardiansah", "Agung Setyawan", "Drajat Triono", "Wiyanto", "Nur Fauziah"];
    const sorted = [...employees];
    sorted.sort((a, b) => {
        const orderA = nameOrder.indexOf(a.name);
        const orderB = nameOrder.indexOf(b.name);
        return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    });
    return sorted;
}

// Initialize shift colors
export function initializeShiftColors() {
    const shiftInputs = document.querySelectorAll('.shift-input');
    shiftInputs.forEach(input => {
        updateShiftColor(input);
    });
}

// Fungsi untuk mengupdate warna sel
export function updateShiftColor(input) {
    const value = input.value.toUpperCase();
    const td = input.parentElement;

    // Remove all shift classes
    td.className = td.className.replace(/\bshift-\S+/g, '');
    
    // Add appropriate class
    if (value === "1") td.classList.add("shift-1");
    else if (value === "2") td.classList.add("shift-2");
    else if (value === "3") td.classList.add("shift-3");
    else if (value === "11") td.classList.add("shift-11");
    else if (value === "22") td.classList.add("shift-22");
    else if (value === "C") td.classList.add("shift-C");
    else if (value === "O") td.classList.add("shift-O");
}

// Fungsi untuk memuat pengaturan header yang tersimpan
export function loadHeaderSettings() {
    const savedWidth = localStorage.getItem('headerWidth');
    const savedHeight = localStorage.getItem('headerHeight');
    
    if (savedWidth) {
        document.getElementById('headerWidth').value = savedWidth;
    }
    
    if (savedHeight) {
        document.getElementById('headerHeight').value = savedHeight;
    }
    
    // Terapkan pengaturan jika ada
    if (savedWidth || savedHeight) {
        const headers = document.querySelectorAll('#entryTable th');
        const cells = document.querySelectorAll('#entryTable td');
        
        headers.forEach(header => {
            if (savedWidth) header.style.minWidth = savedWidth + 'px';
            if (savedHeight) header.style.height = savedHeight + 'px';
        });
        
        cells.forEach(cell => {
            if (savedWidth) cell.style.minWidth = savedWidth + 'px';
            if (savedHeight) cell.style.height = savedHeight + 'px';
        });
    }
}

// PERBAIKAN: Fungsi untuk menyimpan data dengan offline support
export async function saveDataToFirestore() {
    if (isSaving) return;
    isSaving = true;
    
    if (!window.isOnline) {
        console.log('Offline - data will be saved when connection is restored');
        localStorage.setItem('absensiDataBackup', JSON.stringify(absensiData));
        isSaving = false;
        return;
    }
    
    try {
        // Collect data from table
        absensiData = [];
        const rows = document.querySelectorAll('#entryTable tbody tr');
        
        rows.forEach(row => {
            const areaInput = row.querySelector('.area-input');
            const nameInput = row.querySelector('.name-input');
            const positionInput = row.querySelector('.position-input');
            
            if (!areaInput || !nameInput || !positionInput) return;
            
            const area = areaInput.value;
            const name = nameInput.value;
            const position = positionInput.value;
            
            if (!name) return;
            
            const shifts = {};
            const shiftInputs = row.querySelectorAll('.shift-input');
            
            shiftInputs.forEach((input, index) => {
                if (index < dateRangeMain.length) {
                    const date = dateRangeMain[index];
                    const dateKey = formatDateForShift(date);
                    shifts[dateKey] = input.value.toUpperCase();
                }
            });
            
            absensiData.push({ area, name, position, shifts });
        });
        
        // Save to Firestore in batch
        const batch = db.batch();
        
        // Clear existing data
        const absensiSnapshot = await db.collection('absensi').get();
        absensiSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add new data
        absensiData.forEach(data => {
            const docRef = db.collection('absensi').doc();
            batch.set(docRef, data);
        });
        
        // Save settings
        const dateRangeRef = db.collection('settings').doc('dateRange');
        batch.set(dateRangeRef, {
            startDate: document.getElementById('startDateMain').value,
            endDate: document.getElementById('endDateMain').value,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await batch.commit();
        console.log('Data saved successfully');
        
        // Generate output and overtime calculation data
        if (window.generateOutputAndOvertimeData) {
            window.generateOutputAndOvertimeData();
        }
        
        showNotification('Data saved successfully!', 'success');
        
        // Hapus backup setelah berhasil sync
        localStorage.removeItem('absensiDataBackup');
        
    } catch (error) {
        console.error('Error saving data:', error);
        showNotification('Error saving data: ' + error.message, 'error');
        if (error.code !== 'failed-precondition') {
            localStorage.setItem('absensiDataBackup', JSON.stringify(absensiData));
        }
    } finally {
        isSaving = false;
    }
}

// Add row function
export function addRow() {
    const tbody = document.querySelector('#entryTable tbody');
    if (!tbody) return;
    
    const newRow = document.createElement('tr');
    
    let rowHTML = `
        <td><input type="text" class="area-input read-only-input" readonly ondblclick="makeEditable(this)"></td>
        <td><input type="text" class="name-input read-only-input" readonly ondblclick="makeEditable(this)"></td>
        <td><input type="text" class="position-input read-only-input" readonly ondblclick="makeEditable(this)"></td>
    `;
    
    dateRangeMain.forEach(() => {
        rowHTML += '<td><input type="text" class="shift-input editable-cell" onchange="updateShiftColor(this)"></td>';
    });
    
    rowHTML += '<td><button class="btn-delete" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button></td>';
    newRow.innerHTML = rowHTML;
    tbody.appendChild(newRow);
    
    initializeShiftColors();
    setupKeyboardNavigation();
}

// Apply header size function
export function applyHeaderSize() {
    const width = document.getElementById('headerWidth').value;
    const height = document.getElementById('headerHeight').value;
    
    const headers = document.querySelectorAll('#entryTable th');
    const cells = document.querySelectorAll('#entryTable td');
    
    headers.forEach(header => {
        if (width) header.style.minWidth = width + 'px';
        if (height) header.style.height = height + 'px';
    });
    
    cells.forEach(cell => {
        if (width) cell.style.minWidth = width + 'px';
        if (height) cell.style.height = height + 'px';
    });
    
    localStorage.setItem('headerWidth', width);
    localStorage.setItem('headerHeight', height);
    
    showNotification('Header size applied successfully!', 'success');
}
