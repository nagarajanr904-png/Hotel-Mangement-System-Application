// Base API Configuration
const API_BASE_URL = '/api';

// Global Event Listeners & State
document.addEventListener('DOMContentLoaded', () => {
    // Navigation Setup
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);
            switchSection(targetId);
        });
    });

    // Forms Submit Handlers
    document.getElementById('add-room-form').addEventListener('submit', handleAddRoom);
    document.getElementById('book-room-form').addEventListener('submit', handleBookRoom);
    document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Default Check-in and Checkout Dates to Today
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('checkInDate').value = todayStr;
    document.getElementById('checkOutDate').value = todayStr;

    // Load Initial Data
    refreshDashboard();
});

// Switch Between Content Sections
function switchSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));

    // Remove active class from nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Set active class on corresponding nav item
    let navItem = document.querySelector(`.nav-item[href="#${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    // Update Top Title
    const titleHeader = document.getElementById('current-section-title');
    if (sectionId === 'dashboard') titleHeader.textContent = 'Dashboard';
    else if (sectionId === 'rooms-section') titleHeader.textContent = 'Hotel Rooms';
    else if (sectionId === 'add-room-section') titleHeader.textContent = 'Add Room';
    else if (sectionId === 'book-room-section') titleHeader.textContent = 'Book Room';
    else if (sectionId === 'checkout-section') titleHeader.textContent = 'Checkout Guest';
    else if (sectionId === 'search-section') titleHeader.textContent = 'Search Room';

    // Refresh context data based on section
    if (sectionId === 'dashboard') {
        refreshDashboard();
    } else if (sectionId === 'rooms-section') {
        loadRooms('all');
    } else if (sectionId === 'book-room-section') {
        populateAvailableRoomsSelect();
    } else if (sectionId === 'checkout-section') {
        populateBookedRoomsSelect();
        document.getElementById('receipt-container').style.display = 'none';
    }
}

// Global Refresh Helper for Dashboard
async function refreshDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms/stats`);
        if (!response.ok) throw new Error('Failed to load dashboard stats');
        
        const stats = await response.json();
        
        const total = stats.totalRooms || 0;
        const available = stats.availableRooms || 0;
        const booked = stats.bookedRooms || 0;
        const rate = total > 0 ? Math.round((booked / total) * 100) : 0;

        document.getElementById('stat-total-rooms').textContent = total;
        document.getElementById('stat-available-rooms').textContent = available;
        document.getElementById('stat-booked-rooms').textContent = booked;
        document.getElementById('stat-occupancy-rate').textContent = `${rate}%`;
    } catch (err) {
        console.error(err);
        showToast('Error loading stats from backend', 'error');
    }
}

// Load Rooms and populate Rooms Grid
async function loadRooms(statusFilter) {
    const grid = document.getElementById('rooms-grid');
    grid.innerHTML = '<div class="no-data"><i class="fa-solid fa-spinner fa-spin"></i> Loading rooms...</div>';

    // Update active filter button
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (statusFilter === 'all' && btn.textContent === 'All') btn.classList.add('active');
        else if (statusFilter === 'Available' && btn.textContent === 'Available') btn.classList.add('active');
        else if (statusFilter === 'Booked' && btn.textContent === 'Booked') btn.classList.add('active');
    });

    try {
        let url = `${API_BASE_URL}/rooms`;
        if (statusFilter !== 'all') {
            url += `?status=${statusFilter}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to retrieve rooms');
        
        const rooms = await response.json();
        
        if (rooms.length === 0) {
            grid.innerHTML = `<div class="no-data">No rooms found.</div>`;
            return;
        }

        grid.innerHTML = '';
        rooms.forEach(room => {
            const card = document.createElement('div');
            card.className = 'room-card';
            
            const badgeClass = room.roomType.toLowerCase();
            const statusClass = room.status.toLowerCase();
            const iconClass = room.roomType === 'Deluxe' ? 'fa-gem' : (room.roomType === 'Double' ? 'fa-user-group' : 'fa-user');
            
            card.innerHTML = `
                <div class="room-card-header">
                    <span class="room-badge ${badgeClass}">${room.roomType}</span>
                </div>
                <div class="room-card-body">
                    <div class="room-icon-wrapper">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="room-number-display">Room ${room.roomNumber}</div>
                    <div class="room-price-display"><strong>$${room.pricePerDay.toFixed(2)}</strong> / day</div>
                </div>
                <div class="room-card-footer">
                    <div class="room-status status-${statusClass}">
                        <span class="status-dot"></span>
                        ${room.status}
                    </div>
                    ${room.status === 'Available' 
                        ? `<a class="action-link" onclick="quickBook('${room.roomNumber}')"><i class="fa-solid fa-calendar-check"></i> Book Now</a>`
                        : `<a class="action-link" onclick="quickCheckout('${room.roomNumber}')"><i class="fa-solid fa-right-from-bracket"></i> Checkout</a>`
                    }
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        grid.innerHTML = `<div class="no-data error">Failed to load rooms. Ensure the backend is running.</div>`;
    }
}

// Populate Available Rooms Select Dropdown
async function populateAvailableRoomsSelect() {
    const select = document.getElementById('bookingRoomSelect');
    select.innerHTML = '<option value="" disabled selected>Loading available rooms...</option>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/rooms?status=Available`);
        if (!response.ok) throw new Error();
        
        const rooms = await response.json();
        
        if (rooms.length === 0) {
            select.innerHTML = '<option value="" disabled selected>No available rooms - All booked</option>';
            return;
        }

        select.innerHTML = '<option value="" disabled selected>Select an Available Room</option>';
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.roomNumber;
            option.textContent = `Room ${room.roomNumber} - ${room.roomType} ($${room.pricePerDay.toFixed(2)}/day)`;
            select.appendChild(option);
        });
    } catch (err) {
        select.innerHTML = '<option value="" disabled selected>Error loading available rooms</option>';
    }
}

// Populate Booked Rooms Select Dropdown
async function populateBookedRoomsSelect() {
    const select = document.getElementById('checkoutRoomSelect');
    select.innerHTML = '<option value="" disabled selected>Loading booked rooms...</option>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/rooms?status=Booked`);
        if (!response.ok) throw new Error();
        
        const rooms = await response.json();
        
        if (rooms.length === 0) {
            select.innerHTML = '<option value="" disabled selected>No booked rooms</option>';
            return;
        }

        select.innerHTML = '<option value="" disabled selected>Select a Booked Room</option>';
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.roomNumber;
            option.textContent = `Room ${room.roomNumber} - ${room.roomType}`;
            select.appendChild(option);
        });
    } catch (err) {
        select.innerHTML = '<option value="" disabled selected>Error loading booked rooms</option>';
    }
}

// Add Room Form Submission
async function handleAddRoom(e) {
    e.preventDefault();
    
    const roomNumber = document.getElementById('roomNumber').value.trim();
    const roomType = document.getElementById('roomType').value;
    const pricePerDay = parseFloat(document.getElementById('pricePerDay').value);

    if (!roomNumber || !roomType || isNaN(pricePerDay)) {
        showToast('Please fill out all required fields.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomNumber, roomType, pricePerDay, status: 'Available' })
        });

        if (response.status === 409) {
            showToast(`Room number ${roomNumber} already exists.`, 'error');
            return;
        }

        if (!response.ok) throw new Error();

        showToast(`Room ${roomNumber} added successfully!`, 'success');
        document.getElementById('add-room-form').reset();
        switchSection('rooms-section');
    } catch (err) {
        showToast('Failed to add room. Try again.', 'error');
    }
}

// Book Room Form Submission
async function handleBookRoom(e) {
    e.preventDefault();
    
    const roomNumber = document.getElementById('bookingRoomSelect').value;
    const customerName = document.getElementById('customerName').value.trim();
    const checkInDate = document.getElementById('checkInDate').value;

    if (!roomNumber || !customerName || !checkInDate) {
        showToast('Please fill out all required fields.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerName, roomNumber, checkInDate })
        });

        if (!response.ok) {
            const errorMsg = await response.text();
            throw new Error(errorMsg || 'Booking failed');
        }

        showToast(`Room ${roomNumber} booked successfully for ${customerName}!`, 'success');
        document.getElementById('book-room-form').reset();
        
        // Reset check-in date to today
        document.getElementById('checkInDate').value = new Date().toISOString().split('T')[0];
        
        switchSection('rooms-section');
    } catch (err) {
        showToast(err.message || 'Failed to book room.', 'error');
    }
}

// Checkout Form Submission
async function handleCheckout(e) {
    e.preventDefault();
    
    const roomNumber = document.getElementById('checkoutRoomSelect').value;
    const checkOutDate = document.getElementById('checkOutDate').value;

    if (!roomNumber || !checkOutDate) {
        showToast('Please fill out all required fields.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/bookings/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomNumber, checkOutDate })
        });

        if (!response.ok) {
            const errorMsg = await response.text();
            throw new Error(errorMsg || 'Checkout failed');
        }

        const bookingDetails = await response.json();
        showToast(`Checkout completed for Room ${roomNumber}!`, 'success');
        
        // Load room details to display daily price
        const roomResp = await fetch(`${API_BASE_URL}/rooms/${roomNumber}`);
        const roomDetails = roomResp.ok ? await roomResp.json() : { pricePerDay: 0 };
        
        // Render invoice
        renderInvoice(bookingDetails, roomDetails);
        
        // Reset form
        document.getElementById('checkout-form').reset();
        document.getElementById('checkOutDate').value = new Date().toISOString().split('T')[0];
        
        // Refresh checkout dropdown
        populateBookedRoomsSelect();
    } catch (err) {
        showToast(err.message || 'Checkout failed.', 'error');
    }
}

// Display Checkout Invoice Receipt
function renderInvoice(booking, room) {
    const days = Math.max(1, Math.round((new Date(booking.checkOutDate) - new Date(booking.checkInDate)) / (1000 * 60 * 60 * 24)));
    
    document.getElementById('rec-id').textContent = booking.id ? `INV-${booking.id.substring(booking.id.length - 6).toUpperCase()}` : 'INV-0000';
    document.getElementById('rec-customer').textContent = booking.customerName;
    document.getElementById('rec-room').textContent = booking.roomNumber;
    document.getElementById('rec-checkin').textContent = booking.checkInDate;
    document.getElementById('rec-checkout').textContent = booking.checkOutDate;
    document.getElementById('rec-price').textContent = `$${room.pricePerDay.toFixed(2)}`;
    document.getElementById('rec-days').textContent = days;
    document.getElementById('rec-total').textContent = `$${booking.totalAmount.toFixed(2)}`;

    document.getElementById('receipt-container').style.display = 'block';
}

// Handle Room Search Operation
async function handleSearch() {
    const query = document.getElementById('search-input').value.trim();
    const resultContainer = document.getElementById('search-result-container');
    
    if (!query) {
        showToast('Please enter a room number.', 'error');
        return;
    }

    resultContainer.innerHTML = '<div class="no-data"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/rooms/${query}`);
        
        if (response.status === 404) {
            resultContainer.innerHTML = `<div class="no-data">Room ${query} does not exist in our system.</div>`;
            return;
        }

        if (!response.ok) throw new Error();

        const room = await response.json();
        
        const badgeClass = room.roomType.toLowerCase();
        const statusClass = room.status.toLowerCase();
        const iconClass = room.roomType === 'Deluxe' ? 'fa-gem' : (room.roomType === 'Double' ? 'fa-user-group' : 'fa-user');

        resultContainer.innerHTML = `
            <div class="room-card" style="width: 320px; max-width: 100%;">
                <div class="room-card-header">
                    <span class="room-badge ${badgeClass}">${room.roomType}</span>
                </div>
                <div class="room-card-body">
                    <div class="room-icon-wrapper">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="room-number-display">Room ${room.roomNumber}</div>
                    <div class="room-price-display"><strong>$${room.pricePerDay.toFixed(2)}</strong> / day</div>
                </div>
                <div class="room-card-footer">
                    <div class="room-status status-${statusClass}">
                        <span class="status-dot"></span>
                        ${room.status}
                    </div>
                    ${room.status === 'Available' 
                        ? `<a class="action-link" onclick="quickBook('${room.roomNumber}')"><i class="fa-solid fa-calendar-check"></i> Book Now</a>`
                        : `<a class="action-link" onclick="quickCheckout('${room.roomNumber}')"><i class="fa-solid fa-right-from-bracket"></i> Checkout</a>`
                    }
                </div>
            </div>
        `;
    } catch (err) {
        resultContainer.innerHTML = '<div class="no-data">Error searching for room details. Try again.</div>';
    }
}

// Quick Navigation Handlers for Room Card Actions
function quickBook(roomNumber) {
    switchSection('book-room-section');
    setTimeout(() => {
        document.getElementById('bookingRoomSelect').value = roomNumber;
    }, 100);
}

function quickCheckout(roomNumber) {
    switchSection('checkout-section');
    setTimeout(() => {
        document.getElementById('checkoutRoomSelect').value = roomNumber;
    }, 100);
}

// Toast Notifications System (Micro-alerts)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove toast after 4s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
