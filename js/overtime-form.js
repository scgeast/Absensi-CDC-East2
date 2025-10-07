// Overtime Form Functions
import { db } from './firebase-config.js';
import { currentUser, showLoading, showNotification, formatDateForShift } from './utils.js';

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
    } else {
        document.getElementById('userOvertimeForm').style.display = 'block';
        document.getElementById('adminOvertimeDetail').style.display = 'block';
        document.getElementById('overtimeFilterSection').style.display = 'none';
        document.getElementById('rekapDate').valueAsDate = new Date();
        
        const tbody = document.getElementById('rekapLemburTableBody');
        tbody.innerHTML = '';
        currentRekapRows = [];
        addRekapRow();
    }
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
        });
    } else {
        addRekapRow();
    }
    
    // Setup event listener untuk save dengan update
    const saveBtn = document.getElementById('saveRekapLembur');
    saveBtn.onclick = async function() {
        await updateOvertimeRecord(recordId);
    };
    saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Update';
    
    showNotification('Overtime record loaded for editing', 'info');
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
        
        const record = rekapLemburData.find(r => r.id === recordId);
        
        await db.collection('overtimeRecords').doc(recordId).delete();
        
        if (record) {
            await removeRelatedOvertimeCalculation(record.employeeName, record.date);
        }
        
        rekapLemburData = rekapLemburData.filter(record => record.id !== recordId);
        
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
    totalPlantInput.addEventListener('change', function() {
        updatePlantSelectors(this);
    });
}

// Fungsi untuk menghapus row
        function removeRekapRow(button) {
            const row = button.closest('tr');
            const rowId = row.getAttribute('data-row-id');
            
            // Hapus dari array current rows
            currentRekapRows = currentRekapRows.filter(id => id != rowId);
            
            row.remove();
            updateRowNumbers();
        }

        // Fungsi untuk update nomor row
        function updateRowNumbers() {
            const rows = document.querySelectorAll('#rekapLemburTableBody tr');
            rows.forEach((row, index) => {
                row.cells[0].textContent = index + 1;
            });
        }

        // Fungsi untuk update plant selectors berdasarkan total plant
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
                    ${plantOptions.map(plant => `<option value="${plant}">${plant}</option>`).join('')}
                `;
                plantContainer.appendChild(select);
                
                // Add spacing between selects
                if (i < totalPlant - 1) {
                    plantContainer.appendChild(document.createElement('br'));
                }
            }
        }

        // PERBAIKAN: Fungsi untuk menyimpan data overtime - DIPERBAIKI
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
            
            // PERBAIKAN: Validasi waktu untuk overtime yang melewati tengah malam
            // Tidak ada validasi startTime >= endTime karena overtime bisa melewati tengah malam
            // Contoh: 23:00 - 08:00 (overnight overtime)
            
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
                overtimeDuration, // Kolom Duration yang sudah dihitung
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
                
                // PERBAIKAN: Update Overtime Calculation secara otomatis dengan Duration
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
        function calculateOvertimeDuration(startTime, endTime) {
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

        // PERBAIKAN: Fungsi untuk memuat data overtime user
        async function loadUserOvertimeData() {
            if (!currentUser) return;
            
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
                console.error('Error loading overtime data:', error);
            }
        }

        // PERBAIKAN: Fungsi untuk update tabel detail overtime dengan kolom Duration
        function updateOvertimeDetailTable() {
            const tbody = document.getElementById('overtimeDetailTableBody');
            tbody.innerHTML = '';
            
            // Filter data berdasarkan date range
            const startDate = document.getElementById('startDateOvertimeOutput').valueAsDate;
            const endDate = document.getElementById('endDateOvertimeOutput').valueAsDate;
            
            // Filter berdasarkan employee (untuk admin) atau user saat ini (untuk user biasa)
            let filteredData = rekapLemburData;
            
            if (currentUser.role === 'admin') {
                const employeeFilter = document.getElementById('overtimeEmployeeFilter').value;
                if (employeeFilter !== 'all') {
                    filteredData = rekapLemburData.filter(record => record.employeeName === employeeFilter);
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
                row.innerHTML = `<td colspan="11" class="text-center">No overtime data found</td>`;
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
                            <td>${index === 0 ? record.overtimeDuration : ''}</td> <!-- Kolom Duration -->
                            <td>${tableRow.totalProject || ''}</td>
                            <td>${tableRow.totalPlant || ''}</td>
                            <td>${tableRow.plantNames || ''}</td>
                            <td>${tableRow.volume || ''}</td>
                            <td>${index === 0 ? record.taskDescription : ''}</td>
                        `;
                        tbody.appendChild(row);
                    });
                } else {
                    // Jika tidak ada data tabel, tampilkan satu baris saja
                    const row = document.createElement('tr');
                    // PERBAIKAN: Tambahkan class untuk user biasa
                    if (currentUser.role === 'user') {
                        row.classList.add('user-overtime-detail');
                    }
                    row.innerHTML = `
                        <td>${rowNumber++}</td>
                        <td>${record.employeeName}</td>
                        <td>${record.date}</td>
                        <td>${record.startTime}</td>
                        <td>${record.endTime}</td>
                        <td>${record.overtimeDuration}</td> <!-- Kolom Duration -->
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

        // Fungsi untuk edit overtime record (admin only)
        async function editOvertimeRecord(recordId) {
            if (currentUser.role !== 'admin') {
                showNotification('Only admin can edit overtime records', 'error');
                return;
            }
            
            const record = rekapLemburData.find(r => r.id === recordId);
            if (!record) return;
            
            // Isi form dengan data yang akan diedit
            document.getElementById('rekapDate').value = record.date;
            document.getElementById('rekapStartTime').value = record.startTime;
            document.getElementById('rekapEndTime').value = record.endTime;
            document.getElementById('uraianTugas').value = record.taskDescription;
            
            // Hapus record lama
            await deleteOvertimeRecord(recordId, false);
            
            showNotification('Overtime record loaded for editing', 'info');
        }

        // Fungsi untuk menghapus record overtime
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
                
                // Hapus dari data lokal
                rekapLemburData = rekapLemburData.filter(record => record.id !== recordId);
                
                // Update tampilan
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

        // PERBAIKAN: Fungsi untuk update total overtime
        function updateTotalOvertime() {
            const totalOvertimeElement = document.getElementById('totalOvertimeValue');
            
            // Filter data berdasarkan date range
            const startDate = document.getElementById('startDateOvertimeOutput').valueAsDate;
            const endDate = document.getElementById('endDateOvertimeOutput').valueAsDate;
            
            // Filter berdasarkan employee (untuk admin)
            let filteredData = rekapLemburData;
            if (currentUser.role === 'admin') {
                const employeeFilter = document.getElementById('overtimeEmployeeFilter').value;
                if (employeeFilter !== 'all') {
                    filteredData = rekapLemburData.filter(record => record.employeeName === employeeFilter);
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
        function updateOvertimeDisplay() {
            updateOvertimeDetailTable();
        }

        // Fungsi untuk reset form overtime
        function resetOvertimeForm() {
            document.getElementById('rekapDate').valueAsDate = new Date();
            document.getElementById('rekapStartTime').value = '';
            document.getElementById('rekapEndTime').value = '';
            document.getElementById('uraianTugas').value = '';
            
            // Reset tabel
            const tbody = document.getElementById('rekapLemburTableBody');
            tbody.innerHTML = '';
            currentRekapRows = [];
            
            // Tambah row pertama
            addRekapRow();
        }

        // =============================================
        // PERBAIKAN INTEGRASI OVERTIME FORM KE OVERTIME CALCULATION
        // =============================================

        // PERBAIKAN: Fungsi untuk integrasi dengan Overtime Calculation - DIPERBAIKI DENGAN LOOKUP OTOMATIS
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
                        const overtimeData = doc.data();
                        
                        console.log('Data ditemukan, mengupdate RKP PIC dan Remarks dengan data dari Overtime Form:', {
                            id: doc.id,
                            rkpPIC: overtimeRecord.overtimeDuration, // Duration dari Overtime Form
                            remarks: overtimeRecord.taskDescription || 'Overtime recorded' // Uraian tugas dari Overtime Form
                        });
                        
                        // Update existing record
                        const docRef = db.collection('overtime').doc(doc.id);
                        
                        // PERBAIKAN: Update RKP PIC dengan durasi overtime dari kolom Duration
                        batch.update(docRef, {
                            rkpPIC: overtimeRecord.overtimeDuration, // Ambil dari kolom Duration
                            // PERBAIKAN: Update Remarks dengan uraian tugas dari Overtime Form
                            remarks: overtimeRecord.taskDescription || 'Overtime recorded',
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        // Update local data
                        const localItem = overtimeCalcData.find(d => d.id === doc.id);
                        if (localItem) {
                            localItem.rkpPIC = overtimeRecord.overtimeDuration; // Ambil dari kolom Duration
                            localItem.remarks = overtimeRecord.taskDescription || 'Overtime recorded';
                        }
                        
                        updatedCount++;
                    });
                    
                    await batch.commit();
                    console.log(`Berhasil mengupdate ${updatedCount} record di Firestore`);
                    
                } else {
                    // Jika tidak ditemukan record yang cocok, buat record baru
                    console.log('Tidak ditemukan record yang cocok, membuat record baru');
                    await createNewOvertimeCalculationRecord(overtimeRecord, formattedDate);
                }
                
                // PERBAIKAN: Refresh data overtime calculation
                await loadOvertimeCalculationData();
                
                // Update table if currently viewing overtime tab
                if (currentTab === "overtime") {
                    updateOvertimeTable();
                }
                
                console.log('Integrasi overtime calculation selesai');
                
            } catch (error) {
                console.error('Error updating overtime calculation:', error);
                // Tetap lanjutkan meski ada error di integrasi
                console.log('Continuing without overtime calculation integration');
            }
        }

        // PERBAIKAN: Fungsi untuk membuat record overtime calculation baru dengan Duration
        async function createNewOvertimeCalculationRecord(overtimeRecord, formattedDate) {
            try {
                // Buat data dasar untuk overtime calculation
                const newOvertimeCalc = {
                    area: "CDC East", // Default area
                    name: overtimeRecord.employeeName,
                    position: "", // Akan diisi jika tersedia
                    date: formattedDate,
                    shift: "", // Akan diisi jika tersedia
                    shiftCheckIn: "",
                    shiftCheckOut: "",
                    wtNormal: "",
                    actualCheckIn: "",
                    actualCheckOut: "",
                    overTime: "",
                    cekRMC: "",
                    // PERBAIKAN: Isi otomatis RKP PIC dengan Duration dan Remarks dengan uraian tugas
                    rkpPIC: overtimeRecord.overtimeDuration, // Ambil dari kolom Duration
                    rmcShiftCheckOut: "",
                    remarks: overtimeRecord.taskDescription || 'Overtime recorded', // Ambil dari uraian tugas
                    createdFromOvertimeForm: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Coba dapatkan data employee untuk melengkapi informasi
                const employeeData = absensiData.find(emp => emp.name === overtimeRecord.employeeName);
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
                
                // Simpan ke Firestore
                const docRef = await db.collection('overtime').add(newOvertimeCalc);
                newOvertimeCalc.id = docRef.id;
                
                // Tambahkan ke data lokal
                overtimeCalcData.push(newOvertimeCalc);
                
                console.log('Created new overtime calculation record:', newOvertimeCalc);
                
            } catch (error) {
                console.error('Error creating new overtime calculation record:', error);
            }
        }

