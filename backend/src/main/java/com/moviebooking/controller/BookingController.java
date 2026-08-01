package com.moviebooking.controller;

import com.moviebooking.dto.*;
import com.moviebooking.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    /** Book tickets */
    @PostMapping
    public ResponseEntity<BookingResponse> bookTickets(@Valid @RequestBody BookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.createBooking(request));
    }

    /** User's booking history */
    @GetMapping("/my")
    public ResponseEntity<List<BookingResponse>> myBookings() {
        return ResponseEntity.ok(bookingService.getMyBookings());
    }

    /** Single booking detail */
    @GetMapping("/{bookingRef}")
    public ResponseEntity<BookingResponse> getBooking(@PathVariable String bookingRef) {
        return ResponseEntity.ok(bookingService.getBookingByRef(bookingRef));
    }

    /** Cancel booking */
    @PutMapping("/{bookingRef}/cancel")
    public ResponseEntity<BookingResponse> cancelBooking(@PathVariable String bookingRef) {
        return ResponseEntity.ok(bookingService.cancelBooking(bookingRef));
    }

    /** Admin — all bookings */
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BookingResponse>> allBookings(
            @RequestParam(required = false) Long showId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(bookingService.getAllBookings(showId, status));
    }

    /** Seat availability for a show */
    @GetMapping("/seats/{showId}")
    public ResponseEntity<SeatAvailabilityResponse> getSeatAvailability(@PathVariable Long showId) {
        return ResponseEntity.ok(bookingService.getSeatAvailability(showId));
    }
}
