package com.moviebooking.service;

import com.moviebooking.dto.*;
import com.moviebooking.model.*;
import com.moviebooking.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository       bookingRepository;
    private final ShowRepository          showRepository;
    private final SeatRepository          seatRepository;
    private final ShowSeatStatusRepository showSeatStatusRepository;
    private final UserRepository          userRepository;

    @Transactional
    public BookingResponse createBooking(BookingRequest request) {

        // ── Resolve current user ─────────────────────────
        String email  = SecurityContextHolder.getContext().getAuthentication().getName();
        User   user   = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // ── Validate show ────────────────────────────────
        Show show = showRepository.findById(request.getShowId())
                .orElseThrow(() -> new RuntimeException("Show not found"));

        if (show.getStatus() != Show.ShowStatus.ACTIVE) {
            throw new RuntimeException("Show is not available for booking");
        }

        // ── Check seat availability & lock ───────────────
        List<ShowSeatStatus> seatStatuses = showSeatStatusRepository
                .findByShowIdAndSeatIdIn(show.getId(), request.getSeatIds());

        boolean anyUnavailable = seatStatuses.stream()
                .anyMatch(s -> s.getStatus() != ShowSeatStatus.SeatStatus.AVAILABLE);

        if (anyUnavailable) {
            throw new RuntimeException("One or more selected seats are no longer available");
        }

        // ── Calculate total ──────────────────────────────
        BigDecimal total = seatStatuses.stream()
                .map(ss -> priceForSeat(ss.getSeat(), show))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ── Create booking ───────────────────────────────
        String ref = generateRef();
        Booking booking = Booking.builder()
                .user(user)
                .show(show)
                .bookingRef(ref)
                .totalAmount(total)
                .status(Booking.BookingStatus.CONFIRMED)
                .paymentStatus(Booking.PaymentStatus.PAID)
                .paymentMethod(request.getPaymentMethod())
                .bookedAt(LocalDateTime.now())
                .build();

        booking = bookingRepository.save(booking);

        // ── Lock seats ───────────────────────────────────
        final Booking savedBooking = booking;
        for (ShowSeatStatus ss : seatStatuses) {
            ss.setStatus(ShowSeatStatus.SeatStatus.BOOKED);
            ss.setBooking(savedBooking);
        }
        showSeatStatusRepository.saveAll(seatStatuses);

        return toResponse(booking, seatStatuses);
    }

    public List<BookingResponse> getMyBookings() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return bookingRepository.findByUserOrderByBookedAtDesc(user)
                .stream().map(b -> toResponse(b, null)).collect(Collectors.toList());
    }

    public BookingResponse getBookingByRef(String ref) {
        Booking booking = bookingRepository.findByBookingRef(ref)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + ref));
        return toResponse(booking, null);
    }

    @Transactional
    public BookingResponse cancelBooking(String ref) {
        Booking booking = bookingRepository.findByBookingRef(ref)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (booking.getStatus() == Booking.BookingStatus.CANCELLED) {
            throw new RuntimeException("Booking already cancelled");
        }

        booking.setStatus(Booking.BookingStatus.CANCELLED);
        booking.setPaymentStatus(Booking.PaymentStatus.REFUNDED);

        // Free seats
        List<ShowSeatStatus> seats = showSeatStatusRepository.findByBooking(booking);
        seats.forEach(s -> {
            s.setStatus(ShowSeatStatus.SeatStatus.AVAILABLE);
            s.setBooking(null);
        });
        showSeatStatusRepository.saveAll(seats);
        bookingRepository.save(booking);

        return toResponse(booking, seats);
    }

    public List<BookingResponse> getAllBookings(Long showId, String status) {
        return bookingRepository.findAll().stream()
                .filter(b -> showId == null || b.getShow().getId().equals(showId))
                .filter(b -> status == null || b.getStatus().name().equalsIgnoreCase(status))
                .map(b -> toResponse(b, null))
                .collect(Collectors.toList());
    }

    public SeatAvailabilityResponse getSeatAvailability(Long showId) {
        List<ShowSeatStatus> statuses = showSeatStatusRepository.findByShowId(showId);
        Show show = showRepository.findById(showId)
                .orElseThrow(() -> new RuntimeException("Show not found"));

        List<SeatStatus> seatDtos = statuses.stream().map(ss -> SeatStatus.builder()
                .seatId(ss.getSeat().getId())
                .rowLabel(ss.getSeat().getRowLabel())
                .seatNumber(ss.getSeat().getSeatNumber())
                .seatType(ss.getSeat().getSeatType().name())
                .status(ss.getStatus().name())
                .price(priceForSeat(ss.getSeat(), show))
                .build()).collect(Collectors.toList());

        return SeatAvailabilityResponse.builder().showId(showId).seats(seatDtos).build();
    }

    // ── helpers ──────────────────────────────────────────
    private BigDecimal priceForSeat(Seat seat, Show show) {
        return switch (seat.getSeatType()) {
            case PREMIUM   -> show.getPricePremium();
            case RECLINER  -> show.getPriceRecliner();
            default        -> show.getPriceRegular();
        };
    }

    private String generateRef() {
        return "BK" + System.currentTimeMillis();
    }

    private BookingResponse toResponse(Booking b, List<ShowSeatStatus> seatStatuses) {
        return BookingResponse.builder()
                .id(b.getId())
                .bookingRef(b.getBookingRef())
                .showId(b.getShow().getId())
                .movieTitle(b.getShow().getMovie().getTitle())
                .theaterName(b.getShow().getScreen().getTheater().getName())
                .showDate(b.getShow().getShowDate())
                .showTime(b.getShow().getShowTime())
                .totalAmount(b.getTotalAmount())
                .status(b.getStatus().name())
                .paymentStatus(b.getPaymentStatus().name())
                .paymentMethod(b.getPaymentMethod())
                .bookedAt(b.getBookedAt())
                .build();
    }
}
