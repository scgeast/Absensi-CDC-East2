// Overtime calculation logic

// Global variables
let outputData = [];
let overtimeCalcData = [];
let dateRangeOvertimeOutput = [];
let overtimeSortColumn = 'date';
let overtimeSortDirection = 'asc';
let outputDataLoaded = false;
let overtimeDataLoaded = false;

// Load overtime calculation data
async function loadOvertimeCalculationData() {
    try {
        const overtimeSnapshot = await db.collection('overtime').get();
        
        overtimeCalcData = [];
        overtimeSnapshot.forEach(doc => {
            overtimeCalcData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Overtime calculation data loaded:', overtimeCalcData.length, 'records');
        
    } catch (error) {
        console.error('Error loading overtime calculation data:', error);
    }
}

// Generate output and overtime data
function generateOutputAndOvertimeData() {
    outputData = [];
    overtimeCalcData = [];
    
    console.log('Generating data from absensiData:', absensiData.length, 'employees');
    
    absensiData.forEach(employee => {
        const area = employee.area;
        const name = employee.name;
        const position = employee.position;
        
        console.log('Processing employee:', name, 'with', Object.keys(employee.shifts || {}).length, 'shifts');
        
        // Loop through the shifts - MAKE SURE ALL DATES ARE PROCESSED
        Object.keys(employee.shifts || {}).forEach(dateStr => {
            const shiftCode = employee.shifts[dateStr];
            
            // Get shift details from shiftMatrix - even for empty shifts
            const shiftDetails = CONSTANTS.SHIFT_MATRIX[position] && CONSTANTS.SHIFT_MATRIX[position][shiftCode];
            
            if (shiftDetails) {
                // For outputData
                outputData.push({
                    area,
                    name,
                    position,
                    date: dateStr,
                    shift: shiftDetails.name,
                    shiftCheckIn: shiftDetails.checkIn,
                    shiftCheckOut: shiftDetails.checkOut,
                    remarks: ""
                });
                
                // For overtimeCalcData - CREATE FOR ALL SHIFTS
                overtimeCalcData.push({
                    id: `${name}-${dateStr}-${Date.now()}`, // Create unique ID with timestamp
                    area,
                    name,
                    position,
                    date: dateStr,
                    shift: shiftDetails.name,
                    shiftCheckIn: shiftDetails.checkIn,
                    shiftCheckOut: shiftDetails.checkOut,
                    wtNormal: shiftDetails.hours,
                    actualCheckIn: "",
                    actualCheckOut: "",
                    overTime: "",
                    cekRMC: "",
                    rkpPIC: "", // Will be filled later if there's overtime
                    rmcShiftCheckOut: "",
                    remarks: ""
                });
            } else if (shiftCode) {
                // If shift code exists but not in matrix, still create record
                overtimeCalcData.push({
                    id: `${name}-${dateStr}-${Date.now()}`,
                    area,
                    name,
                    position,
                    date: dateStr,
                    shift: shiftCode,
                    shiftCheckIn: "",
                    shiftCheckOut: "",
                    wtNormal: "",
                    actualCheckIn: "",
                    actualCheckOut: "",
                    overTime: "",
                    cekRMC: "",
                    rkpPIC: "",
                    rmcShiftCheckOut: "",
                    remarks: ""
                });
            }
        });
    });
    
    console.log('Generated overtime data:', overtimeCalcData.length, 'records');
    
    // Update the tables if the tabs are active
    if (currentTab === "output") {
        updateOutputTable();
    }
    if (currentTab === "overtime") {
        updateOvertimeTable();
    }
    if (currentTab === "summary-overtime") {
        updateOvertimeSummaryTable();
    }
}

// Apply date filter for Overtime & Output
function applyDateFilterOvertimeOutput() {
    const startDate = document.getElementById('startDateOvertimeOutput').valueAsDate;
    const endDate = document.getElementById('endDateOvertimeOutput').valueAsDate;
    
    if (!startDate || !endDate) return;
    
    dateRangeOvertimeOutput = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        dateRangeOvertimeOutput.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Limit to 31 days for performance
    if (dateRangeOvertimeOutput.length > CONSTANTS.DEFAULT_DATE_RANGE) {
        alert(`Date range limited to ${CONSTANTS.DEFAULT_DATE_RANGE} days for better performance`);
        dateRangeOvertimeOutput = dateRangeOvertimeOutput.slice(0, CONSTANTS.DEFAULT_DATE_RANGE);
        document.getElementById('endDateOvertimeOutput').valueAsDate = dateRangeOvertimeOutput[dateRangeOvertimeOutput.length - 1];
    }
    
    // Update tables that use Overtime & Output filter
    if (currentTab === "output") {
        updateOutputTable();
    }
    if (currentTab === "overtime") {
        updateOvertimeTable();
    }
    if (currentTab === "form-rekap-lembur") {
        updateOvertimeDetailTable();
    }
    if (currentTab === "summary-overtime") {
        updateOvertimeSummaryTable();
    }
}

// Update output table
function updateOutputTable() {
    const tbody = document.querySelector('#outputTable tbody');
    tbody.innerHTML = '';
    
    // Filter data based on Overtime & Output date range
    const startDateOvertimeOutput = document.getElementById('startDateOvertimeOutput').valueAsDate;
    const endDateOvertimeOutput = document.getElementById('endDateOvertimeOutput').valueAsDate;
    const employeeFilterOvertimeOutput = document.getElementById('employeeNameOvertimeOutput').value;
    
    let filteredOutputData = outputData.filter(data => {
        const dataDate = parseDateFromString(data.date);
        const dateInRange = (!startDateOvertimeOutput || !endDateOvertimeOutput) || 
                          (dataDate >= startDateOvertimeOutput && dataDate <= endDateOvertimeOutput);
        const employeeMatch = employeeFilterOvertimeOutput === 'all' || data.name === employeeFilterOvertimeOutput;
        
        return dateInRange && employeeMatch;
    });
    
    // Sort data by date
    filteredOutputData.sort((a, b) => {
        const dateA = parseDateFromString(a.date);
        const dateB = parseDateFromString(b.date);
        return dateA - dateB;
    });
    
    filteredOutputData.forEach(data => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.area}</td>
            <td>${data.name}</td>
            <td>${data.position}</td>
            <td>${data.date}</td>
            <td>${data.shift}</td>
            <td>${data.shiftCheckIn}</td>
            <td>${data.shiftCheckOut}</td>
            <td><input type="text" class="remarks-input" value="${data.remarks}" data-employee="${data.name}" data-date="${data.date}"></td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listener for remarks input
    document.querySelectorAll('.remarks-input').forEach(input => {
        input.addEventListener('change', function() {
            const employee = this.getAttribute('data-employee');
            const date = this.getAttribute('data-date');
            const remarks = this.value;
            
            // Find the item in outputData and update remarks
            const item = outputData.find(d => d.name === employee && d.date === date);
            if (item) {
                item.remarks = remarks;
            }
        });
    });
}

// Update overtime calculation table
function updateOvertimeTable() {
    const tbody = document.querySelector('#overtimeTableBody');
    tbody.innerHTML = '';
    
    // Filter data based on Overtime & Output date range
    const startDateOvertimeOutput = document.getElementById('startDateOvertimeOutput').valueAsDate;
    const endDateOvertimeOutput = document.getElementById('endDateOvertimeOutput').valueAsDate;
    const employeeFilterOvertimeOutput = document.getElementById('employeeNameOvertimeOutput').value;
    
    let filteredOvertimeData = overtimeCalcData.filter(data => {
        const dataDate = parseDateFromString(data.date);
        const dateInRange = (!startDateOvertimeOutput || !endDateOvertimeOutput) || 
                          (dataDate >= startDateOvertimeOutput && dataDate <= endDateOvertimeOutput);
        const employeeMatch = employeeFilterOvertimeOutput === 'all' || data.name === employeeFilterOvertimeOutput;
        
        return dateInRange && employeeMatch;
    });
    
    // Sort data based on selected column and direction
    filteredOvertimeData = sortOvertimeData(filteredOvertimeData, overtimeSortColumn, overtimeSortDirection);
    
    let no = 1;
    filteredOvertimeData.forEach(data => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${no++}</td>
            <td>${data.area}</td>
            <td>${data.name}</td>
            <td>${data.position}</td>
            <td>${data.date}</td>
            <td>${data.shift}</td>
            <td>${data.shiftCheckIn}</td>
            <td>${data.shiftCheckOut}</td>
            <td>${data.wtNormal}</td>
            <td><input type="time" class="actual-check-in" value="${data.actualCheckIn}" data-id="${data.id}"></td>
            <td><input type="time" class="actual-check-out" value="${data.actualCheckOut}" data-id="${data.id}"></td>
            <td><input type="text" class="over-time" value="${data.overTime}" data-id="${data.id}" readonly></td>
            <td><input type="text" class="cek-rmc" value="${data.cekRMC}" data-id="${data.id}"></td>
            <td><input type="text" class="rkp-pic" value="${data.rkpPIC}" data-id="${data.id}"></td>
            <td><input type="text" class="rmc-shift-check-out" value="${data.rmcShiftCheckOut}" data-id="${data.id}" readonly></td>
            <td><input type="text" class="remarks-input" value="${data.remarks}" data-id="${data.id}"></td>
            <td>
                <button class="btn-edit" onclick="editOvertimeCalculationRow('${data.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="deleteOvertimeCalculationRow('${data.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners for automatic calculation based on Actual Check Out
    document.querySelectorAll('.actual-check-out').forEach(input => {
        input.addEventListener('change', function() {
            calculateOvertime(this);
        });
    });
    
    // Add event listeners for automatic calculation based on Cek RMC
    document.querySelectorAll('.cek-rmc').forEach(input => {
        input.addEventListener('change', function() {
            calculateRmcShiftCheckOut(this);
        });
    });
    
    // Update sort icons
    updateSortIcons();
    
    // Update overtime summary if we're on that tab
    if (currentTab === 'summary-overtime') {
        updateOvertimeSummaryTable();
    }
}

// Sort overtime data
function sortOvertimeData(data, column, direction) {
    return [...data].sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];
        
        // Handle special cases for different data types
        if (column === 'date') {
            aValue = parseDateFromString(aValue);
            bValue = parseDateFromString(bValue);
        } else if (column === 'no') {
            // No sorting for number column
            return 0;
        }
        
        // Handle empty values
        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';
        
        // Compare values
        if (aValue < bValue) {
            return direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

// Update sort icons
function updateSortIcons() {
    // Reset all icons
    document.querySelectorAll('.sortable-header .sort-icon').forEach(icon => {
        icon.innerHTML = '<i class="fas fa-sort"></i>';
        icon.classList.remove('active');
    });
    
    // Set active icon
    const activeHeader = document.querySelector(`.sortable-header[data-column="${overtimeSortColumn}"] .sort-icon`);
    if (activeHeader) {
        if (overtimeSortDirection === 'asc') {
            activeHeader.innerHTML = '<i class="fas fa-sort-up"></i>';
        } else {
            activeHeader.innerHTML = '<i class="fas fa-sort-down"></i>';
        }
        activeHeader.classList.add('active');
    }
}

// Calculate overtime based on (Actual Check Out - Shift Check Out)
function calculateOvertime(input) {
    const row = input.closest('tr');
    const shiftCheckOut = row.querySelector('td:nth-child(8)').textContent;
    const actualCheckOut = row.querySelector('.actual-check-out').value;
    
    // Calculate overtime based on (Actual Check Out - Shift Check Out)
    if (actualCheckOut && shiftCheckOut) {
        const actualOut = new Date(`2000-01-01T${actualCheckOut}`);
        const shiftOut = new Date(`2000-01-01T${shiftCheckOut}`);
        
        // If actual check out is on the next day (after midnight)
        if (actualOut < shiftOut) {
            actualOut.setDate(actualOut.getDate() + 1);
        }
        
        const diffMs = actualOut - shiftOut;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const overtime = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
        row.querySelector('.over-time').value = overtime;
        
        // Update data
        const dataId = input.getAttribute('data-id');
        if (dataId) {
            const item = overtimeCalcData.find(d => d.id === dataId);
            if (item) {
                item.overTime = overtime;
            }
        }
    }
    
    // Calculate Rmc - Shift Check Out
    const cekRMC = row.querySelector('.cek-rmc').value;
    if (cekRMC && shiftCheckOut) {
        const rmcTime = new Date(`2000-01-01T${cekRMC}`);
        const shiftOutTime = new Date(`2000-01-01T${shiftCheckOut}`);
        
        // If RMC is on the next day (after midnight)
        if (rmcTime < shiftOutTime) {
            rmcTime.setDate(rmcTime.getDate() + 1);
        }
        
        const diffMs = rmcTime - shiftOutTime;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const rmcDiff = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
        row.querySelector('.rmc-shift-check-out').value = rmcDiff;
        
        // Update data
        const dataId = input.getAttribute('data-id');
        if (dataId) {
            const item = overtimeCalcData.find(d => d.id === dataId);
            if (item) {
                item.rmcShiftCheckOut = rmcDiff;
            }
        }
    }
}

// Special function for calculating Rmc-Shift Check Out
function calculateRmcShiftCheckOut(input) {
    const row = input.closest('tr');
    const shiftCheckOut = row.querySelector('td:nth-child(8)').textContent;
    const cekRMC = input.value;
    
    if (cekRMC && shiftCheckOut) {
        const rmcTime = new Date(`2000-01-01T${cekRMC}`);
        const shiftOutTime = new Date(`2000-01-01T${shiftCheckOut}`);
        
        // If RMC is on the next day (after midnight)
        if (rmcTime < shiftOutTime) {
            rmcTime.setDate(rmcTime.getDate() + 1);
        }
        
        const diffMs = rmcTime - shiftOutTime;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const rmcDiff = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
        row.querySelector('.rmc-shift-check-out').value = rmcDiff;
        
        // Update data
        const dataId = input.getAttribute('data-id');
        if (dataId) {
            const item = overtimeCalcData.find(d => d.id === dataId);
            if (item) {
                item.rmcShiftCheckOut = rmcDiff;
            }
        }
    }
}

// Delete overtime calculation row with update to Overtime Form
async function deleteOvertimeCalculationRow(rowId) {
    if (!confirm('Are you sure you want to delete this overtime calculation record?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Get data to be deleted for reference
        const itemToDelete = overtimeCalcData.find(data => data.id === rowId);
        
        if (itemToDelete) {
            console.log('Deleting overtime calculation record:', {
                id: rowId,
                name: itemToDelete.name,
                date: itemToDelete.date
            });
            
            // Delete related data in Overtime Form as well
            await deleteRelatedOvertimeFormRecords(itemToDelete.name, itemToDelete.date);
        }
        
        // Delete from Firestore
        await db.collection('overtime').doc(rowId).delete();
        
        // Delete from local data
        overtimeCalcData = overtimeCalcData.filter(data => data.id !== rowId);
        
        // Update display
        updateOvertimeTable();
        updateOvertimeSummaryTable();
        
        showNotification('Overtime calculation record deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting overtime calculation record:', error);
        showNotification('Error deleting overtime calculation record: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Delete related overtime form records
async function deleteRelatedOvertimeFormRecords(employeeName, date) {
    try {
        // Format date for search (DD/MM/YYYY to YYYY-MM-DD)
        const formattedDate = formatDateForOvertimeFormSearch(date);
        
        console.log('Searching for related overtime form records:', {
            employeeName: employeeName,
            originalDate: date,
            formattedDate: formattedDate
        });
        
        // Find related records in Overtime Form
        const overtimeFormQuery = await db.collection('overtimeRecords')
            .where('employeeName', '==', employeeName)
            .where('date', '==', formattedDate)
            .get();
        
        if (!overtimeFormQuery.empty) {
            const batch = db.batch();
            let deletedCount = 0;
            
            overtimeFormQuery.forEach(doc => {
                console.log('Deleting related overtime form record:', doc.id);
                batch.delete(doc.ref);
                deletedCount++;
            });
            
            await batch.commit();
            console.log(`Deleted ${deletedCount} related overtime form records`);
            
            // Update local Overtime Form data
            rekapLemburData = rekapLemburData.filter(record => 
                !(record.employeeName === employeeName && record.date === formattedDate)
            );
            
            // Update Overtime Form display if currently active
            if (currentTab === "form-rekap-lembur") {
                updateOvertimeDetailTable();
                updateTotalOvertime();
            }
            
            showNotification(`Deleted ${deletedCount} related overtime form records`, 'info');
        }
        
    } catch (error) {
        console.error('Error deleting related overtime form records:', error);
        // Don't show error to user, as this is just cleanup
    }
}

// Format date for Overtime Form search
function formatDateForOvertimeFormSearch(dateStr) {
    // Convert from DD/MM/YYYY to YYYY-MM-DD
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
}

// Edit overtime calculation row with sync to Overtime Form
async function editOvertimeCalculationRow(rowId) {
    const row = document.querySelector(`[data-id="${rowId}"]`).closest('tr');
    const inputs = row.querySelectorAll('input');
    
    // Enable editing for all inputs except readonly ones
    inputs.forEach(input => {
        if (!input.readOnly) {
            input.readOnly = false;
            input.style.backgroundColor = '#f8f9fa';
        }
    });
    
    // Add event listener for save changes
    const saveHandler = async function() {
        await saveOvertimeCalculationChanges(rowId);
        
        // Remove event listener after save
        inputs.forEach(input => {
            input.removeEventListener('blur', saveHandler);
        });
    };
    
    // Add event listener for auto-save when losing focus
    inputs.forEach(input => {
        if (!input.readOnly) {
            input.addEventListener('blur', saveHandler);
        }
    });
    
    showNotification('Row is now editable. Changes will be saved automatically.', 'info');
}

// Save overtime calculation changes and update Overtime Form
async function saveOvertimeCalculationChanges(rowId) {
    try {
        const row = document.querySelector(`[data-id="${rowId}"]`).closest('tr');
        const item = overtimeCalcData.find(d => d.id === rowId);
        
        if (item) {
            // Update data from input fields
            item.actualCheckIn = row.querySelector('.actual-check-in').value;
            item.actualCheckOut = row.querySelector('.actual-check-out').value;
            item.overTime = row.querySelector('.over-time').value;
            item.cekRMC = row.querySelector('.cek-rmc').value;
            item.rkpPIC = row.querySelector('.rkp-pic').value;
            item.rmcShiftCheckOut = row.querySelector('.rmc-shift-check-out').value;
            item.remarks = row.querySelector('.remarks-input').value;
            
            // Update to Firestore
            await db.collection('overtime').doc(rowId).update({
                actualCheckIn: item.actualCheckIn,
                actualCheckOut: item.actualCheckOut,
                overTime: item.overTime,
                cekRMC: item.cekRMC,
                rkpPIC: item.rkpPIC,
                rmcShiftCheckOut: item.rmcShiftCheckOut,
                remarks: item.remarks,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update Overtime Form if there are changes in RKP PIC or Remarks
            if (item.rkpPIC || item.remarks) {
                await updateRelatedOvertimeFormRecords(item);
            }
            
            showNotification('Overtime calculation changes saved successfully', 'success');
        }
        
    } catch (error) {
        console.error('Error saving overtime calculation changes:', error);
        showNotification('Error saving changes: ' + error.message, 'error');
    }
}

// Update related overtime form records
async function updateRelatedOvertimeFormRecords(overtimeCalcItem) {
    try {
        // Format date for search (DD/MM/YYYY to YYYY-MM-DD)
        const formattedDate = formatDateForOvertimeFormSearch(overtimeCalcItem.date);
        
        // Find related records in Overtime Form
        const overtimeFormQuery = await db.collection('overtimeRecords')
            .where('employeeName', '==', overtimeCalcItem.name)
            .where('date', '==', formattedDate)
            .get();
        
        if (!overtimeFormQuery.empty) {
            const batch = db.batch();
            let updatedCount = 0;
            
            overtimeFormQuery.forEach(doc => {
                const formData = doc.data();
                
                // Update RKP PIC and Remarks
                batch.update(doc.ref, {
                    rkpPIC: overtimeCalcItem.rkpPIC,
                    remarks: overtimeCalcItem.remarks,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Update local data
                const localItem = rekapLemburData.find(r => r.id === doc.id);
                if (localItem) {
                    localItem.rkpPIC = overtimeCalcItem.rkpPIC;
                    localItem.remarks = overtimeCalcItem.remarks;
                }
                
                updatedCount++;
            });
            
            await batch.commit();
            console.log(`Updated ${updatedCount} related overtime form records`);
            
            // Update Overtime Form display if currently active
            if (currentTab === "form-rekap-lembur") {
                updateOvertimeDetailTable();
                updateTotalOvertime();
            }
            
            showNotification(`Updated ${updatedCount} related overtime form records`, 'info');
        }
        
    } catch (error) {
        console.error('Error updating related overtime form records:', error);
        // Don't show error to user, as this is just sync
    }
}

// Save output data to Firestore
async function saveOutputDataToFirestore() {
    if (!isOnline) {
        console.log('Offline - data will be saved when connection is restored');
        return;
    }
    
    try {
        // Save to Firestore in batch
        const batch = db.batch();
        
        // Clear existing data in output collection
        const outputSnapshot = await db.collection('output').get();
        outputSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add new data to output collection
        outputData.forEach(data => {
            const docRef = db.collection('output').doc();
            batch.set(docRef, data);
        });
        
        await batch.commit();
        console.log('Output data saved successfully');
        
        showNotification('Output data saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving output data:', error);
        showNotification('Error saving output data: ' + error.message, 'error');
    }
}

// Save overtime data to Firestore
async function saveOvertimeDataToFirestore() {
    if (!isOnline) {
        console.log('Offline - data will be saved when connection is restored');
        return;
    }
    
    try {
        // Update data from input fields
        document.querySelectorAll('#overtimeTableBody tr').forEach(row => {
            const dataId = row.querySelector('.actual-check-in').getAttribute('data-id');
            if (dataId) {
                const item = overtimeCalcData.find(d => d.id === dataId);
                if (item) {
                    item.actualCheckIn = row.querySelector('.actual-check-in').value;
                    item.actualCheckOut = row.querySelector('.actual-check-out').value;
                    item.overTime = row.querySelector('.over-time').value;
                    item.cekRMC = row.querySelector('.cek-rmc').value;
                    item.rkpPIC = row.querySelector('.rkp-pic').value;
                    item.rmcShiftCheckOut = row.querySelector('.rmc-shift-check-out').value;
                    item.remarks = row.querySelector('.remarks-input').value;
                }
            }
        });
        
        // Save to Firestore in batch
        const batch = db.batch();
        
        // Clear existing data in overtime collection
        const overtimeSnapshot = await db.collection('overtime').get();
        overtimeSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add new data to overtime collection
        overtimeCalcData.forEach(data => {
            const docRef = db.collection('overtime').doc();
            batch.set(docRef, data);
        });
        
        await batch.commit();
        console.log('Overtime data saved successfully');
        
        showNotification('Overtime data saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving overtime data:', error);
        showNotification('Error saving overtime data: ' + error.message, 'error');
    }
}

// Generate overtime summary data
function generateOvertimeSummary() {
    const summaryData = {};
    
    // Get date filter from Overtime Calculation
    const startDateOvertimeOutput = document.getElementById('startDateOvertimeOutput').valueAsDate;
    const endDateOvertimeOutput = document.getElementById('endDateOvertimeOutput').valueAsDate;
    
    // Filter overtime data based on date range
    let filteredOvertimeData = overtimeCalcData;
    if (startDateOvertimeOutput && endDateOvertimeOutput) {
        filteredOvertimeData = overtimeCalcData.filter(data => {
            const dataDate = parseDateFromString(data.date);
            return dataDate >= startDateOvertimeOutput && dataDate <= endDateOvertimeOutput;
        });
    }
    
    // Process each employee in filtered overtime data
    filteredOvertimeData.forEach(data => {
        if (!data.name) return;
        
        // Initialize employee summary if not exists
        if (!summaryData[data.name]) {
            summaryData[data.name] = {
                name: data.name,
                totalWorkDay: 0,
                totalWorkTime: 0, // in minutes
                totalRkpPic: 0,   // in minutes
                totalRmcShiftCheckOut: 0 // in minutes
            };
        }
        
        // Count work days (only count Morning, Afternoon, Night, Morning Part, Afternoon Part)
        // Don't count Off and Leave because they don't work
        if (data.shift) {
            const shift = data.shift.toUpperCase();
            if (shift === '1' || shift === '2' || shift === '3' || shift === '11' || shift === '22') {
                summaryData[data.name].totalWorkDay++;
            }
        }
        
        // Calculate total work time from WT/Normal
        if (data.wtNormal) {
            const [hours, minutes] = data.wtNormal.split(':').map(Number);
            summaryData[data.name].totalWorkTime += (hours * 60) + minutes;
        }
        
        // Calculate total RKP PIC (convert HH:MM to minutes)
        if (data.rkpPIC) {
            const [hours, minutes] = data.rkpPIC.split(':').map(Number);
            summaryData[data.name].totalRkpPic += (hours * 60) + minutes;
        }
        
        // Calculate total Rmc-Shift Check Out (convert HH:MM to minutes)
        if (data.rmcShiftCheckOut) {
            const [hours, minutes] = data.rmcShiftCheckOut.split(':').map(Number);
            summaryData[data.name].totalRmcShiftCheckOut += (hours * 60) + minutes;
        }
    });
    
    // Convert minutes back to HH:MM format for display
    Object.values(summaryData).forEach(employee => {
        employee.totalWorkTime = formatMinutesToTime(employee.totalWorkTime);
        employee.totalRkpPic = formatMinutesToTime(employee.totalRkpPic);
        employee.totalRmcShiftCheckOut = formatMinutesToTime(employee.totalRmcShiftCheckOut);
    });
    
    return Object.values(summaryData);
}

// Update overtime summary table
function updateOvertimeSummaryTable() {
    const tbody = document.getElementById('overtimeSummaryTableBody');
    tbody.innerHTML = '';
    
    const summaryData = generateOvertimeSummary();
    
    if (summaryData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" class="text-center">No overtime data available</td>`;
        tbody.appendChild(row);
        return;
    }
    
    // Sort employees by default order
    const sortedData = sortEmployeesByDefaultOrder(summaryData);
    
    sortedData.forEach((employee, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${employee.name}</td>
            <td>${employee.totalWorkDay}</td>
            <td>${employee.totalWorkTime}</td>
            <td>${employee.totalRkpPic}</td>
            <td>${employee.totalRmcShiftCheckOut}</td>
        `;
        tbody.appendChild(row);
    });
}

// Refresh overtime data
async function refreshOvertimeData() {
    try {
        showLoading(true);
        console.log('Refreshing ALL overtime data...');

        // 1. Load all attendance data (all employees)
        const absensiSnapshot = await db.collection('absensi').get();
        const allEmployees = [];
        absensiSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.name) {
                allEmployees.push({
                    name: data.name,
                    area: data.area || 'CDC East',
                    position: data.position || '',
                    shifts: data.shifts || {}
                });
            }
        });

        // 2. Load all existing overtime calculation data
        const overtimeSnapshot = await db.collection('overtime').get();
        let existingOvertime = [];
        overtimeSnapshot.forEach(doc => {
            existingOvertime.push({ id: doc.id, ...doc.data() });
        });

        // 3. Load all overtime form data
        const overtimeFormSnapshot = await db.collection('overtimeRecords').get();
        let formData = [];
        overtimeFormSnapshot.forEach(doc => {
            formData.push({ id: doc.id, ...doc.data() });
        });

        // 4. PROCESS ALL EMPLOYEES AND ALL DATES - WITHOUT FILTER
        const batch = db.batch();
        let updatedCount = 0;
        let createdCount = 0;

        // Delete all existing overtime data (reset)
        const deleteBatch = db.batch();
        existingOvertime.forEach(item => {
            const docRef = db.collection('overtime').doc(item.id);
            deleteBatch.delete(docRef);
        });
        await deleteBatch.commit();
        console.log('Deleted all existing overtime data for refresh');

        // Now create new data for ALL employees and ALL dates
        for (const emp of allEmployees) {
            // Get all dates from employee shifts
            for (const [date, shift] of Object.entries(emp.shifts)) {
                // Find matching overtime from Overtime Form
                const relatedForm = formData.find(f => {
                    try {
                        const formatted = formatDateForShift(new Date(f.date));
                        return f.employeeName === emp.name && formatted === date;
                    } catch (e) {
                        return false;
                    }
                });

                // Get shift details from matrix
                let shiftDetails = null;
                if (emp.position && CONSTANTS.SHIFT_MATRIX[emp.position] && CONSTANTS.SHIFT_MATRIX[emp.position][shift]) {
                    shiftDetails = CONSTANTS.SHIFT_MATRIX[emp.position][shift];
                }

                // Create overtime calculation data for ALL records
                const newData = {
                    area: emp.area,
                    name: emp.name,
                    position: emp.position,
                    date: date,
                    shift: shift,
                    shiftCheckIn: shiftDetails ? shiftDetails.checkIn : "",
                    shiftCheckOut: shiftDetails ? shiftDetails.checkOut : "",
                    wtNormal: shiftDetails ? shiftDetails.hours : "",
                    actualCheckIn: "",
                    actualCheckOut: "",
                    overTime: "",
                    cekRMC: "",
                    // Fill RKP PIC only if there's overtime
                    rkpPIC: relatedForm ? relatedForm.overtimeDuration : "",
                    rmcShiftCheckOut: "",
                    // Fill remarks only if there's overtime
                    remarks: relatedForm ? (relatedForm.taskDescription || 'Overtime recorded') : "",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                const docRef = db.collection('overtime').doc();
                batch.set(docRef, newData);
                createdCount++;
            }
        }

        if (createdCount > 0) {
            await batch.commit();
            console.log(`Overtime refresh completed: ${createdCount} records created`);
        }

        // 5. Refresh local data
        await loadOvertimeCalculationData();

        // 6. Update table display
        updateOvertimeTable();
        updateOvertimeSummaryTable();

        showNotification(`All overtime data refreshed successfully (${createdCount} records)`, 'success');
    } catch (error) {
        console.error('Error refreshing overtime data:', error);
        showNotification('Error refreshing overtime data: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Initialize overtime calculation when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup event listeners
    document.getElementById('applyFilterOvertimeOutput').addEventListener('click', applyDateFilterOvertimeOutput);
    
    // Save output data button
    document.getElementById('saveOutputData').addEventListener('click', async function() {
        await saveOutputDataToFirestore();
    });
    
    // Save overtime data button
    document.getElementById('saveOvertimeData').addEventListener('click', async function() {
        await saveOvertimeDataToFirestore();
    });
    
    // Refresh overtime data button
    document.getElementById('refreshOvertimeData').addEventListener('click', async function() {
        await refreshOvertimeData();
    });
    
    // Event listeners for sorting in overtime calculation
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', function() {
            const column = this.getAttribute('data-column');
            
            // Toggle sort direction if same column
            if (overtimeSortColumn === column) {
                overtimeSortDirection = overtimeSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                // Set new column and default direction
                overtimeSortColumn = column;
                overtimeSortDirection = 'asc';
            }
            
            // Update table
            updateOvertimeTable();
        });
    });
    
    // Event listener for Overtime & Output filter to update overtime summary
    document.getElementById('applyFilterOvertimeOutput').addEventListener('click', function() {
        applyDateFilterOvertimeOutput();
        // Update overtime summary if we're on that tab
        if (currentTab === 'summary-overtime') {
            updateOvertimeSummaryTable();
        }
    });
});
