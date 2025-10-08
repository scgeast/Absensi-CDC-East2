// Overtime form logic

// Global variables
let rekapLemburData = [];
let currentRekapRows = [];

// Initialize overtime form
function initOvertimeForm() {
    // Show different forms based on role
    if (currentUser.role === 'admin') {
        // For admin, show only overtime detail
        document.getElementById('userOvertimeForm').style.display = 'none';
        document.getElementById('adminOvertimeDetail').style.display = 'block';
        
        // Show employee filter for admin
        document.getElementById('overtimeFilterSection').style.display = 'flex';
        
        // Load all overtime data for admin
        loadAllOvertimeData();
        
        // Setup employee filter
        setupOvertimeEmployeeFilter();
    } else {
        // For regular user, show input form
        document.getElementById('userOvertimeForm').style.display = 'block';
        document.getElementById('adminOvertimeDetail').style.display = 'block';
        
        // HIDE employee filter for regular user
        document.getElementById('overtimeFilterSection').style.display = 'none';
        
        // Set default date to today
        document.getElementById('rekapDate').valueAsDate = new Date();
        
        // Remove all existing rows
        const tbody = document.getElementById('rekapLemburTableBody');
        tbody.innerHTML = '';
        currentRekapRows = [];
        
        // Add only 1 default row
        addRekapRow();
        
        // Load user overtime data
        loadUserOvertimeData();
        
        // Setup event listeners
        document.getElementById('saveRekapLembur').addEventListener('click', saveRekapLembur);
    }
    
    // Event listener for filter date change
    document.getElementById('startDateOvertimeOutput').addEventListener('change', updateOvertimeDisplay);
    document.getElementById('endDateOvertimeOutput').addEventListener('change', updateOvertimeDisplay);
}

// Setup employee filter for overtime detail
function setupOvertimeEmployeeFilter() {
    const overtimeEmployeeFilter = document.getElementById('overtimeEmployeeFilter');
    
    // Clear existing options
    overtimeEmployeeFilter.innerHTML = '<option value="all">All Employees</option>';
    
    // Get all unique employee names
    const uniqueNames = new Set();
    absensiData.forEach(employee => {
        if (employee.name) uniqueNames.add(employee.name);
    });
    
    if (uniqueNames.size === 0) {
        CONSTANTS.INITIAL_EMPLOYEES.forEach(employee => {
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

// Load all overtime data (for admin)
async function loadAllOvertimeData() {
    try {
        let query;
        if (currentUser.role === 'admin') {
            // Admin can see all data
            query = db.collection('overtimeRecords').orderBy('date', 'desc');
        } else {
            // Regular user can only see their own data
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

// Load user overtime data
async function loadUserOvertimeData() {
    if (!currentUser) return;
    
    try {
        let query;
        if (currentUser.role === 'admin') {
            // Admin can see all data
            query = db.collection('overtimeRecords').orderBy('date', 'desc');
        } else {
            // Regular user can only see their own data
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

// Add row in overtime form
function addRekapRow() {
    const tbody = document.getElementById('rekapLemburTableBody');
    const rowCount = tbody.rows.length;
    const rowId = Date.now() + rowCount; // Unique ID for row
    
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
                    ${CONSTANTS.PLANT_OPTIONS.map(plant => `<option value="${plant}">${plant}</option>`).join('')}
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
    
    // Setup event listener for total plant change
    const totalPlantInput = row.querySelector('.total-plant');
    totalPlantInput.addEventListener('change', function() {
        updatePlantSelectors(this);
    });
}

// Remove row
function removeRekapRow(button) {
    const row = button.closest('tr');
    const rowId = row.getAttribute('data-row-id');
    
    // Remove from current rows array
    currentRekapRows = currentRekapRows.filter(id => id != rowId);
    
    row.remove();
    updateRowNumbers();
}

// Update row numbers
function updateRowNumbers() {
    const rows = document.querySelectorAll('#rekapLemburTableBody tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

// Update plant selectors based on total plant
function updatePlantSelectors(input) {
    const rowId = input.getAttribute('data-row');
    const totalPlant = parseInt(input.value) || 1;
    const plantContainer = document.getElementById(`plantContainer-${rowId}`);
    
    // Clear existing selects
    plantContainer.innerHTML = '';
    
    // Add new selects based on total plant
    for (let i = 0; i < totalPlant; i++) {
        const select = document.createElement('select');
        select.className = 'form-control form-control-sm plant-select';
        select.setAttribute('data-row', rowId);
        select.innerHTML = `
            <option value="">Select Plant</option>
            ${CONSTANTS.PLANT_OPTIONS.map(plant => `<option value="${plant}">${plant}</option>`).join('')}
        `;
        plantContainer.appendChild(select);
        
        // Add spacing between selects
        if (i < totalPlant - 1) {
            plantContainer.appendChild(document.createElement('br'));
        }
    }
}

// Save overtime data - IMPROVED
async function saveRekapLembur() {
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
    
    // IMPROVED: Validate time for overtime that crosses midnight
    // No validation for startTime >= endTime because overtime can cross midnight
    // Example: 23:00 - 08:00 (overnight overtime)
    
    // Calculate overtime duration with support for overnight overtime
    const overtimeDuration = calculateOvertimeDuration(startTime, endTime);
    
    // Collect data from table
    const tableData = [];
    const rows = document.querySelectorAll('#rekapLemburTableBody tr');
    
    let hasValidData = false;
    rows.forEach(row => {
        const rowId = row.getAttribute('data-row-id');
        const totalProject = row.querySelector('.total-project').value;
        const totalPlant = parseInt(row.querySelector('.total-plant').value) || 1;
        const volume = row.querySelector('.volume').value;
        
        // Collect plant names
        const plantNames = [];
        const plantSelects = row.querySelectorAll(`.plant-select[data-row="${rowId}"]`);
        plantSelects.forEach(select => {
            if (select.value) {
                plantNames.push(select.value);
            }
        });
        
        // Only add if there's valid data
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
    
    // Create data to save
    const overtimeRecord = {
        employeeName: currentUser.name,
        employeeEmail: currentUser.email,
        date,
        startTime,
        endTime,
        overtimeDuration, // Duration column that has been calculated
        tableData,
        taskDescription,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        showLoading(true);
        
        // Save to Firestore
        const docRef = await db.collection('overtimeRecords').add(overtimeRecord);
        overtimeRecord.id = docRef.id;
        
        // Add to local data
        rekapLemburData.push(overtimeRecord);
        
        // IMPROVED: Automatically update Overtime Calculation with Duration
        await updateOvertimeCalculation(overtimeRecord);
        
        // Update display
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

// IMPROVED: Function to calculate overtime duration with overnight support
function calculateOvertimeDuration(startTime, endTime) {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    // IMPROVED: If end time is on the next day (after midnight)
    if (end < start) {
        end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
}

// Update overtime detail table with Duration column
function updateOvertimeDetailTable() {
    const tbody = document.getElementById('overtimeDetailTableBody');
    tbody.innerHTML = '';
    
    // Filter data based on date range
    const startDate = document.getElementById('startDateOvertimeOutput').valueAsDate;
    const endDate = document.getElementById('endDateOvertimeOutput').valueAsDate;
    
    // Filter based on employee (for admin) or current user (for regular user)
    let filteredData = rekapLemburData;
    
    if (currentUser.role === 'admin') {
        const employeeFilter = document.getElementById('overtimeEmployeeFilter').value;
        if (employeeFilter !== 'all') {
            filteredData = rekapLemburData.filter(record => record.employeeName === employeeFilter);
        }
    } else {
        // IMPROVED: For regular user, only show their own data
        filteredData = rekapLemburData.filter(record => record.employeeEmail === currentUser.email);
        
        // Also filter based on selected date range
        if (startDate && endDate) {
            filteredData = filteredData.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate >= startDate && recordDate <= endDate;
            });
        }
    }
    
    // Filter based on date range for admin
    if (currentUser.role === 'admin' && startDate && endDate) {
        filteredData = filteredData.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= startDate && recordDate <= endDate;
        });
    }
    
    if (filteredData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="11" class="text-center">No overtime data found</td>`;
        tbody.appendChild(row);
        return;
    }
    
    let rowNumber = 1;
    filteredData.forEach(record => {
        // If there's table data, show each row
        if (record.tableData && record.tableData.length > 0) {
            record.tableData.forEach((tableRow, index) => {
                const row = document.createElement('tr');
                // IMPROVED: Add class for regular user
                if (currentUser.role === 'user') {
                    row.classList.add('user-overtime-detail');
                }
                row.innerHTML = `
                    <td>${rowNumber++}</td>
                    <td>${record.employeeName}</td>
                    <td>${index === 0 ? record.date : ''}</td>
                    <td>${index === 0 ? record.startTime : ''}</td>
                    <td>${index === 0 ? record.endTime : ''}</td>
                    <td>${index === 0 ? record.overtimeDuration : ''}</td> <!-- Duration column -->
                    <td>${tableRow.totalProject || ''}</td>
                    <td>${tableRow.totalPlant || ''}</td>
                    <td>${tableRow.plantNames || ''}</td>
                    <td>${tableRow.volume || ''}</td>
                    <td>${index === 0 ? record.taskDescription : ''}</td>
                `;
                tbody.appendChild(row);
            });
        } else {
            // If no table data, show only one row
            const row = document.createElement('tr');
            // IMPROVED: Add class for regular user
            if (currentUser.role === 'user') {
                row.classList.add('user-overtime-detail');
            }
            row.innerHTML = `
                <td>${rowNumber++}</td>
                <td>${record.employeeName}</td>
                <td>${record.date}</td>
                <td>${record.startTime}</td>
                <td>${record.endTime}</td>
                <td>${record.overtimeDuration}</td> <!-- Duration column -->
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td>${record.taskDescription}</td>
            `;
            tbody.appendChild(row);
        }
    });
    
    // Update total overtime
    updateTotalOvertime();
}

// Edit overtime record (admin only)
async function editOvertimeRecord(recordId) {
    if (currentUser.role !== 'admin') {
        showNotification('Only admin can edit overtime records', 'error');
        return;
    }
    
    const record = rekapLemburData.find(r => r.id === recordId);
    if (!record) return;
    
    // Fill form with data to be edited
    document.getElementById('rekapDate').value = record.date;
    document.getElementById('rekapStartTime').value = record.startTime;
    document.getElementById('rekapEndTime').value = record.endTime;
    document.getElementById('uraianTugas').value = record.taskDescription;
    
    // Delete old record
    await deleteOvertimeRecord(recordId, false);
    
    showNotification('Overtime record loaded for editing', 'info');
}

// Delete overtime record
async function deleteOvertimeRecord(recordId, showConfirm = true) {
    if (currentUser.role !== 'admin') {
        showNotification('Only admin can delete overtime records', 'error');
        return;
    }
    
    if (showConfirm && !confirm('Are you sure you want to delete this overtime record?')) {
        return;
    }
    
    try {
        await db.collection('overtimeRecords').doc(recordId).delete();
        
        // Delete from local data
        rekapLemburData = rekapLemburData.filter(record => record.id !== recordId);
        
        // Update display
        updateOvertimeDetailTable();
        updateTotalOvertime();
        
        if (showConfirm) {
            showNotification('Overtime record deleted successfully', 'success');
        }
        
    } catch (error) {
        console.error('Error deleting overtime record:', error);
        showNotification('Error deleting overtime record: ' + error.message, 'error');
    }
}

// IMPROVED: Update total overtime
function updateTotalOvertime() {
    const totalOvertimeElement = document.getElementById('totalOvertimeValue');
    
    // Filter data based on date range
    const startDate = document.getElementById('startDateOvertimeOutput').valueAsDate;
    const endDate = document.getElementById('endDateOvertimeOutput').valueAsDate;
    
    // Filter based on employee (for admin)
    let filteredData = rekapLemburData;
    if (currentUser.role === 'admin') {
        const employeeFilter = document.getElementById('overtimeEmployeeFilter').value;
        if (employeeFilter !== 'all') {
            filteredData = rekapLemburData.filter(record => record.employeeName === employeeFilter);
        }
    }
    
    // Filter based on date range
    if (startDate && endDate) {
        filteredData = filteredData.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= startDate && recordDate <= endDate;
        });
    }
    
    // Calculate total overtime
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

// Update overtime display when filter changes
function updateOvertimeDisplay() {
    updateOvertimeDetailTable();
}

// Reset overtime form
function resetOvertimeForm() {
    document.getElementById('rekapDate').valueAsDate = new Date();
    document.getElementById('rekapStartTime').value = '';
    document.getElementById('rekapEndTime').value = '';
    document.getElementById('uraianTugas').value = '';
    
    // Reset table
    const tbody = document.getElementById('rekapLemburTableBody');
    tbody.innerHTML = '';
    currentRekapRows = [];
    
    // Add first row
    addRekapRow();
}

// IMPROVED: Integration with Overtime Calculation - IMPROVED WITH AUTOMATIC LOOKUP
async function updateOvertimeCalculation(overtimeRecord) {
    if (!currentUser) return;
    
    try {
        // Format date for search (DD/MM/YYYY)
        const formattedDate = formatDateForShift(new Date(overtimeRecord.date));
        
        console.log('Searching for overtime calculation data for:', {
            employee: overtimeRecord.employeeName,
            date: formattedDate,
            duration: overtimeRecord.overtimeDuration,
            task: overtimeRecord.taskDescription
        });
        
        // Find matching overtime calculation data based on name and date
        const overtimeSnapshot = await db.collection('overtime')
            .where('name', '==', overtimeRecord.employeeName)
            .where('date', '==', formattedDate)
            .get();
        
        if (!overtimeSnapshot.empty) {
            const batch = db.batch();
            let updatedCount = 0;
            
            overtimeSnapshot.forEach(doc => {
                const overtimeData = doc.data();
                
                console.log('Data found, updating RKP PIC and Remarks with data from Overtime Form:', {
                    id: doc.id,
                    rkpPIC: overtimeRecord.overtimeDuration, // Duration from Overtime Form
                    remarks: overtimeRecord.taskDescription || 'Overtime recorded' // Task description from Overtime Form
                });
                
                // Update existing record
                const docRef = db.collection('overtime').doc(doc.id);
                
                // IMPROVED: Update RKP PIC with overtime duration from Duration column
                batch.update(docRef, {
                    rkpPIC: overtimeRecord.overtimeDuration, // Take from Duration column
                    // IMPROVED: Update Remarks with task description from Overtime Form
                    remarks: overtimeRecord.taskDescription || 'Overtime recorded',
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Update local data
                const localItem = overtimeCalcData.find(d => d.id === doc.id);
                if (localItem) {
                    localItem.rkpPIC = overtimeRecord.overtimeDuration; // Take from Duration column
                    localItem.remarks = overtimeRecord.taskDescription || 'Overtime recorded';
                }
                
                updatedCount++;
            });
            
            await batch.commit();
            console.log(`Successfully updated ${updatedCount} records in Firestore`);
            
        } else {
            // If no matching record found, create new record
            console.log('No matching record found, creating new record');
            await createNewOvertimeCalculationRecord(overtimeRecord, formattedDate);
        }
        
        // IMPROVED: Refresh overtime calculation data
        await loadOvertimeCalculationData();
        
        // Update table if currently viewing overtime tab
        if (currentTab === "overtime") {
            updateOvertimeTable();
        }
        
        console.log('Overtime calculation integration completed');
        
    } catch (error) {
        console.error('Error updating overtime calculation:', error);
        // Still continue even if there's an error in integration
        console.log('Continuing without overtime calculation integration');
    }
}

// IMPROVED: Function to create new overtime calculation record with Duration
async function createNewOvertimeCalculationRecord(overtimeRecord, formattedDate) {
    try {
        // Create basic data for overtime calculation
        const newOvertimeCalc = {
            area: "CDC East", // Default area
            name: overtimeRecord.employeeName,
            position: "", // Will be filled if available
            date: formattedDate,
            shift: "", // Will be filled if available
            shiftCheckIn: "",
            shiftCheckOut: "",
            wtNormal: "",
            actualCheckIn: "",
            actualCheckOut: "",
            overTime: "",
            cekRMC: "",
            // IMPROVED: Automatically fill RKP PIC with Duration and Remarks with task description
            rkpPIC: overtimeRecord.overtimeDuration, // Take from Duration column
            rmcShiftCheckOut: "",
            remarks: overtimeRecord.taskDescription || 'Overtime recorded', // Take from task description
            createdFromOvertimeForm: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Try to get employee data to complete information
        const employeeData = absensiData.find(emp => emp.name === overtimeRecord.employeeName);
        if (employeeData) {
            newOvertimeCalc.area = employeeData.area || "CDC East";
            newOvertimeCalc.position = employeeData.position || "";
            
            // Try to get shift for that date
            if (employeeData.shifts && employeeData.shifts[formattedDate]) {
                const shiftCode = employeeData.shifts[formattedDate];
                newOvertimeCalc.shift = shiftCode;
                
                // Get shift details from matrix
                const shiftDetails = CONSTANTS.SHIFT_MATRIX[employeeData.position] && CONSTANTS.SHIFT_MATRIX[employeeData.position][shiftCode];
                if (shiftDetails) {
                    newOvertimeCalc.shiftCheckIn = shiftDetails.checkIn;
                    newOvertimeCalc.shiftCheckOut = shiftDetails.checkOut;
                    newOvertimeCalc.wtNormal = shiftDetails.hours;
                }
            }
        }
        
        // Save to Firestore
        const docRef = await db.collection('overtime').add(newOvertimeCalc);
        newOvertimeCalc.id = docRef.id;
        
        // Add to local data
        overtimeCalcData.push(newOvertimeCalc);
        
        console.log('Created new overtime calculation record:', newOvertimeCalc);
        
    } catch (error) {
        console.error('Error creating new overtime calculation record:', error);
    }
}
