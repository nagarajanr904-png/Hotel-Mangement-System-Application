package com.hotel.management.repository;

import com.hotel.management.model.Booking;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookingRepository extends MongoRepository<Booking, String> {
    Optional<Booking> findFirstByRoomNumberAndCheckOutDateIsNull(String roomNumber);
}
