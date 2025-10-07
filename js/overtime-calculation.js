// Overtime Calculation Functions
import { db } from './firebase-config.js';
import { currentUser, showLoading, showNotification, formatDateForShift } from './utils.js';

export let overtimeCalcData = [];
export let overtimeSortColumn = 'date';
export let overtimeSortDirection = 'asc';

// PERBAIKAN: Fungsi refresh overtime data yang mencegah duplikasi
export async function refreshOvertimeData() {
    try {
        showLoading(true);
        console.log('Refreshing ALL overtime data...');

        // 1️⃣ Load semua data absensi (semua karyawan)
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

        // 2️⃣ Load semua data overtime calculation (yang sudah ada)
        const overtimeSnapshot = await db.collection('overtime').get();
        let existingOvertime = [];
        overtimeSnapshot.forEach(doc => {
            existingOvertime.push({ id: doc.id, ...doc.data() });
        });

        // 3️⃣ Load semua data overtime form
        const overtimeFormSnapshot = await db.collection('overtimeRecords').get();
        let formData = [];
        overtimeFormSnapshot.forEach(doc => {
            formData.push({ id: doc.id, ...doc.data() });
        });

        // 4️⃣ PROSES SEMUA KARYAWAN DAN SEMUA TANGGAL - TANPA FILTER
        const batch = db.batch();
        let updatedCount = 0;
        let createdCount = 0;

        // Hapus semua data overtime yang ada (reset)
        const deleteBatch = db.batch();
        existingOvertime.forEach(item => {
            const docRef = db.collection('overtime').doc(item.id);
            deleteBatch.delete(docRef);
        });
        await deleteBatch.commit();
        console.log('Deleted all existing overtime data for refresh');

        // Sekarang buat data baru untuk SEMUA karyawan dan SEMUA tanggal
        for (const emp of allEmployees) {
            // Ambil semua tanggal dari shift karyawan
            for (const [date, shift] of Object.entries(emp.shifts)) {
                // Cari lembur yang cocok dari Overtime Form
                const relatedForm = formData.find(f => {
                    try {
                        const formatted = formatDateForShift(new Date(f.date));
                        return f.employeeName === emp.name && formatted === date;
                    } catch (e) {
                        return false;
                    }
                });

                // Dapatkan detail shift dari matrix
                let shiftDetails = null;
                if (emp.position && shiftMatrix[emp.position] && shiftMatrix[emp.position][shift]) {
                    shiftDetails = shiftMatrix[emp.position][shift];
                }

                // Buat data overtime calculation untuk SEMUA record
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
                    // Isi RKP PIC hanya jika ada lembur
                    rkpPIC: relatedForm ? relatedForm.overtimeDuration : "",
                    rmcShiftCheckOut: "",
                    // Isi remarks hanya jika ada lembur
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

        // 5️⃣ Refresh data lokal
        await loadOvertimeCalculationData();

        // 6️⃣ Update tampilan tabel
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

// Load overtime calculation data
export async function loadOvertimeCalculationData() {
    try {
        const overtimeSnapshot = await db.collection('overtime').get();
        
        overtimeCalcData = [];
        overtimeSnapshot.forEach(doc => {
            overtimeCalcData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Data overtime calculation dimuat:', overtimeCalcData.length, 'records');
        
    } catch (error) {
        console.error('Error loading overtime calculation data:', error);
    }
}

// Update overtime table
export function updateOvertimeTable() {
    const tbody = document.querySelector('#overtimeTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // PERBAIKAN: Filter data berdasarkan date range Overtime & Output
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
    
    // PERBAIKAN: Urutkan data berdasarkan kolom dan arah yang dipilih
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
    
    // Add event listeners
    document.querySelectorAll('.actual-check-out').forEach(input => {
        input.addEventListener('change', function() {
            calculateOvertime(this);
        });
    });
    
    document.querySelectorAll('.cek-rmc').forEach(input => {
        input.addEventListener('change', function() {
            calculateRmcShiftCheckOut(this);
        });
    });
    
    updateSortIcons();
}

// Sorting functions
export function sortOvertimeData(data, column, direction) {
    return [...data].sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];
        
        if (column === 'date') {
            aValue = parseDateFromString(aValue);
            bValue = parseDateFromString(bValue);
        } else if (column === 'no') {
            return 0;
        }
        
        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';
        
        if (aValue < bValue) {
            return direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

export function updateSortIcons() {
    document.querySelectorAll('.sortable-header .sort-icon').forEach(icon => {
        icon.innerHTML = '<i class="fas fa-sort"></i>';
        icon.classList.remove('active');
    });
    
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

// Calculation functions
export function calculateOvertime(input) {
    const row = input.closest('tr');
    const shiftCheckOut = row.querySelector('td:nth-child(8)').textContent;
    const actualCheckOut = row.querySelector('.actual-check-out').value;
    
    if (actualCheckOut && shiftCheckOut) {
        const actualOut = new Date(`2000-01-01T${actualCheckOut}`);
        const shiftOut = new Date(`2000-01-01T${shiftCheckOut}`);
        
        if (actualOut < shiftOut) {
            actualOut.setDate(actualOut.getDate() + 1);
        }
        
        const diffMs = actualOut - shiftOut;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const overtime = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
        row.querySelector('.over-time').value = overtime;
        
        const dataId = input.getAttribute('data-id');
        if (dataId) {
            const item = overtimeCalcData.find(d => d.id === dataId);
            if (item) {
                item.overTime = overtime;
            }
        }
    }
    
    const cekRMC = row.querySelector('.cek-rmc').value;
    if (cekRMC && shiftCheckOut) {
        calculateRmcShiftCheckOut(row.querySelector('.cek-rmc'));
    }
}

export function calculateRmcShiftCheckOut(input) {
    const row = input.closest('tr');
    const shiftCheckOut = row.querySelector('td:nth-child(8)').textContent;
    const cekRMC = input.value;
    
    if (cekRMC && shiftCheckOut) {
        const rmcTime = new Date(`2000-01-01T${cekRMC}`);
        const shiftOutTime = new Date(`2000-01-01T${shiftCheckOut}`);
        
        if (rmcTime < shiftOutTime) {
            rmcTime.setDate(rmcTime.getDate() + 1);
        }
        
        const diffMs = rmcTime - shiftOutTime;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const rmcDiff = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
        row.querySelector('.rmc-shift-check-out').value = rmcDiff;
        
        const dataId = input.getAttribute('data-id');
        if (dataId) {
            const item = overtimeCalcData.find(d => d.id === dataId);
            if (item) {
                item.rmcShiftCheckOut = rmcDiff;
            }
        }
    }
}
