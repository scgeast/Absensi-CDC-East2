// Main application logic

// Global variables
let currentTab = "entry";
let absenTabelData = [];
let dateRangeAbsenTabel = [];

// Load initial data
async function loadInitialData() {
    showLoading(true);
    
    try {
        // Set default dates for Main folder
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        document.getElementById('startDateMain').valueAsDate = firstDayOfMonth;
        document.getElementById('endDateMain').valueAsDate = today;
        
        // IMPROVED: Set default dates for Overtime & Output
        document.getElementById('startDateOvertimeOutput').valueAsDate = firstDayOfMonth;
        document.getElementById('endDateOvertimeOutput').valueAsDate = today;
        
        // IMPROVED: Set default dates for Attendance Table
        document.getElementById('startDateAbsenTabel').valueAsDate = firstDayOfMonth;
        document.getElementById('endDateAbsenTabel').valueAsDate = today;
        
        // Try to load data from Firestore
        try {
            const [absensiSnapshot, settingsSnapshot, absenTabelSnapshot, cutiSnapshot] = await Promise.all([
                db.collection('absensi').limit(50).get(),
                db.collection('settings').doc('dateRange').get().catch(() => null),
                db.collection('absenTabel').limit(50).get().catch(() => null),
                db.collection('cuti').limit(50).get().catch(() => null)
            ]);
            
            absensiData = [];
            absensiSnapshot.forEach(doc => {
                absensiData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Load absen tabel data
            absenTabelData = [];
            if (absenTabelSnapshot) {
                absenTabelSnapshot.forEach(doc => {
                    absenTabelData.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
            }
            
            // IMPROVED: Load cuti data with year filter
            cutiData = [];
            if (cutiSnapshot) {
                cutiSnapshot.forEach(doc => {
                    const cutiItem = {
                        id: doc.id,
                        ...doc.data()
                    };
                    cutiData.push(cutiItem);
                });
            }
            
            // Apply date settings if available
            if (settingsSnapshot && settingsSnapshot.exists) {
                const settings = settingsSnapshot.data();
                if (settings.startDate) document.getElementById('startDateMain').value = settings.startDate;
                if (settings.endDate) document.getElementById('endDateMain').value = settings.endDate;
            }
            
        } catch (firestoreError) {
            console.warn('Could not load data from Firestore:', firestoreError);
            // Use initial employees if Firestore is unavailable
            absensiData = [...CONSTANTS.INITIAL_EMPLOYEES];
        }
        
        // Load users data
        await loadUsers();
        
        // Load overtime calculation data
        await loadOvertimeCalculationData();
        
        // Load overtime form data
        await loadAllOvertimeData();
        
        // Setup UI components
        initCollapsible();
        applyDateFilterMain(); // Apply filter for Main folder
        updateEmployeeDropdown();
        updateCutiEmployeeDropdown();
        initSidebar();
        initMobileMenu();
        
        // Set active tab based on role
        if (currentUser.role === 'user') {
            document.querySelector('[data-tab="absen-tabel"]').click();
        } else {
            document.querySelector('[data-tab="entry"]').click();
        }
        
    } catch (error) {
        console.error('Error loading initial data:', error);
    } finally {
        showLoading(false);
    }
}

// Initialize sidebar
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    // Make sure event listener is properly attached
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('expanded');
            document.getElementById('mainContent').classList.toggle('expanded');
            document.body.classList.toggle('header-expanded');
            document.getElementById('userPasswordSection').classList.toggle('expanded');
        });
    }
    
    // Folder toggle
    document.querySelectorAll('.sidebar-folder-header').forEach(header => {
        header.addEventListener('click', function() {
            this.parentElement.classList.toggle('expanded');
        });
    });
    
    // Menu item clicks
    document.querySelectorAll('.sidebar-menu a[data-tab]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active menu
            document.querySelectorAll('.sidebar-menu a').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding tab
            const tabName = this.getAttribute('data-tab');
            currentTab = tabName;
            
            document.querySelectorAll('.tab-pane').forEach(tab => {
                tab.classList.remove('show', 'active');
            });
            
            const targetTab = document.getElementById(tabName);
            if (targetTab) {
                targetTab.classList.add('show', 'active');
            }
            
            // IMPROVED: Show/hide appropriate filters
            if (tabName === 'entry' || tabName === 'cuti' || tabName === 'summary-overtime') {
                // Main folder tabs
                document.getElementById('filterSectionMain').style.display = 'block';
                document.getElementById('filterSectionOvertimeOutput').style.display = 'none';
                document.getElementById('filterSectionAbsenTabel').style.display = 'none';
            } else if (tabName === 'output' || tabName === 'overtime' || tabName === 'form-rekap-lembur') {
                // Overtime & Output tabs
                document.getElementById('filterSectionMain').style.display = 'none';
                document.getElementById

            // IMPROVED: Show/hide appropriate filters
            if (tabName === 'entry' || tabName === 'cuti' || tabName === 'summary-overtime') {
                // Main folder tabs
                document.getElementById('filterSectionMain').style.display = 'block';
                document.getElementById('filterSectionOvertimeOutput').style.display = 'none';
                document.getElementById('filterSectionAbsenTabel').style.display = 'none';
            } else if (tabName === 'output' || tabName === 'overtime' || tabName === 'form-rekap-lembur') {
                // Overtime & Output tabs
                document.getElementById('filterSectionMain').style.display = 'none';
                document.getElementById('filterSectionOvertimeOutput').style.display = 'block';
                document.getElementById('filterSectionAbsenTabel').style.display = 'none';
            } else if (tabName === 'absen-tabel' || tabName === 'cuti-detail') {
                // Attendance Table tabs
                document.getElementById('filterSectionMain').style.display = 'none';
                document.getElementById('filterSectionOvertimeOutput').style.display = 'none';
                document.getElementById('filterSectionAbsenTabel').style.display = 'block';
            } else if (tabName === 'setting') {
                document.getElementById('filterSectionMain').style.display = 'none';
                document.getElementById('filterSectionOvertimeOutput').style.display = 'none';
                document.getElementById('filterSectionAbsenTabel').style.display = 'none';
            }
            
            // Load absen tabel data when switching to that tab
            if (tabName === 'absen-tabel') {
                loadAbsenTabelData();
                updateAttendanceSummaryTable(); // NEW: Update attendance summary
            }
            
            // Load overtime summary when switching to that tab
            if (tabName === 'summary-overtime') {
                updateOvertimeSummaryTable(); // NEW: Update overtime summary
            }
            
            // Load output data when switching to output tab
            if (tabName === 'output') {
                if (!outputDataLoaded) {
                    generateOutputAndOvertimeData();
                    outputDataLoaded = true;
                }
                updateOutputTable();
            }
            
            // Load overtime data when switching to overtime tab
            if (tabName === 'overtime') {
                if (!overtimeDataLoaded) {
                    generateOutputAndOvertimeData();
                    overtimeDataLoaded = true;
                }
                updateOvertimeTable();
            }
            
            // Load cuti detail data when switching to cuti-detail tab
            if (tabName === 'cuti-detail') {
                generateCutiDetailData();
            }
            
            // Load cuti data when switching to cuti tab
            if (tabName === 'cuti') {
                updateCutiTable();
            }
            
            // Initialize overtime form when switching to that tab
            if (tabName === 'form-rekap-lembur') {
                initOvertimeForm();
            }
        });
    });
}

// Initialize mobile menu
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
            sidebarBackdrop.classList.toggle('mobile-open');
        });
        
        sidebarBackdrop.addEventListener('click', function() {
            sidebar.classList.remove('mobile-open');
            this.classList.remove('mobile-open');
        });
    }
    
    // Close sidebar when menu item is clicked on mobile
    document.querySelectorAll('.sidebar-menu a').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth < 992) {
                sidebar.classList.remove('mobile-open');
                sidebarBackdrop.classList.remove('mobile-open');
            }
        });
    });
}

// Initialize collapsible sections
function initCollapsible() {
    const coll = document.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function() {
            this.classList.toggle("active");
            const content = this.nextElementSibling;
            content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
        });
        
        // Auto-expand first one
        if (i === 0) {
            coll[i].classList.add("active");
            const content = coll[i].nextElementSibling;
            content.style.maxHeight = content.scrollHeight + "px";
        }
    }
}

// Update employee dropdown
function updateEmployeeDropdown() {
    const employeeDropdownMain = document.getElementById('employeeNameMain');
    const employeeDropdownOvertimeOutput = document.getElementById('employeeNameOvertimeOutput');
    const employeeDropdownAbsenTabel = document.getElementById('employeeNameAbsenTabel');
    
    // Update Main folder dropdown
    updateEmployeeDropdownForElement(employeeDropdownMain);
    
    // Update Overtime & Output dropdown
    updateEmployeeDropdownForElement(employeeDropdownOvertimeOutput);
    
    // Update Attendance Table dropdown
    updateEmployeeDropdownForElement(employeeDropdownAbsenTabel);
}

function updateEmployeeDropdownForElement(dropdownElement) {
    const currentValue = dropdownElement.value;
    
    // Clear existing options except "Select All"
    while (dropdownElement.options.length > 1) {
        dropdownElement.remove(1);
    }
    
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
        dropdownElement.appendChild(option);
    });
    
    if (currentValue !== 'all' && uniqueNames.has(currentValue)) {
        dropdownElement.value = currentValue;
    }
}

// IMPROVED: Function to load absen tabel data
async function loadAbsenTabelData() {
    try {
        const absenTabelSnapshot = await db.collection('absenTabel').get();
        
        absenTabelData = [];
        absenTabelSnapshot.forEach(doc => {
            absenTabelData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update absen tabel table
        updateAbsenTabelTable();
        
    } catch (error) {
        console.error('Error loading absen tabel data:', error);
    }
}

// IMPROVED: Function to update absen tabel table with separate filter
function updateAbsenTabelTable() {
    const thead = document.querySelector('#absenTabelTable thead tr');
    const tbody = document.querySelector('#absenTabelTable tbody');
    
    // Update header - make it exactly the same as entry table
    let headerHTML = '<th>Work Area</th><th>Employee Name</th><th>Job Position</th>';
    dateRangeAbsenTabel.forEach(date => {
        headerHTML += `<th>${formatDateForHeader(date)}</th>`;
    });
    headerHTML += '<th>Action</th>';
    thead.innerHTML = headerHTML;
    
    // Update body
    let tbodyHTML = '';
    
    // Sort employees by default order
    const sortedData = sortEmployeesByDefaultOrder(absenTabelData);
    
    sortedData.forEach(employee => {
        let rowHTML = `
            <td><input type="text" value="${employee.area || ''}" class="area-input read-only-input" readonly ondblclick="makeEditable(this)"></td>
            <td><input type="text" value="${employee.name || ''}" class="name-input read-only-input" readonly ondblclick="makeEditable(this)"></td>
            <td><input type="text" value="${employee.position || ''}" class="position-input read-only-input" readonly ondblclick="makeEditable(this)"></td>
        `;
        
        dateRangeAbsenTabel.forEach(date => {
            const dateStr = formatDateForShift(date);
            const shiftValue = employee.shifts && employee.shifts[dateStr] ? employee.shifts[dateStr] : '';
            rowHTML += `<td><input type="text" value="${shiftValue}" class="shift-input read-only-input" readonly></td>`;
        });
        
        // IMPROVED: Remove delete button in absen tabel
        rowHTML += '<td><button class="btn-edit" onclick="viewRow(this)"><i class="fas fa-eye"></i></button></td>';
        tbodyHTML += `<tr>${rowHTML}</tr>`;
    });
    
    tbody.innerHTML = tbodyHTML;
    
    // Apply shift colors
    const shiftInputs = document.querySelectorAll('#absenTabelTable .shift-input');
    shiftInputs.forEach(input => {
        updateShiftColor(input);
    });
    
    // NEW: Update attendance summary table
    updateAttendanceSummaryTable();
}

// IMPROVED: Function to view row details (without editing)
function viewRow(button) {
    const row = button.closest('tr');
    const name = row.querySelector('.name-input').value;
    const position = row.querySelector('.position-input').value;
    
    showNotification(`Viewing details for ${name} - ${position}`, 'info');
}

// IMPROVED: Function to apply date filter for Attendance Table
function applyDateFilterAbsenTabel() {
    const startDate = document.getElementById('startDateAbsenTabel').valueAsDate;
    const endDate = document.getElementById('startDateAbsenTabel').valueAsDate;
    
    if (!startDate || !endDate) return;
    
    dateRangeAbsenTabel = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        dateRangeAbsenTabel.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Limit to 31 days for performance
    if (dateRangeAbsenTabel.length > CONSTANTS.DEFAULT_DATE_RANGE) {
        alert(`Date range limited to ${CONSTANTS.DEFAULT_DATE_RANGE} days for better performance`);
        dateRangeAbsenTabel = dateRangeAbsenTabel.slice(0, CONSTANTS.DEFAULT_DATE_RANGE);
        document.getElementById('endDateAbsenTabel').valueAsDate = dateRangeAbsenTabel[dateRangeAbsenTabel.length - 1];
    }
    
    // Update tables that use Absen Tabel filter
    if (currentTab === "absen-tabel") {
        updateAbsenTabelTable();
    }
    if (currentTab === "cuti-detail") {
        generateCutiDetailData();
    }
}

// NEW: Function to generate attendance summary data - IMPROVED
function generateAttendanceSummary() {
    const summaryData = {};
    
    // Process each employee in absenTabelData
    absenTabelData.forEach(employee => {
        if (!employee.name) return;
        
        // Initialize employee summary if not exists
        if (!summaryData[employee.name]) {
            summaryData[employee.name] = {
                name: employee.name,
                off: 0,
                morning: 0,
                afternoon: 0,
                night: 0,
                morningPart: 0,
                afternoonPart: 0,
                leave: 0,
                totalAttendance: 0,
                totalWorkDay: 0
            };
        }
        
        // Count shifts for this employee
        if (employee.shifts) {
            Object.values(employee.shifts).forEach(shiftCode => {
                const shift = shiftCode.toUpperCase();
                
                switch(shift) {
                    case 'O':
                        summaryData[employee.name].off++;
                        break;
                    case '1':
                        summaryData[employee.name].morning++;
                        break;
                    case '2':
                        summaryData[employee.name].afternoon++;
                        break;
                    case '3':
                        summaryData[employee.name].night++;
                        break;
                    case '11':
                        summaryData[employee.name].morningPart++;
                        break;
                    case '22':
                        summaryData[employee.name].afternoonPart++;
                        break;
                    case 'C':
                        summaryData[employee.name].leave++;
                        break;
                }
                
                // IMPROVED: Total Work Day = sum of all columns except empty
                if (shift && shift !== '') {
                    summaryData[employee.name].totalWorkDay++;
                }
                
                // Count total attendance (all shifts except empty, O, and C)
                if (shift && shift !== 'O' && shift !== 'C' && shift !== '') {
                    summaryData[employee.name].totalAttendance++;
                }
            });
        }
    });
    
    return Object.values(summaryData);
}

// NEW: Function to update attendance summary table
function updateAttendanceSummaryTable() {
    const tbody = document.getElementById('attendanceSummaryTableBody');
    tbody.innerHTML = '';
    
    const summaryData = generateAttendanceSummary();
    
    if (summaryData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="11" class="text-center">No attendance data available</td>`;
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
            <td>${employee.off}</td>
            <td>${employee.morning}</td>
            <td>${employee.afternoon}</td>
            <td>${employee.night}</td>
            <td>${employee.morningPart}</td>
            <td>${employee.afternoonPart}</td>
            <td>${employee.leave}</td>
            <td>${employee.totalAttendance}</td>
            <td>${employee.totalWorkDay}</td>
        `;
        tbody.appendChild(row);
    });
}

// IMPROVED: Function to handle resize and orientation change
function handleResize() {
    const isMobile = window.innerWidth < 992;
    
    if (isMobile) {
        document.body.classList.add('mobile-view');
    } else {
        document.body.classList.remove('mobile-view');
        // Make sure sidebar is not in mobile mode
        document.getElementById('sidebar').classList.remove('mobile-open');
        document.getElementById('sidebarBackdrop').classList.remove('mobile-open');
    }
}

// IMPROVED: Function to make input editable
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

// IMPROVED: Function to update shift color
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

    // IMPROVED: Remove auto-save when updating shift color
    // Auto-save is only done when save button is clicked
}

// IMPROVED: Function to delete row
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

// IMPROVED: Function to update cuti employee dropdown
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

// IMPROVED: Function to initialize shift colors
function initializeShiftColors() {
    const shiftInputs = document.querySelectorAll('.shift-input');
    shiftInputs.forEach(input => {
        updateShiftColor(input);
    });
}

// IMPROVED: Function to load header settings
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

// IMPROVED: Function to save data to Firestore
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
        
        // IMPROVED: Show success notification only when save button is clicked
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

// IMPROVED: Function to save data to absen tabel (read-only)
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
        
        // IMPROVED: Show success notification only when save button is clicked
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

// IMPROVED: Function to generate output and overtime data - MAKE SURE ALL DATA IS PROCESSED
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

// IMPROVED: Function to load cuti data with year filter
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

// IMPROVED: Function to generate cuti detail data
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

// IMPROVED: Function to calculate remaining leave based on year
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

// IMPROVED: Function to update cuti table with delete button
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

// IMPROVED: Function to add cuti to table with delete button
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

// IMPROVED: Function to delete cuti row
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

// IMPROVED: Function to add cuti to detail table
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

// IMPROVED: Function to view leave details with delete button
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

// IMPROVED: Function to save cuti data to Firestore and update attendance table
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
        
        // IMPROVED: Update attendance table with shift 'C' for leave days
        await updateAttendanceWithCuti();
        
        // Generate cuti detail data
        generateCutiDetailData();
        
        showNotification('Leave data saved successfully and attendance updated', 'success');
        
    } catch (error) {
        console.error('Error saving leave data:', error);
        showNotification('Error saving leave data: ' + error.message, 'error');
    }
}

// IMPROVED: Function to update attendance table with shift 'C' for leave days
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

// IMPROVED: Function to update remaining leave display
function updateRemainingLeaveDisplay(employeeName) {
    const remainingLeave = calculateRemainingLeave(employeeName);
    document.getElementById('remainingLeaveValue').textContent = remainingLeave;
}

// IMPROVED: Function to load all overtime data
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

// IMPROVED: Function to load user overtime data
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

// IMPROVED: Function to update overtime detail table with Duration column
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

// IMPROVED: Function to update total overtime
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

// IMPROVED: Function to update overtime display when filter changes
function updateOvertimeDisplay() {
    updateOvertimeDetailTable();
}

// IMPROVED: Function to reset overtime form
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

// IMPROVED: Function to add row in overtime form
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

// IMPROVED: Function to remove row
function removeRekapRow(button) {
    const row = button.closest('tr');
    const rowId = row.getAttribute('data-row-id');
    
    // Remove from current rows array
    currentRekapRows = currentRekapRows.filter(id => id != rowId);
    
    row.remove();
    updateRowNumbers();
}

// IMPROVED: Function to update row numbers
function updateRowNumbers() {
    const rows = document.querySelectorAll('#rekapLemburTableBody tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

// IMPROVED: Function to update plant selectors based on total plant
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

// IMPROVED: Function to initialize overtime form
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

// IMPROVED: Function to setup employee filter for overtime detail
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

// IMPROVED: Function to save overtime data - IMPROVED
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

// IMPROVED: Function to edit overtime record (admin only)
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

// IMPROVED: Function to delete overtime record
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

// IMPROVED: Function to load overtime calculation data
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

// IMPROVED: Function to update output table with separate filter
function updateOutputTable() {
    const tbody = document.querySelector('#outputTable tbody');
    tbody.innerHTML = '';
    
    // IMPROVED: Filter data based on Overtime & Output date range
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
    
    // IMPROVED: Sort data by date
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

// IMPROVED: Function to update overtime calculation table with separate filter
function updateOvertimeTable() {
    const tbody = document.querySelector('#overtimeTableBody');
    tbody.innerHTML = '';
    
    // IMPROVED: Filter data based on Overtime & Output date range
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
    
    // IMPROVED: Sort data based on selected column and direction
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
    
    // IMPROVED: Add event listeners for automatic calculation based on Actual Check Out
    document.querySelectorAll('.actual-check-out').forEach(input => {
        input.addEventListener('change', function() {
            calculateOvertime(this);
        });
    });
    
    // IMPROVED: Add event listeners for automatic calculation based on Cek RMC
    document.querySelectorAll('.cek-rmc').forEach(input => {
        input.addEventListener('change', function() {
            calculateRmcShiftCheckOut(this);
        });
    });
    
    // IMPROVED: Update sort icons
    updateSortIcons();
    
    // NEW: Update overtime summary if we're on that tab
    if (currentTab === 'summary-overtime') {
        updateOvertimeSummaryTable();
    }
}

// IMPROVED: Function to sort overtime data
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

// IMPROVED: Function to update sort icons
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

// IMPROVED: Function to calculate overtime based on (Actual Check Out - Shift Check Out)
function calculateOvertime(input) {
    const row = input.closest('tr');
    const shiftCheckOut = row.querySelector('td:nth-child(8)').textContent;
    const actualCheckOut = row.querySelector('.actual-check-out').value;
    
    // IMPROVED: Calculate overtime based on (Actual Check Out - Shift Check Out)
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
    
    // IMPROVED: Calculate Rmc - Shift Check Out
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

// IMPROVED: Special function for calculating Rmc-Shift Check Out
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

// IMPROVED: Function to delete overtime calculation row with update to Overtime Form
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
            
            // IMPROVED: Delete related data in Overtime Form as well
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

// IMPROVED: Function to delete related overtime form records
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

// IMPROVED: Function to format date for Overtime Form search
function formatDateForOvertimeFormSearch(dateStr) {
    // Convert from DD/MM/YYYY to YYYY-MM-DD
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
}

// IMPROVED: Function to edit overtime calculation row with sync to Overtime Form
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
    
    // IMPROVED: Add event listener for save changes
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

// IMPROVED: Function to save overtime calculation changes and update Overtime Form
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
            
            // IMPROVED: Update Overtime Form if there are changes in RKP PIC or Remarks
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

// IMPROVED: Function to update related overtime form records
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

// IMPROVED: Function to save output data to Firestore
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
        
        // IMPROVED: Show success notification only when save button is clicked
        showNotification('Output data saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving output data:', error);
        showNotification('Error saving output data: ' + error.message, 'error');
    }
}

// IMPROVED: Function to save overtime data to Firestore
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
        
        // IMPROVED: Show success notification only when save button is clicked
        showNotification('Overtime data saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving overtime data:', error);
        showNotification('Error saving overtime data: ' + error.message, 'error');
    }
}

// NEW: Function to generate overtime summary data - IMPROVED
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
        
        // IMPROVED: Count work days (only count Morning, Afternoon, Night, Morning Part, Afternoon Part)
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

// NEW: Function to update overtime summary table
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

// IMPROVED: Function to refresh overtime data
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

// IMPROVED: Function to integrate with Overtime Calculation - IMPROVED WITH AUTOMATIC LOOKUP
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
                
                // IMPROVED: Update RKP PIC with duration from Duration column
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

// IMPROVED: Function to initialize change password from sidebar
function initChangePasswordSidebar() {
    document.getElementById('changePasswordSidebarBtn').addEventListener('click', function() {
        // Reset form
        document.getElementById('userCurrentPassword').value = '';
        document.getElementById('userNewPassword').value = '';
        document.getElementById('userConfirmPassword').value = '';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        modal.show();
    });
}

// IMPROVED: Function to change password - IMPROVED
async function changeUserPassword() {
    const currentPassword = document.getElementById('userCurrentPassword').value;
    const newPassword = document.getElementById('userNewPassword').value;
    const confirmPassword = document.getElementById('userConfirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Please fill all password fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('New password and confirm password do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('New password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Re-authenticate user
        const user = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        
        await user.reauthenticateWithCredential(credential);
        
        // Update password
        await user.updatePassword(newPassword);
        
        // IMPROVED: Also update password in Firestore
        await db.collection('users').doc(user.uid).update({
            password: newPassword,
            passwordUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Password changed successfully', 'success');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
        modal.hide();
        
        // Reset form
        document.getElementById('userCurrentPassword').value = '';
        document.getElementById('userNewPassword').value = '';
        document.getElementById('userConfirmPassword').value = '';
        
    } catch (error) {
        console.error('Error changing password:', error);
        if (error.code === 'auth/wrong-password') {
            showNotification('Current password is incorrect', 'error');
        } else {
            showNotification('Error changing password: ' + error.message, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// IMPROVED: Function to setup keyboard navigation
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

// IMPROVED: Function to apply date filter for Attendance Table
function applyDateFilterAbsenTabel() {
    const startDate = document.getElementById('startDateAbsenTabel').valueAsDate;
    const endDate = document.getElementById('endDateAbsenTabel').valueAsDate;
    
    if (!startDate || !endDate) return;
    
    dateRangeAbsenTabel = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        dateRangeAbsenTabel.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Limit to 31 days for performance
    if (dateRangeAbsenTabel.length > CONSTANTS.DEFAULT_DATE_RANGE) {
        alert(`Date range limited to ${CONSTANTS.DEFAULT_DATE_RANGE} days for better performance`);
        dateRangeAbsenTabel = dateRangeAbsenTabel.slice(0, CONSTANTS.DEFAULT_DATE_RANGE);
        document.getElementById('endDateAbsenTabel').valueAsDate = dateRangeAbsenTabel[dateRangeAbsenTabel.length - 1];
    }
    
    // Update tables that use Absen Tabel filter
    if (currentTab === "absen-tabel") {
        updateAbsenTabelTable();
    }
    if (currentTab === "cuti-detail") {
        generateCutiDetailData();
    }
}

// IMPROVED: Function to apply date filter for Overtime & Output
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

// IMPROVED: Function to apply date filter for Main folder
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

// IMPROVED: Function to update entry table
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
    
    // IMPROVED: Setup keyboard navigation
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

// IMPROVED: Function to add row
function addRow() {
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
}

// IMPROVED: Function to initialize shift colors
function initializeShiftColors() {
    const shiftInputs = document.querySelectorAll('.shift-input');
    shiftInputs.forEach(input => {
        updateShiftColor(input);
    });
}

// IMPROVED: Function to calculate duration based on year
function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 because inclusive
    return diffDays;
}

// IMPROVED: Function to setup event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup event listeners
    document.getElementById('applyFilterMain').addEventListener('click', applyDateFilterMain);
    
    // IMPROVED: Setup event listeners for Overtime & Output filter
    document.getElementById('applyFilterOvertimeOutput').addEventListener('click', applyDateFilterOvertimeOutput);
    
    // IMPROVED: Setup event listeners for Attendance Table filter
    document.getElementById('applyFilterAbsenTabel').addEventListener('click', applyDateFilterAbsenTabel);
    
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
    document.getElementById('addRow').addEventListener('click', addRow);
    
    // Save data button
    document.getElementById('saveData').addEventListener('click', async function() {
        await saveDataToFirestore();
        await saveDataToAbsenTabel();
    });
    
    // Save output data button
    document.getElementById('saveOutputData').addEventListener('click', async function() {
        await saveOutputDataToFirestore();
    });
    
    // Save overtime data button
    document.getElementById('saveOvertimeData').addEventListener('click', async function() {
        await saveOvertimeDataToFirestore();
    });
    
    // NEW: Refresh overtime data button
    document.getElementById('refreshOvertimeData').addEventListener('click', async function() {
        await refreshOvertimeData();
    });
    
    // IMPROVED: Event listeners for sorting in overtime calculation
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
    
    // NEW: Event listener for Overtime & Output filter to update overtime summary
    document.getElementById('applyFilterOvertimeOutput').addEventListener('click', function() {
        applyDateFilterOvertimeOutput();
        // Update overtime summary if we're on that tab
        if (currentTab === 'summary-overtime') {
            updateOvertimeSummaryTable();
        }
    });
    
    // IMPROVED: Initialize change password sidebar
    initChangePasswordSidebar();
    
    // Load cuti data when application starts
    loadCutiData();
    
    // Check if there's backup data in localStorage
    const backupData = localStorage.getItem('absensiDataBackup');
    if (backupData) {
        try {
            absensiData = JSON.parse(backupData);
            console.log('Loaded backup data from localStorage');
        } catch (e) {
            console.error('Error loading backup data:', e);
        }
    }
    
    // Setup event listeners for resize
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    console.log('Application initialized successfully with all improvements');
});
