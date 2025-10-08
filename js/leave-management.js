// Leave management logic

// Global variables
let cutiData = [];
let cutiDetailData = [];

// Load leave data
async function loadCutiData() {
    try {
        const cutiSnapshot = await db.collection('cuti').get();
        
        cutiData = [];
        cutiSnapshot.forEach(doc => {
            cutiData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update cuti table
        updateCutiTable();
        
        // Generate cuti detail data
        generateCutiDetailData();
        
    } catch (error) {
        console.error('Error loading leave data:', error);
    }
}

// Update cuti table
function updateCutiTable() {
    const tableBody = document.getElementById('cutiTableBody');
    tableBody.innerHTML = '';
    
    cutiData.forEach((cuti, index) => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${cuti.employeeName}</td>
            <td>${cuti.startDate}</td>
            <td>${cuti.endDate}</td>
            <td>${cuti.duration}</td>
            <td><input type="text" class="form-control form-control-sm remarks-input" value="${cuti.remarks || ''}" placeholder="Enter remarks"></td>
            <td>
                <button class="btn btn-futuristic btn-sm edit-cuti-btn">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-delete-cuti" onclick="deleteCutiRow('${cuti.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        
        // Add event listener for edit button
        const editBtn = row.querySelector('.edit-cuti-btn');
        editBtn.addEventListener('click', function() {
            const remarksInput = row.querySelector('.remarks-input');
            remarksInput.readOnly = false;
            remarksInput.focus();
            remarksInput.select();
            
            // Change button to Save
            this.innerHTML = '<i class="fas fa-save"></i> Save';
            this.classList.remove('edit-cuti-btn');
            this.classList.add('save-cuti-btn');
            
            // Add event listener for save button
            this.addEventListener('click', function() {
                remarksInput.readOnly = true;
                this.innerHTML = '<i class="fas fa-edit"></i> Edit';
                this.classList.remove('save-cuti-btn');
                this.classList.add('edit-cuti-btn');
                
                // Update cuti data
                cuti.remarks = remarksInput.value;
            });
        });
    });
}

// Add cuti to table
function addCutiToTable(employeeName, startDate, endDate, duration, cutiId) {
    const tableBody = document.getElementById('cutiTableBody');
    const rowCount = tableBody.rows.length;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${rowCount + 1}</td>
        <td>${employeeName}</td>
        <td>${startDate}</td>
        <td>${endDate}</td>
        <td>${duration}</td>
        <td><input type="text" class="form-control form-control-sm remarks-input" value="" placeholder="Enter remarks"></td>
        <td>
            <button class="btn btn-futuristic btn-sm edit-cuti-btn">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-delete-cuti" onclick="deleteCutiRow('${cutiId}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </td>
    `;
    
    // Add event listener for edit button
    const editBtn = row.querySelector('.edit-cuti-btn');
    editBtn.addEventListener('click', function() {
        const remarksInput = row.querySelector('.remarks-input');
        remarksInput.readOnly = false;
        remarksInput.focus();
        remarksInput.select();
        
        // Change button to Save
        this.innerHTML = '<i class="fas fa-save"></i> Save';
        this.classList.remove('edit-cuti-btn');
        this.classList.add('save-cuti-btn');
        
        // Add event listener for save button
        this.addEventListener('click', function() {
            remarksInput.readOnly = true;
            this.innerHTML = '<i class="fas fa-edit"></i> Edit';
            this.classList.remove('save-cuti-btn');
            this.classList.add('edit-cuti-btn');
            
            // Update cuti data
            const cuti = cutiData.find(c => c.id === cutiId);
            if (cuti) {
                cuti.remarks = remarksInput.value;
            }
        });
    });
    
    tableBody.appendChild(row);
}

// Delete cuti row
async function deleteCutiRow(cutiId) {
    if (!confirm('Are you sure you want to delete this leave record?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Delete from Firestore
        await db.collection('cuti').doc(cutiId).delete();
        
        // Delete from local data
        cutiData = cutiData.filter(cuti => cuti.id !== cutiId);
        
        // Update display
        updateCutiTable();
        generateCutiDetailData();
        
        showNotification('Leave record deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting leave record:', error);
        showNotification('Error deleting leave record: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Generate cuti detail data
function generateCutiDetailData() {
    // Empty detail table
    document.getElementById('cutiDetailTableBody').innerHTML = '';
    
    // Reset cuti detail data
    cutiDetailData = [];
    
    // Get all employees from absensiData or initialEmployees
    const allEmployees = absensiData.length > 0 ? absensiData : CONSTANTS.INITIAL_EMPLOYEES;
    
    // Create set to track processed employees
    const processedEmployees = new Set();
    
    // Process each employee
    allEmployees.forEach(employee => {
        if (processedEmployees.has(employee.name)) return; // Skip if already processed
        processedEmployees.add(employee.name);
        
        // Calculate remaining leave for this employee
        const remainingLeave = calculateRemainingLeave(employee.name);
        
        // Add to cuti detail data
        const cutiDetail = {
            employeeName: employee.name,
            workArea: employee.area,
            position: employee.position,
            remainingLeave: remainingLeave
        };
        
        cutiDetailData.push(cutiDetail);
        
        // Add to detail table
        addCutiToDetailTable(cutiDetail);
    });
}

// Add cuti to detail table
function addCutiToDetailTable(cutiDetail) {
    const tableBody = document.getElementById('cutiDetailTableBody');
    const rowCount = tableBody.rows.length;
    
    const row = tableBody.insertRow();
    row.innerHTML = `
        <td>${rowCount + 1}</td>
        <td>${cutiDetail.employeeName}</td>
        <td>${cutiDetail.workArea}</td>
        <td>${cutiDetail.position}</td>
        <td>${cutiDetail.remainingLeave}</td>
        <td>
            <button class="btn btn-info btn-sm view-leave-details" onclick="viewLeaveDetails('${cutiDetail.employeeName}')">
                <i class="fas fa-eye"></i> View
            </button>
        </td>
    `;
}

// View leave details
function viewLeaveDetails(employeeName) {
    // Filter cuti data by employeeName
    const employeeLeaves = cutiData.filter(cuti => cuti.employeeName === employeeName);
    
    // Update modal title
    document.getElementById('modalEmployeeName').textContent = employeeName;
    
    // Update modal content
    const tbody = document.getElementById('leaveDetailTableBody');
    tbody.innerHTML = '';
    
    if (employeeLeaves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No leave data found</td></tr>';
    } else {
        employeeLeaves.forEach(leave => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${leave.startDate}</td>
                <td>${leave.endDate}</td>
                <td>${leave.duration}</td>
                <td>${leave.remarks || '-'}</td>
                <td>
                    <button class="btn-delete-cuti" onclick="deleteCutiRow('${leave.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('viewLeaveDetailModal'));
    modal.show();
}

// Calculate remaining leave based on year
function calculateRemainingLeave(employeeName) {
    const currentYear = new Date().getFullYear();
    
    // Initial leave is 12 days per year
    const totalLeave = CONSTANTS.LEAVE_DAYS_PER_YEAR;
    
    // Find all leaves for this employee in this year
    const employeeLeaves = cutiData.filter(cuti => {
        if (cuti.employeeName !== employeeName) return false;
        
        // Filter by year
        const startYear = new Date(cuti.startDate).getFullYear();
        return startYear === currentYear;
    });
    
    // Calculate total duration of leaves taken this year
    let totalTaken = 0;
    employeeLeaves.forEach(leave => {
        totalTaken += leave.duration;
    });
    
    // Calculate remaining leave
    const remaining = totalLeave - totalTaken;
    
    // Make sure it's not negative
    return Math.max(0, remaining);
}

// Update remaining leave display
function updateRemainingLeaveDisplay(employeeName) {
    const remainingLeave = calculateRemainingLeave(employeeName);
    document.getElementById('remainingLeaveValue').textContent = remainingLeave;
}

// Save cuti data to Firestore and update attendance table
async function saveCutiDataToFirestore() {
    if (!isOnline) {
        console.log('Offline - data will be saved when connection is restored');
        return;
    }
    
    try {
        // Save cuti data to Firestore
        const batch = db.batch();
        
        // Delete old cuti data
        const cutiSnapshot = await db.collection('cuti').get();
        cutiSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add new cuti data
        cutiData.forEach(cuti => {
            const docRef = db.collection('cuti').doc(cuti.id);
            batch.set(docRef, {
                employeeName: cuti.employeeName,
                startDate: cuti.startDate,
                endDate: cuti.endDate,
                duration: cuti.duration,
                remarks: cuti.remarks || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        
        // Update attendance table with shift 'C' for leave days
        await updateAttendanceWithCuti();
        
        // Generate cuti detail data
        generateCutiDetailData();
        
        showNotification('Leave data saved successfully and attendance updated', 'success');
        
    } catch (error) {
        console.error('Error saving leave data:', error);
        showNotification('Error saving leave data: ' + error.message, 'error');
    }
}

// Update attendance table with shift 'C' for leave days
async function updateAttendanceWithCuti() {
    try {
        // Loop through all cuti data
        for (const cuti of cutiData) {
            const startDate = new Date(cuti.startDate);
            const endDate = new Date(cuti.endDate);
            const employeeName = cuti.employeeName;
            
            // Loop through each day in the leave period
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateStr = formatDateForShift(currentDate);
                
                // Find employee in absensiData
                const employee = absensiData.find(emp => emp.name === employeeName);
                if (employee) {
                    // Update shift to 'C' for that date
                    if (!employee.shifts) employee.shifts = {};
                    employee.shifts[dateStr] = 'C';
                }
                
                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        
        // Save changes to Firestore
        await saveDataToFirestore();
        
        // Update table display
        updateEntryTable();
        updateAbsenTabelTable();
        
    } catch (error) {
        console.error('Error updating attendance with leave data:', error);
    }
}

// Update cuti employee dropdown
function updateCutiEmployeeDropdown() {
    const cutiEmployeeDropdown = document.getElementById('cutiEmployee');
    const currentValue = cutiEmployeeDropdown.value;
    
    // Clear existing options
    cutiEmployeeDropdown.innerHTML = '';
    
    const uniqueNames = new Set();
    absensiData.forEach(employee => {
        if (employee.name) uniqueNames.add(employee.name);
    });
    
    if (uniqueNames.size === 0) {
        CONSTANTS.INITIAL_EMPLOYEES.forEach(employee => {
            uniqueNames.add(employee.name);
        });
    }
    
    uniqueNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        cutiEmployeeDropdown.appendChild(option);
    });
    
    if (currentValue && uniqueNames.has(currentValue)) {
        cutiEmployeeDropdown.value = currentValue;
    }
}

// Initialize leave management when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup event listeners
    document.getElementById('addCuti').addEventListener('click', function() {
        const employeeName = document.getElementById('cutiEmployee').value;
        const startDate = document.getElementById('cutiStartDate').value;
        const endDate = document.getElementById('cutiEndDate').value;
        
        if (!employeeName || !startDate || !endDate) {
            showNotification('Please fill all fields', 'error');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            showNotification('End date must be after start date', 'error');
            return;
        }
        
        // Validate remaining leave
        const remainingLeave = calculateRemainingLeave(employeeName);
        const duration = calculateDuration(startDate, endDate);
        
        if (remainingLeave <= 0) {
            showNotification('No remaining leave available for this employee', 'error');
            return;
        }
        
        if (duration > remainingLeave) {
            showNotification(`Not enough remaining leave. Available: ${remainingLeave} days, Requested: ${duration} days`, 'error');
            return;
        }
        
        // Create unique ID for new cuti
        const newCutiId = 'cuti-' + Date.now();
        
        const newCuti = {
            id: newCutiId,
            employeeName,
            startDate,
            endDate,
            duration,
            remarks: ""
        };
        
        cutiData.push(newCuti);
        addCutiToTable(employeeName, startDate, endDate, duration, newCutiId);
        
        // Update remaining leave display
        updateRemainingLeaveDisplay(employeeName);
        
        document.getElementById('cutiStartDate').value = '';
        document.getElementById('cutiEndDate').value = '';
        
        showNotification('Leave added successfully', 'success');
    });
    
    // Save cuti button
    document.getElementById('saveCuti').addEventListener('click', async function() {
        const rows = document.querySelectorAll('#cutiTableBody tr');
        rows.forEach((row, index) => {
            if (cutiData[index]) {
                const remarksInput = row.querySelector('.remarks-input');
                cutiData[index].remarks = remarksInput.value;
            }
        });
        
        await saveCutiDataToFirestore();
    });
    
    // Load cuti data when application starts
    loadCutiData();
});
