package com.hotel.management.service;

import com.hotel.management.model.Booking;
import com.hotel.management.model.Room;
import com.hotel.management.repository.BookingRepository;
import com.hotel.management.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
public class HotelService {

    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;

    @Autowired
    public HotelService(RoomRepository roomRepository, BookingRepository bookingRepository) {
        this.roomRepository = roomRepository;
        this.bookingRepository = bookingRepository;
    }

    @Transactional
    public Booking bookRoom(String customerName, String roomNumber, LocalDate checkInDate) {
        Optional<Room> roomOpt = roomRepository.findById(roomNumber);
        if (roomOpt.isEmpty()) {
            throw new IllegalArgumentException("Room " + roomNumber + " does not exist.");
        }

        Room room = roomOpt.get();
        if (!"Available".equalsIgnoreCase(room.getStatus())) {
            throw new IllegalStateException("Room " + roomNumber + " is already booked.");
        }

        // Set checkInDate to today if null
        if (checkInDate == null) {
            checkInDate = LocalDate.now();
        }

        // Create booking
        Booking booking = new Booking(customerName, roomNumber, checkInDate);
        Booking savedBooking = bookingRepository.save(booking);

        // Update room status
        room.setStatus("Booked");
        roomRepository.save(room);

        return savedBooking;
    }

    @Transactional
    public Booking checkoutRoom(String roomNumber, LocalDate checkOutDate) {
        Optional<Room> roomOpt = roomRepository.findById(roomNumber);
        if (roomOpt.isEmpty()) {
            throw new IllegalArgumentException("Room " + roomNumber + " does not exist.");
        }

        Room room = roomOpt.get();
        if (!"Booked".equalsIgnoreCase(room.getStatus())) {
            throw new IllegalStateException("Room " + roomNumber + " is not currently booked.");
        }

        Optional<Booking> bookingOpt = bookingRepository.findFirstByRoomNumberAndCheckOutDateIsNull(roomNumber);
        if (bookingOpt.isEmpty()) {
            throw new IllegalStateException("No active booking found for Room " + roomNumber);
        }

        Booking booking = bookingOpt.get();
        if (checkOutDate == null) {
            checkOutDate = LocalDate.now();
        }

        // Validate checkout date is not before check-in date
        if (checkOutDate.isBefore(booking.getCheckInDate())) {
            throw new IllegalArgumentException("Checkout date cannot be before check-in date.");
        }

        // Calculate days stayed
        long days = ChronoUnit.DAYS.between(booking.getCheckInDate(), checkOutDate);
        if (days <= 0) {
            days = 1; // charge at least 1 day
        }

        double totalBill = days * room.getPricePerDay();

        // Update booking details
        booking.setCheckOutDate(checkOutDate);
        booking.setTotalAmount(totalBill);
        Booking savedBooking = bookingRepository.save(booking);

        // Reset room status
        room.setStatus("Available");
        roomRepository.save(room);

        return savedBooking;
    }
}
