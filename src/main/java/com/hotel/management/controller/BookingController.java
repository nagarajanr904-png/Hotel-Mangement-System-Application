package com.hotel.management.controller;

import com.hotel.management.model.Booking;
import com.hotel.management.service.HotelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {

    private final HotelService hotelService;

    @Autowired
    public BookingController(HotelService hotelService) {
        this.hotelService = hotelService;
    }

    @PostMapping
    public ResponseEntity<?> bookRoom(@RequestBody BookingRequest request) {
        if (request.getCustomerName() == null || request.getCustomerName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Customer name is required.");
        }
        if (request.getRoomNumber() == null || request.getRoomNumber().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Room number is required.");
        }

        try {
            LocalDate checkIn = request.getCheckInDate() != null ? LocalDate.parse(request.getCheckInDate()) : LocalDate.now();
            Booking booking = hotelService.bookRoom(request.getCustomerName(), request.getRoomNumber(), checkIn);
            return ResponseEntity.status(HttpStatus.CREATED).body(booking);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkoutRoom(@RequestBody CheckoutRequest request) {
        if (request.getRoomNumber() == null || request.getRoomNumber().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Room number is required.");
        }

        try {
            LocalDate checkOut = request.getCheckOutDate() != null ? LocalDate.parse(request.getCheckOutDate()) : LocalDate.now();
            Booking booking = hotelService.checkoutRoom(request.getRoomNumber(), checkOut);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    // Static request classes
    public static class BookingRequest {
        private String customerName;
        private String roomNumber;
        private String checkInDate;

        public String getCustomerName() {
            return customerName;
        }

        public void setCustomerName(String customerName) {
            this.customerName = customerName;
        }

        public String getRoomNumber() {
            return roomNumber;
        }

        public void setRoomNumber(String roomNumber) {
            this.roomNumber = roomNumber;
        }

        public String getCheckInDate() {
            return checkInDate;
        }

        public void setCheckInDate(String checkInDate) {
            this.checkInDate = checkInDate;
        }
    }

    public static class CheckoutRequest {
        private String roomNumber;
        private String checkOutDate;

        public String getRoomNumber() {
            return roomNumber;
        }

        public void setRoomNumber(String roomNumber) {
            this.roomNumber = roomNumber;
        }

        public String getCheckOutDate() {
            return checkOutDate;
        }

        public void setCheckOutDate(String checkOutDate) {
            this.checkOutDate = checkOutDate;
        }
    }
}
