// Leave Management Functions
import { db } from './firebase-config.js';
import { currentUser, showLoading, showNotification, formatDateForShift } from './utils.js';

export let cutiData = [];
export let cutiDetailData = [];

// PERBAIKAN: Fungsi untuk menghitung durasi cuti
export function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
}

// PERBAIKAN: Fungsi untuk menghitung sisa cuti berdasarkan tahun
export function calculateRemainingLeave(employeeName) {
    const currentYear = new Date().getFullYear();
    const totalLeave = 12;
    
    const employeeLeaves = cutiData.filter(cuti => {
        if (cuti.employeeName !== employeeName) return false;
        const startYear = new Date(cuti.startDate).getFullYear();
        return startYear === currentYear;
    });
    
    let totalTaken = 0;
    employeeLeaves.forEach(leave => {
        totalTaken += leave.duration;
    });
    
    const remaining = totalLeave - totalTaken;
    return Math.max(0, remaining);
}

// PERBAIKAN: Fungsi untuk menambahkan data cuti
export function addCuti() {
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
    
    // PERBAIKAN: Validasi sisa cuti
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
    
    // Buat ID unik untuk cuti baru
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
    
    // PERBAIKAN: Update sisa cuti yang ditampilkan
    updateRemainingLeaveDisplay(employeeName);
    
    document.getElementById('cutiStartDate').value = '';
    document.getElementById('cutiEndDate').value = '';
    
    showNotification('Leave added successfully', 'success');
}

// PERBAIKAN: Fungsi untuk menambahkan data cuti ke tabel dengan tombol delete
export function addCutiToTable(employeeName, startDate, endDate, duration, cutiId) {
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
    
    // Tambahkan event listener untuk tombol edit
    const editBtn = row.querySelector('.edit-cuti-btn');
    editBtn.addEventListener('click', function() {
        const remarksInput = row.querySelector('.remarks-input');
        remarksInput.readOnly = false;
        remarksInput.focus();
        remarksInput.select();
        
        // Ubah tombol menjadi Save
        this.innerHTML = '<i class="fas fa-save"></i> Save';
        this.classList.remove('edit-cuti-btn');
        this.classList.add('save-cuti-btn');
        
        // Tambahkan event listener untuk tombol save
        this.addEventListener('click', function() {
            remarksInput.readOnly = true;
            this.innerHTML = '<i class="fas fa-edit"></i> Edit';
            this.classList.remove('save-cuti-btn');
            this.classList.add('edit-cuti-btn');
            
            // Update data cuti
            const cuti = cutiData.find(c => c.id === cutiId);
            if (cuti) {
                cuti.remarks = remarksInput.value;
            }
        });
    });
    
    tableBody.appendChild(row);
}

// PERBAIKAN: Fungsi untuk menghapus baris cuti
export async function deleteCutiRow(cutiId) {
    if (!confirm('Are you sure you want to delete this leave record?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Hapus dari Firestore
        await db.collection('cuti').doc(cutiId).delete();
        
        // Hapus dari data lokal
        cutiData = cutiData.filter(cuti => cuti.id !== cutiId);
        
        // Update tampilan
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

// PERBAIKAN: Fungsi untuk update tampilan sisa cuti
export function updateRemainingLeaveDisplay(employeeName) {
    const remainingLeave = calculateRemainingLeave(employeeName);
    const remainingLeaveValue = document.getElementById('remainingLeaveValue');
    if (remainingLeaveValue) {
        remainingLeaveValue.textContent = remainingLeave;
    }
}

// PERBAIKAN: Fungsi untuk generate data summarize leave - hanya tampilkan data user sendiri
export function generateCutiDetailData() {
    // Kosongkan tabel detail
    const tableBody = document.getElementById('cutiDetailTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Reset data cuti detail
    cutiDetailData = [];
    
    // Dapatkan semua karyawan dari absensiData atau initialEmployees
    const allEmployees = window.absensiData && window.absensiData.length > 0 ? window.absensiData : window.initialEmployees;
    
    // Buat set untuk melacak karyawan yang sudah diproses
    const processedEmployees = new Set();
    
    // Proses setiap karyawan
    allEmployees.forEach(employee => {
        // PERBAIKAN: Jika user biasa, hanya tampilkan data mereka sendiri
        if (currentUser.role === 'user' && employee.name !== currentUser.name) {
            return;
        }
        
        if (processedEmployees.has(employee.name)) return;
        processedEmployees.add(employee.name);
        
        // Hitung sisa cuti untuk karyawan ini
        const remainingLeave = calculateRemainingLeave(employee.name);
        
        // Tambahkan ke data cuti detail
        const cutiDetail = {
            employeeName: employee.name,
            workArea: employee.area,
            position: employee.position,
            remainingLeave: remainingLeave
        };
        
        cutiDetailData.push(cutiDetail);
        
        // Tambahkan ke tabel detail
        addCutiToDetailTable(cutiDetail);
    });
}

// PERBAIKAN: Fungsi untuk menambahkan data cuti ke tabel detail
export function addCutiToDetailTable(cutiDetail) {
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

// PERBAIKAN: Fungsi untuk melihat detail leave - hanya tampilkan data user sendiri
export function viewLeaveDetails(employeeName) {
    // PERBAIKAN: Jika user biasa, hanya boleh lihat data mereka sendiri
    if (currentUser.role === 'user' && employeeName !== currentUser.name) {
        showNotification('You can only view your own leave details', 'error');
        return;
    }
    
    // Filter cuti data berdasarkan employeeName
    const employeeLeaves = cutiData.filter(cuti => cuti.employeeName === employeeName);
    
    // Update modal title
    const modalEmployeeName = document.getElementById('modalEmployeeName');
    if (modalEmployeeName) {
        modalEmployeeName.textContent = employeeName;
    }
    
    // Update modal content
    const tbody = document.getElementById('leaveDetailTableBody');
    if (!tbody) return;
    
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
                    ${currentUser.role === 'admin' ? 
                        `<button class="btn-delete-cuti" onclick="deleteCutiRow('${leave.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>` : 
                        '-'
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // Show modal
    const modalElement = document.getElementById('viewLeaveDetailModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

// PERBAIKAN: Fungsi untuk update tabel cuti dengan tombol delete
export function updateCutiTable() {
    const tableBody = document.getElementById('cutiTableBody');
    if (!tableBody) return;
    
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
        
        // Tambahkan event listener untuk tombol edit
        const editBtn = row.querySelector('.edit-cuti-btn');
        editBtn.addEventListener('click', function() {
            const remarksInput = row.querySelector('.remarks-input');
            remarksInput.readOnly = false;
            remarksInput.focus();
            remarksInput.select();
            
            // Ubah tombol menjadi Save
            this.innerHTML = '<i class="fas fa-save"></i> Save';
            this.classList.remove('edit-cuti-btn');
            this.classList.add('save-cuti-btn');
            
            // Tambahkan event listener untuk tombol save
            this.addEventListener('click', function() {
                remarksInput.readOnly = true;
                this.innerHTML = '<i class="fas fa-edit"></i> Edit';
                this.classList.remove('save-cuti-btn');
                this.classList.add('edit-cuti-btn');
                
                // Update data cuti
                cuti.remarks = remarksInput.value;
            });
        });
    });
}

// PERBAIKAN: Fungsi untuk memuat data cuti dari Firestore
export async function loadCutiData() {
    try {
        const cutiSnapshot = await db.collection('cuti').get();
        
        cutiData = [];
        cutiSnapshot.forEach(doc => {
            cutiData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update tabel cuti
        updateCutiTable();
        
        // Generate data cuti detail
        generateCutiDetailData();
        
    } catch (error) {
        console.error('Error loading leave data:', error);
    }
}

// PERBAIKAN: Fungsi untuk menyimpan data cuti ke Firestore dan update tabel attendance
export async function saveCutiDataToFirestore() {
    if (!window.isOnline) {
        console.log('Offline - data will be saved when connection is restored');
        return;
    }
    
    try {
        // Simpan data cuti ke Firestore
        const batch = db.batch();
        
        // Hapus data cuti lama
        const cutiSnapshot = await db.collection('cuti').get();
        cutiSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Tambahkan data cuti baru
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
        
        // PERBAIKAN: Update tabel attendance dengan shift 'C' untuk hari cuti
        await updateAttendanceWithCuti();
        
        // Generate data cuti detail
        generateCutiDetailData();
        
        showNotification('Leave data saved successfully and attendance updated', 'success');
        
    } catch (error) {
        console.error('Error saving leave data:', error);
        showNotification('Error saving leave data: ' + error.message, 'error');
    }
}

// PERBAIKAN: Fungsi untuk update tabel attendance dengan shift 'C' untuk hari cuti
export async function updateAttendanceWithCuti() {
    try {
        // Loop melalui semua data cuti
        for (const cuti of cutiData) {
            const startDate = new Date(cuti.startDate);
            const endDate = new Date(cuti.endDate);
            const employeeName = cuti.employeeName;
            
            // Loop melalui setiap hari dalam periode cuti
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateStr = formatDateForShift(currentDate);
                
                // Cari karyawan di absensiData
                const employee = window.absensiData.find(emp => emp.name === employeeName);
                if (employee) {
                    // Update shift menjadi 'C' untuk tanggal tersebut
                    if (!employee.shifts) employee.shifts = {};
                    employee.shifts[dateStr] = 'C';
                }
                
                // Pindah ke hari berikutnya
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        
        // Simpan perubahan ke Firestore
        if (window.saveDataToFirestore) {
            await window.saveDataToFirestore();
        }
        
        // Update tampilan tabel
        if (window.updateEntryTable) {
            window.updateEntryTable();
        }
        if (window.updateAbsenTabelTable) {
            window.updateAbsenTabelTable();
        }
        
    } catch (error) {
        console.error('Error updating attendance with leave data:', error);
    }
}
