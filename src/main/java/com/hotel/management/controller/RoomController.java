package com.hotel.management.controller;

import com.hotel.management.model.Room;
import com.hotel.management.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {

    private final RoomRepository roomRepository;

    @Autowired
    public RoomController(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    @GetMapping
    public List<Room> getAllRooms(@RequestParam(required = false) String status) {
        if (status != null && !status.isEmpty()) {
            return roomRepository.findByStatus(status);
        }
        return roomRepository.findAll();
    }

    @GetMapping("/{roomNumber}")
    public ResponseEntity<Room> getRoomByNumber(@PathVariable String roomNumber) {
        Optional<Room> roomOpt = roomRepository.findById(roomNumber);
        return roomOpt.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    public ResponseEntity<?> addRoom(@RequestBody Room room) {
        if (room.getRoomNumber() == null || room.getRoomNumber().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Room number is required.");
        }
        if (roomRepository.existsById(room.getRoomNumber())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Room number " + room.getRoomNumber() + " already exists.");
        }

        // Set default status to Available if not provided
        if (room.getStatus() == null || room.getStatus().trim().isEmpty()) {
            room.setStatus("Available");
        }

        Room savedRoom = roomRepository.save(room);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedRoom);
    }

    @GetMapping("/stats")
    public Map<String, Long> getStats() {
        long total = roomRepository.count();
        long available = roomRepository.findByStatus("Available").size();
        long booked = roomRepository.findByStatus("Booked").size();

        Map<String, Long> stats = new HashMap<>();
        stats.put("totalRooms", total);
        stats.put("availableRooms", available);
        stats.put("bookedRooms", booked);
        return stats;
    }
}
