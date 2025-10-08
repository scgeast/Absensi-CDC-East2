// Firebase Configuration
export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCs_65P_SLx529UwLcQO8cF69yD1yLOgKY",
    authDomain: "blueiiifirebase.firebaseapp.com",
    projectId: "blueiiifirebase",
    storageBucket: "blueiiifirebase.firebasestorage.app",
    messagingSenderId: "194236727932",
    appId: "1:194236727932:web:6b10d6302d5c56ebac3ff9"
};

// Shift Matrix Configuration
export const SHIFT_MATRIX = {
    "Dispatcher": {
        "1": { name: "Morning", checkIn: "07:00", checkOut: "15:00", hours: "07:00" },
        "2": { name: "Afternoon", checkIn: "15:00", checkOut: "23:00", hours: "07:00" },
        "3": { name: "Night", checkIn: "23:00", checkOut: "07:00", hours: "08:00" },
        "11": { name: "Morning Part", checkIn: "07:00", checkOut: "12:00", hours: "05:00" },
        "22": { name: "Afternoon Part", checkIn: "15:00", checkOut: "20:00", hours: "05:00" },
        "C": { name: "Leave", checkIn: "", checkOut: "", hours: "" },
        "O": { name: "Off", checkIn: "", checkOut: "", hours: "" }
    },
    "Booking": {
        "1": { name: "Morning", checkIn: "08:00", checkOut: "16:00", hours: "07:00" },
        "2": { name: "Afternoon", checkIn: "16:00", checkOut: "24:00", hours: "08:00" },
        "3": { name: "Night", checkIn: "00:00", checkOut: "08:00", hours: "08:00" },
        "11": { name: "Morning Part", checkIn: "08:00", checkOut: "13:00", hours: "05:00" },
        "22": { name: "Afternoon Part", checkIn: "16:00", checkOut: "21:00", hours: "05:00" },
        "C": { name: "Leave", checkIn: "", checkOut: "", hours: "" },
        "O": { name: "Off", checkIn: "", checkOut: "", hours: "" }
    }
};

// Initial Employees Data
export const INITIAL_EMPLOYEES = [
    { area: "CDC East", name: "Fahmi Ardiansah", position: "Dispatcher" },
    { area: "CDC East", name: "Agung Setyawan", position: "Dispatcher" },
    { area: "CDC East", name: "Drajat Triono", position: "Dispatcher" },
    { area: "CDC East", name: "Wiyanto", position: "Dispatcher" },
    { area: "CDC East", name: "Nur Fauziah", position: "Booking" }
];

// Plant Options for Overtime Form
export const PLANT_OPTIONS = ["Denpasar2", "Gianyar", "Manyar", "Manukan", "Gempol", "Kediri", "Krian"];

// CSS Variables
export const CSS_VARIABLES = {
    primaryColor: '#2a2d43',
    secondaryColor: '#4a5079',
    accentColor: '#7b89c9',
    highlightColor: '#a6b1e8',
    textColor: '#e4e8f0',
    sidebarWidth: '250px',
    sidebarCollapsedWidth: '70px'
};
