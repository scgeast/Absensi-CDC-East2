// Attendance entry logic

// Global variables
let absensiData = [];
let dateRangeMain = [];
let isSaving = false;

// Load initial data for attendance entry
async function loadAttendanceEntryData() {
    try {
        const absensiSnapshot = await db.collection('absensi').limit(50).get();
        
        absensiData = [];
        absensiSnapshot.forEach(doc => {
            absensiData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Apply date filter
        applyDateFilterMain();
        
    } catch (error) {
        console.error('Error loading attendance entry data:', error);
        // Use initial employees if Firestore is unavailable
        absensiData = [...CONSTANTS.INITIAL_EMPLOYEES];
        applyDateFilterMain();
    }
}

// Apply date filter for Main folder
function applyDateFilterMain() {
    const startDate = document.getElementById('startDateMain').valueAsDate;
    const endDate = document.getElementById('endDateMain').valueAsDate;
    
    if (!startDate || !endDate) return;
    
    dateRangeMain = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        dateRangeMain.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Limit to 31 days for performance
    if (dateRangeMain.length > CONSTANTS.DEFAULT_DATE_RANGE) {
        alert(`Date range limited to ${CONSTANTS.DEFAULT_DATE_RANGE} days for better performance`);
        dateRangeMain = dateRangeMain.slice(0, CONSTANTS.DEFAULT_DATE_RANGE);
        document.getElementById('endDateMain').valueAsDate = dateRangeMain[dateRangeMain.length - 1];
    }
    
    updateEntryTable();
}

// Update entry table
function updateEntryTable() {
    const thead = document.querySelector('#entryTable thead tr');
    const tbody = document.querySelector('#entryTable tbody');
    
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
    
    // Apply saved header settings
    loadHeaderSettings();
    
    // Setup keyboard navigation
    setupKeyboardNavigation();
}

function updateEntryTableBody() {
    const tbody = document.querySelector('#entryTable tbody');
    const employeesToShow = absensiData.length > 0 ? absensiData : CONSTANTS.INITIAL_EMPLOYEES;
    
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

// Setup keyboard navigation
function setupKeyboardNavigation() {
    const table = document.querySelector('#entryTable');
    if (!table) return;
    
    let currentFocusedCell = null;
    
    // Add event listener for keyboard navigation
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
                // Allow default tab behavior
                break;
        }
        
        if (targetCell) {
            targetCell.focus();
            targetCell.select();
            currentFocusedCell = targetCell;
        }
    });
    
    // Set focus on cell click
    table.addEventListener('click', function(e) {
        if (e.target.classList.contains('editable-cell')) {
            currentFocusedCell = e.target;
        }
    });
    
    // Set focus on cell focus
    table.addEventListener('focusin', function(e) {
        if (e.target.classList.contains('editable-cell')) {
            currentFocusedCell = e.target;
        }
    });
}

// Make input editable
function makeEditable(input) {
    input.readOnly = false;
    input.focus();
    input.select();
    
    input.addEventListener('blur', function() {
        this.readOnly = true;
        updateEmployeeDropdown();
        updateCutiEmployeeDropdown();
    }, { once: true });
}

// Delete row
function deleteRow(button) {
    if (currentTab === "absen-tabel") return;
    
    const row = button.closest('tr');
    const name = row.querySelector('.name-input').value;
    const position = row.querySelector('.position-input').value;
    
    absensiData = absensiData.filter(emp => !(emp.name === name && emp.position === position));
    row.remove();
    
    updateEmployeeDropdown();
    updateCutiEmployeeDropdown();
}

// Update shift color
function updateShiftColor(input) {
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

// Initialize shift colors
function initializeShiftColors() {
    const shiftInputs = document.querySelectorAll('.shift-input');
    shiftInputs.forEach(input => {
        updateShiftColor(input);
    });
}

// Load header settings
function loadHeaderSettings() {
    const savedWidth = localStorage.getItem('headerWidth');
    const savedHeight = localStorage.getItem('headerHeight');
    
    if (savedWidth) {
        document.getElementById('headerWidth').value = savedWidth;
    }
    
    if (savedHeight) {
        document.getElementById('headerHeight').value = savedHeight;
    }
    
    // Apply settings if available
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

// Save data to Firestore
async function saveDataToFirestore() {
    if (isSaving) return; // Prevent multiple saves
    isSaving = true;
    
    if (!isOnline) {
        console.log('Offline - data will be saved when connection is restored');
        // Save to localStorage as backup
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
            
            if (!name) return; // Skip empty rows
            
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
        generateOutputAndOvertimeData();
        
        showNotification('Data saved successfully!', 'success');
        
        // Remove backup after successful sync
        localStorage.removeItem('absensiDataBackup');
        
    } catch (error) {
        console.error('Error saving data:', error);
        showNotification('Error saving data: ' + error.message, 'error');
        if (error.code !== 'failed-precondition') {
            // Save to localStorage as backup
            localStorage.setItem('absensiDataBackup', JSON.stringify(absensiData));
        }
    } finally {
        isSaving = false;
    }
}

// Save data to absen tabel (read-only)
async function saveDataToAbsenTabel() {
    if (!isOnline) {
        console.log('Offline - data will be saved when connection is restored');
        return;
    }
    
    try {
        // Collect data from table
        const dataToSave = [];
        const rows = document.querySelectorAll('#entryTable tbody tr');
        
        rows.forEach(row => {
            const areaInput = row.querySelector('.area-input');
            const nameInput = row.querySelector('.name-input');
            const positionInput = row.querySelector('.position-input');
            
            if (!areaInput || !nameInput || !positionInput) return;
            
            const area = areaInput.value;
            const name = nameInput.value;
            const position = positionInput.value;
            
            if (!name) return; // Skip empty rows
            
            const shifts = {};
            const shiftInputs = row.querySelectorAll('.shift-input');
            
            shiftInputs.forEach((input, index) => {
                if (index < dateRangeMain.length) {
                    const date = dateRangeMain[index];
                    const dateKey = formatDateForShift(date);
                    shifts[dateKey] = input.value.toUpperCase();
                }
            });
            
            dataToSave.push({ area, name, position, shifts });
        });
        
        // Save to Firestore in batch
        const batch = db.batch();
        
        // Clear existing data in absenTabel
        const absenTabelSnapshot = await db.collection('absenTabel').get();
        absenTabelSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add new data to absenTabel
        dataToSave.forEach(data => {
            const docRef = db.collection('absenTabel').doc();
            batch.set(docRef, data);
        });
        
        await batch.commit();
        console.log('Data saved to absen tabel successfully');
        
        showNotification('Data saved to Attendance Table successfully!', 'success');
        
        // Refresh absen tabel data
        await loadAbsenTabelData();
        
        // Switch to absen tabel tab
        document.querySelector('[data-tab="absen-tabel"]').click();
        
    } catch (error) {
        console.error('Error saving data to absen tabel:', error);
        showNotification('Error saving data to Attendance Table: ' + error.message, 'error');
    }
}

// Initialize attendance entry when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup event listeners
    document.getElementById('applyFilterMain').addEventListener('click', applyDateFilterMain);
    
    // Header size button
    document.getElementById('applyHeaderSize').addEventListener('click', function() {
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
    });
    
    // Add row button
    document.getElementById('addRow').addEventListener('click', function() {
        const tbody = document.querySelector('#entryTable tbody');
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
    });
    
    // Save data button
    document.getElementById('saveData').addEventListener('click', async function() {
        await saveDataToFirestore();
        await saveDataToAbsenTabel();
    });
});
