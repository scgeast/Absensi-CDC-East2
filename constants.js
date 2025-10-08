// Constants used throughout the application
const CONSTANTS = {
    // Shift matrix for different positions
    SHIFT_MATRIX: {
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
    },

    // Initial employees data
    INITIAL_EMPLOYEES: [
        { area: "CDC East", name: "Fahmi Ardiansah", position: "Dispatcher" },
        { area: "CDC East", name: "Agung Setyawan", position: "Dispatcher" },
        { area: "CDC East", name: "Drajat Triono", position: "Dispatcher" },
        { area: "CDC East", name: "Wiyanto", position: "Dispatcher" },
        { area: "CDC East", name: "Nur Fauziah", position: "Booking" }
    ],

    // Plant options for overtime form
    PLANT_OPTIONS: ["Denpasar2", "Gianyar", "Manyar", "Manukan", "Gempol", "Kediri", "Krian"],

    // Default date range (in days)
    DEFAULT_DATE_RANGE: 31,

    // Leave days per year
    LEAVE_DAYS_PER_YEAR: 12
};
